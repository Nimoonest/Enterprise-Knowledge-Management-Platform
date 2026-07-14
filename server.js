const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { createEnterpriseDocumentsStore } = require("./enterprise-documents-store");
const { createSearchEngine } = require("./search-engine");
const { loadEnvFile } = require("./env-loader");
const { createAuditStore } = require("./audit-store");
const { authorizeDify, loadDifyConfig, retrieveForDify } = require("./dify-retrieval");

const root = __dirname;
loadEnvFile(path.join(root, ".env"));
const port = Number(process.env.PORT || 5178);
const jsonPath = path.join(root, "data", "products_kb.json");
const documentsStore = createEnterpriseDocumentsStore(root);
const searchEngine = createSearchEngine({ root, indexPath: process.env.SEARCH_INDEX_PATH });
const auditStore = createAuditStore(root);
const difyConfig = loadDifyConfig();

const mysqlConfig = {
  enabled: (process.env.EKMP_DATA_SOURCE || "json").toLowerCase() === "mysql",
  cli: process.env.MYSQL_CLI || "mysql",
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: process.env.MYSQL_PORT || "3306",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "product_knowledge",
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

let kbCache = null;
let kbCacheMtimeMs = 0;

const isProduction = process.env.NODE_ENV === "production";
const users = [
  { id: "u-admin", username: process.env.ADMIN_USERNAME || "admin", password: process.env.ADMIN_PASSWORD || (isProduction ? "" : "admin123"), name: "平台管理员", role: "admin" },
  { id: "u-operator", username: process.env.OPERATOR_USERNAME || "operator", password: process.env.OPERATOR_PASSWORD || (isProduction ? "" : "operator123"), name: "知识运营", role: "operator" },
].filter((user) => user.password);
const sessions = new Map();
const sessionTtlMs = 8 * 60 * 60 * 1000;

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-File-Name,X-File-Type",
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), "application/json; charset=utf-8");
}

function ok(res, data, meta) {
  sendJson(res, 200, { code: 0, message: "success", data, ...(meta ? { meta } : {}) });
}

function fail(res, status, message, details) {
  sendJson(res, status, { code: status, message, ...(details ? { details } : {}) });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function readJsonBody(req) {
  return readBody(req).then((body) => (body.trim() ? JSON.parse(body) : {}));
}

function readBuffer(req, maxBytes = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("file exceeds the 20 MB limit"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function productSearchText(product) {
  return [
    product.SKU,
    product["名称"],
    product["副标题"],
    product["类型"],
    product["香调"],
    product["描述"],
    product["产品特性"],
    product["使用建议"],
    ...(product.categories || []),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function loadKnowledgeFromJson() {
  const stat = fs.statSync(jsonPath);
  if (kbCache && kbCacheMtimeMs === stat.mtimeMs && kbCache.source === "json") {
    return kbCache.payload;
  }
  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  payload.meta = {
    ...(payload.meta || {}),
    data_source: "json",
    api_layer: "node",
    loaded_at: new Date().toISOString(),
  };
  kbCache = { source: "json", mtimeMs: stat.mtimeMs, payload };
  kbCacheMtimeMs = stat.mtimeMs;
  return payload;
}

function runMysqlJsonQuery(sql) {
  return new Promise((resolve, reject) => {
    const args = [
      "-h",
      mysqlConfig.host,
      "-P",
      mysqlConfig.port,
      "-u",
      mysqlConfig.user,
      "--database",
      mysqlConfig.database,
      "--default-character-set=utf8mb4",
      "--batch",
      "--raw",
      "--silent",
      "--skip-column-names",
      "-e",
      sql,
    ];
    if (mysqlConfig.password) args.splice(6, 0, `--password=${mysqlConfig.password}`);

    const child = spawn(mysqlConfig.cli, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `mysql exited with ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim() || "[]"));
      } catch (error) {
        reject(new Error(`Invalid JSON from MySQL: ${error.message}`));
      }
    });
  });
}

async function loadKnowledgeFromMysql() {
  const products = await runMysqlJsonQuery(`
    SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'SKU', sku,
      '名称', name,
      '副标题', subtitle,
      '类型', product_type,
      '香调', scent,
      '价格', price,
      '市场价', market_price,
      '库存', stock,
      '状态', status,
      '是否刻字', engraving_available,
      '评论数', review_count,
      '所属分类', category_path,
      '图片数', image_count,
      'url_key', url_key,
      '详情页', detail_url,
      '描述', description,
      '灵感来源', inspiration,
      '使用建议', usage_advice,
      '产品特性', features,
      '制作工艺', craft,
      '配方与质地', formula_texture,
      '产品成分', ingredients,
      '详细说明', details,
      '编辑内容', editorial_content
    )), JSON_ARRAY()) FROM products;
  `);
  const categories = await runMysqlJsonQuery(`
    SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'sku', sku,
      'sort_order', sort_order,
      'category_path', category_path
    )), JSON_ARRAY()) FROM product_categories;
  `);
  const images = await runMysqlJsonQuery(`
    SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'sku', sku,
      'sort_order', sort_order,
      'url', url
    )), JSON_ARRAY()) FROM product_images;
  `);
  const relations = await runMysqlJsonQuery(`
    SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'sku', sku,
      'relation_type', relation_type,
      'sort_order', sort_order,
      'related_text', related_text
    )), JSON_ARRAY()) FROM product_relations;
  `);
  const chunks = await runMysqlJsonQuery(`
    SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
      'chunk_id', chunk_id,
      'sku', sku,
      'title', title,
      'content', content,
      'keywords', keywords
    )), JSON_ARRAY()) FROM product_knowledge_chunks;
  `);

  const productBySku = new Map(products.map((product) => [product.SKU, product]));
  products.forEach((product) => {
    product.categories = [];
    product.images = [];
    product.pairing_suggestions = [];
    product.related_products = [];
    product.cross_sell = [];
    product.upgrade_recommendations = [];
  });
  categories
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .forEach((row) => productBySku.get(row.sku)?.categories.push(row.category_path));
  images
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .forEach((row) => productBySku.get(row.sku)?.images.push({ sort_order: row.sort_order, url: row.url }));
  const relationFields = {
    pairing: "pairing_suggestions",
    related: "related_products",
    cross_sell: "cross_sell",
    upgrade: "upgrade_recommendations",
  };
  relations
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .forEach((row) => productBySku.get(row.sku)?.[relationFields[row.relation_type]]?.push(row.related_text));
  products.forEach((product) => {
    product.search_text = productSearchText(product);
  });

  return {
    meta: {
      source: "MySQL product_knowledge",
      data_source: "mysql",
      api_layer: "node",
      product_count: products.length,
      chunk_count: chunks.length,
      loaded_at: new Date().toISOString(),
    },
    products,
    chunks,
  };
}

async function loadKnowledgeBase() {
  if (!mysqlConfig.enabled) return loadKnowledgeFromJson();
  try {
    return await loadKnowledgeFromMysql();
  } catch (error) {
    const payload = loadKnowledgeFromJson();
    payload.meta = {
      ...(payload.meta || {}),
      data_source: "json",
      mysql_fallback_error: error.message,
    };
    return payload;
  }
}

function getProducts(kb, query) {
  const page = Math.max(1, Number(query.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.get("page_size") || query.get("limit") || 30)));
  const keyword = normalizeText(query.get("q")).toLowerCase();
  const type = normalizeText(query.get("type")).toLowerCase();
  const inStock = query.get("in_stock");
  let items = [...kb.products];

  if (keyword) {
    items = items.filter((product) => productSearchText(product).includes(keyword));
  }
  if (type) {
    items = items.filter((product) => normalizeText(product["类型"]).toLowerCase() === type);
  }
  if (inStock === "true") {
    items = items.filter((product) => Number(product["库存"]) > 0);
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    page_size: pageSize,
    total,
  };
}

function getCoverage(kb) {
  const products = kb.products;
  const total = Math.max(products.length, 1);
  const rows = [
    {
      key: "products",
      label: "商品主数据",
      covered: products.length,
      total,
      note: "SKU、名称、类型、价格、库存已结构化入库",
    },
    {
      key: "description",
      label: "商品描述",
      covered: products.filter((item) => item["描述"]).length,
      total,
      note: "支撑用户了解产品特点和香气描述",
    },
    {
      key: "usage_advice",
      label: "使用建议",
      covered: products.filter((item) => item["使用建议"]).length,
      total,
      note: "支撑怎么用、适合什么场景等问题",
    },
    {
      key: "relations",
      label: "搭配关系",
      covered: products.filter((item) =>
        [
          ...(item.pairing_suggestions || []),
          ...(item.related_products || []),
          ...(item.cross_sell || []),
          ...(item.upgrade_recommendations || []),
        ].length > 0
      ).length,
      total,
      note: "支撑交叉销售、升级推荐和套装建议",
    },
    {
      key: "images",
      label: "图片资源",
      covered: products.filter((item) => (item.images || []).length > 0).length,
      total,
      note: "支撑前端展示和商品详情页跳转",
    },
    {
      key: "chunks",
      label: "MaxKB 分段",
      covered: kb.chunks.length,
      total,
      note: "每个商品一段导购知识",
    },
  ].map((row) => ({ ...row, score: Math.round((row.covered / Math.max(row.total, 1)) * 100) }));

  return {
    average_score: Math.round(rows.reduce((sum, row) => sum + row.score, 0) / Math.max(rows.length, 1)),
    rows,
  };
}

function tokenize(text) {
  const normalized = String(text || "").toLowerCase();
  const latin = normalized.match(/[a-z0-9]+/g) || [];
  const chinese = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const grams = [];
  chinese.forEach((word) => {
    for (let index = 0; index < word.length - 1; index += 1) grams.push(word.slice(index, index + 2));
    if (word.length > 3) grams.push(word);
  });
  return [...new Set([...latin, ...chinese, ...grams])];
}

function searchKnowledge(kb, question, limit = 8) {
  const terms = tokenize(question);
  const budgetMatch = String(question).match(/(\d{3,5})\s*(?:元|块|左右|以内|预算)?/);
  const budget = budgetMatch ? Number(budgetMatch[1]) : null;
  const productsBySku = new Map(kb.products.map((product) => [product.SKU, product]));
  const scored = kb.chunks.map((chunk) => {
    const product = productsBySku.get(chunk.sku);
    const haystack = `${chunk.title}\n${chunk.content}\n${(chunk.keywords || []).join("\n")}`.toLowerCase();
    let rawScore = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    if (budget && product?.["价格"]) {
      const price = Number(product["价格"]);
      if (price <= budget * 1.15) rawScore += 2;
      if (price > budget * 1.5) rawScore -= 1;
    }
    if (Number(product?.["库存"]) > 0) rawScore += 0.4;
    return { ...chunk, product, rawScore };
  });
  const maxScore = Math.max(...scored.map((item) => item.rawScore), 1);
  return scored
    .filter((item) => item.rawScore > 0)
    .sort((a, b) => b.rawScore - a.rawScore)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      score: Math.min(0.98, Math.max(0.52, item.rawScore / maxScore)),
    }));
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function createSession(user) {
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const expiresAt = Date.now() + sessionTtlMs;
  sessions.set(token, { userId: user.id, expiresAt });
  return { token, expiresAt };
}

function publicUser(user) {
  return user ? { id: user.id, username: user.username, name: user.name, role: user.role } : null;
}

function getCurrentUser(req) {
  const token = parseCookies(req).ekmp_session || String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return users.find((user) => user.id === session.userId) || null;
}

function requireUser(req, res) {
  const user = getCurrentUser(req);
  if (!user) {
    fail(res, 401, "authentication required");
    return null;
  }
  return user;
}

function sendSessionCookie(res, token, expiresAt) {
  res.setHeader("Set-Cookie", `ekmp_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "ekmp_session=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
}

function buildAdminSummary(kb) {
  const coverage = getCoverage(kb);
  const products = kb.products;
  return {
    data_source: kb.meta?.data_source,
    product_count: products.length,
    chunk_count: kb.chunks.length,
    coverage_score: coverage.average_score,
    low_coverage_items: coverage.rows.filter((row) => row.score < 90),
    users: users.map(publicUser),
    roles: [
      { key: "admin", name: "平台管理员", permissions: ["dashboard:view", "knowledge:manage", "users:manage", "settings:manage"] },
      { key: "operator", name: "知识运营", permissions: ["dashboard:view", "knowledge:manage"] },
    ],
    services: [
      { name: "API 服务", status: "running", endpoint: "/api/health" },
      { name: "知识数据", status: kb.meta?.data_source || "json", endpoint: "/api/kb" },
      { name: "MaxKB 问答", status: "proxied", endpoint: "/api/chat" },
      { name: "Hybrid Search", status: searchEngine.status().ready ? "ready" : "building", endpoint: "/api/search" },
      { name: "Document Metadata", status: documentsStore.config.metadata_driver, endpoint: "/api/admin/documents" },
      { name: "Object Storage", status: documentsStore.config.object_driver, endpoint: "/api/admin/documents/{id}/file" },
    ],
    /* legacy_recent_actions: [
      { time: new Date().toISOString(), actor: "system", action: "后台总览数据生成", target: "admin-summary" },
    ], */
    recent_actions: auditStore.listOperations({ page_size: 8 }).items.map((item) => ({ time: item.timestamp, actor: item.actor, action: item.action, target: item.resource_id })),
  };
}

function callMaxKB(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn("wsl.exe", [
      "-d",
      "Ubuntu-22.04",
      "-u",
      "root",
      "--",
      "docker",
      "exec",
      "-i",
      "maxkb",
      "python",
      "/tmp/maxkb_call_app.py",
    ]);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `MaxKB process exited with ${code}`));
        return;
      }
      const jsonLine = stdout.trim().split(/\r?\n/).reverse().find((line) => line.trim().startsWith("{"));
      if (!jsonLine) {
        reject(new Error(`No JSON returned from MaxKB. Output: ${stdout.slice(-800)}`));
        return;
      }
      try {
        resolve(JSON.parse(jsonLine));
      } catch (error) {
        reject(new Error(`Invalid JSON from MaxKB: ${error.message}`));
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

async function handleApi(req, res, url) {
  const pathname = decodeURIComponent(url.pathname);
  const kb = await loadKnowledgeBase();

  if (req.method === "GET" && pathname === "/api/health") {
    const documentStorage = await documentsStore.health().catch((error) => ({ status: "error", error: error.message, ...documentsStore.config }));
    ok(res, {
      status: documentStorage.status === "ok" ? "ok" : "degraded",
      data_source: kb.meta?.data_source,
      product_count: kb.products.length,
      chunk_count: kb.chunks.length,
      search: searchEngine.status(),
      document_storage: documentStorage,
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const payload = await readJsonBody(req);
    const user = users.find((item) => item.username === payload.username && item.password === payload.password);
    if (!user) {
      auditStore.operation({ req, actor: payload.username || "anonymous", action: "auth.login", resource_type: "session", status: "failed", detail: "invalid credentials" });
      fail(res, 401, "invalid username or password");
      return true;
    }
    const session = createSession(user);
    sendSessionCookie(res, session.token, session.expiresAt);
    auditStore.operation({ req, actor: user.username, actor_role: user.role, action: "auth.login", resource_type: "session", resource_id: user.id, status: "success" });
    ok(res, { user: publicUser(user), expires_at: new Date(session.expiresAt).toISOString() });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/auth/me") {
    const user = getCurrentUser(req);
    ok(res, { authenticated: Boolean(user), user: publicUser(user) });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/auth/logout") {
    const user = getCurrentUser(req);
    const token = parseCookies(req).ekmp_session;
    if (token) sessions.delete(token);
    clearSessionCookie(res);
    auditStore.operation({ req, actor: user?.username || "anonymous", actor_role: user?.role, action: "auth.logout", resource_type: "session", status: "success" });
    ok(res, { authenticated: false });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/admin/summary") {
    const user = requireUser(req, res);
    if (!user) return true;
    ok(res, buildAdminSummary(kb));
    return true;
  }

  if (req.method === "GET" && pathname === "/api/admin/analytics") {
    const user = requireUser(req, res);
    if (!user) return true;
    ok(res, auditStore.analytics(url.searchParams.get("days") || 7));
    return true;
  }

  if (req.method === "GET" && pathname === "/api/admin/audit/operations") {
    const user = requireUser(req, res);
    if (!user) return true;
    ok(res, auditStore.listOperations(Object.fromEntries(url.searchParams)));
    return true;
  }

  if (req.method === "GET" && (pathname === "/api/admin/audit/qa" || pathname === "/api/admin/audit/interactions")) {
    const user = requireUser(req, res);
    if (!user) return true;
    ok(res, auditStore.listInteractions(Object.fromEntries(url.searchParams)));
    return true;
  }


  if (req.method === "GET" && pathname === "/api/admin/documents") {
    const user = requireUser(req, res);
    if (!user) return true;
    ok(res, await documentsStore.list(Object.fromEntries(url.searchParams)));
    return true;
  }

  if (req.method === "POST" && pathname === "/api/admin/documents") {
    const user = requireUser(req, res);
    if (!user) return true;
    try {
      const document = await documentsStore.create(await readJsonBody(req), user.username);
      auditStore.operation({ req, actor: user.username, actor_role: user.role, action: "document.create", resource_type: "document", resource_id: document.id, status: "success", metadata: { review_status: document.review_status, category: document.category } });
      sendJson(res, 201, { code: 0, message: "success", data: document });
    } catch (error) {
      auditStore.operation({ req, actor: user.username, actor_role: user.role, action: "document.create", resource_type: "document", status: "failed", detail: error.message });
      fail(res, 400, error.message);
    }
    return true;
  }

  if (req.method === "GET" && pathname === "/api/admin/document-facets") {
    const user = requireUser(req, res);
    if (!user) return true;
    ok(res, await documentsStore.facets());
    return true;
  }

  const documentFileMatch = pathname.match(/^\/api\/admin\/documents\/([^/]+)\/file$/);
  if (documentFileMatch && req.method === "PUT") {
    const user = requireUser(req, res);
    if (!user) return true;
    try {
      const buffer = await readBuffer(req);
      if (!buffer.length) {
        fail(res, 400, "file is required");
        return true;
      }
      const document = await documentsStore.attachFile(documentFileMatch[1], {
        buffer,
        name: decodeURIComponent(String(req.headers["x-file-name"] || "document.bin")),
        type: req.headers["x-file-type"],
      }, user.username);
      if (document) auditStore.operation({ req, actor: user.username, actor_role: user.role, action: "document.file.upload", resource_type: "document", resource_id: document.id, status: "success", metadata: { file_name: document.file?.name, file_size: document.file?.size } });
      if (!document) fail(res, 404, "document not found");
      else ok(res, document);
    } catch (error) {
      auditStore.operation({ req, actor: user.username, actor_role: user.role, action: "document.file.upload", resource_type: "document", resource_id: documentFileMatch[1], status: "failed", detail: error.message });
      fail(res, error.message.includes("20 MB") ? 413 : 400, error.message);
    }
    return true;
  }

  if (documentFileMatch && req.method === "GET") {
    const user = requireUser(req, res);
    if (!user) return true;
    const file = await documentsStore.getFile(documentFileMatch[1]);
    if (!file) {
      fail(res, 404, "document file not found");
      return true;
    }
    res.writeHead(200, {
      "Content-Type": file.type || "application/octet-stream",
      "Content-Length": file.size,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    });
    auditStore.operation({ req, actor: user.username, actor_role: user.role, action: "document.file.download", resource_type: "document", resource_id: documentFileMatch[1], status: "success", metadata: { file_name: file.name, file_size: file.size } });
    file.stream.pipe(res);
    return true;
  }

  const documentMatch = pathname.match(/^\/api\/admin\/documents\/([^/]+)$/);
  if (documentMatch && req.method === "GET") {
    const user = requireUser(req, res);
    if (!user) return true;
    const document = await documentsStore.get(documentMatch[1]);
    if (!document) fail(res, 404, "document not found");
    else ok(res, document);
    return true;
  }

  if (documentMatch && req.method === "PATCH") {
    const user = requireUser(req, res);
    if (!user) return true;
    try {
      const document = await documentsStore.update(documentMatch[1], await readJsonBody(req), user.username);
      if (document) auditStore.operation({ req, actor: user.username, actor_role: user.role, action: "document.update", resource_type: "document", resource_id: document.id, status: "success", metadata: { review_status: document.review_status, category: document.category } });
      if (!document) fail(res, 404, "document not found");
      else ok(res, document);
    } catch (error) {
      auditStore.operation({ req, actor: user.username, actor_role: user.role, action: "document.update", resource_type: "document", resource_id: documentMatch[1], status: "failed", detail: error.message });
      fail(res, 400, error.message);
    }
    return true;
  }
  if (req.method === "GET" && pathname === "/api/kb") {
    sendJson(res, 200, kb);
    return true;
  }

  if (req.method === "GET" && pathname === "/api/products") {
    ok(res, getProducts(kb, url.searchParams), { data_source: kb.meta?.data_source });
    return true;
  }

  const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
  if (req.method === "GET" && productMatch) {
    const sku = productMatch[1];
    const product = kb.products.find((item) => item.SKU === sku);
    if (!product) fail(res, 404, `Product ${sku} not found`);
    else ok(res, product, { data_source: kb.meta?.data_source });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/knowledge/chunks") {
    const sku = normalizeText(url.searchParams.get("sku"));
    const keyword = normalizeText(url.searchParams.get("q")).toLowerCase();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    let chunks = [...kb.chunks];
    if (sku) chunks = chunks.filter((chunk) => chunk.sku === sku);
    if (keyword) {
      chunks = chunks.filter((chunk) => `${chunk.title}\n${chunk.content}\n${(chunk.keywords || []).join("\n")}`.toLowerCase().includes(keyword));
    }
    ok(res, { items: chunks.slice(0, limit), total: chunks.length }, { data_source: kb.meta?.data_source });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/knowledge/coverage") {
    ok(res, getCoverage(kb), { data_source: kb.meta?.data_source });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/search/status") {
    ok(res, searchEngine.status(), { data_source: kb.meta?.data_source });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/dify/retrieval") {
    const startedAt = Date.now();
    const authorization = authorizeDify(req.headers.authorization, difyConfig);
    if (!authorization.ok) {
      auditStore.operation({ req, actor: "dify", action: "dify.retrieval", resource_type: "external_knowledge", status: "failed", detail: authorization.error_msg });
      sendJson(res, authorization.status, { error_code: authorization.error_code, error_msg: authorization.error_msg });
      return true;
    }
    let payload = {};
    try {
      payload = await readJsonBody(req);
      const response = await retrieveForDify({ payload, config: difyConfig, search: searchEngine.search, kb });
      if (!response.ok) {
        auditStore.operation({ req, actor: "dify", action: "dify.retrieval", resource_type: "external_knowledge", resource_id: payload.knowledge_id, status: "failed", detail: response.error_msg });
        sendJson(res, response.status, { error_code: response.error_code, error_msg: response.error_msg });
        return true;
      }
      auditStore.interaction({ req, type: "search", actor: "dify", question: response.input.query, answer: response.records.map((record) => record.title).join("\n"), status: "success", duration_ms: Date.now() - startedAt, retrieval_mode: "hybrid", traces: response.result.hits, top_score: response.records[0]?.score, metadata: { source: "dify_external_knowledge", knowledge_id: response.input.knowledgeId } });
      sendJson(res, 200, { records: response.records });
    } catch (error) {
      auditStore.interaction({ req, type: "search", actor: "dify", question: payload.query, status: "failed", duration_ms: Date.now() - startedAt, retrieval_mode: "hybrid", error: error.message, metadata: { source: "dify_external_knowledge", knowledge_id: payload.knowledge_id } });
      sendJson(res, 400, { error_code: 2003, error_msg: error.message });
    }
    return true;
  }
  if (req.method === "POST" && pathname === "/api/search") {
    const startedAt = Date.now();
    let payload = {};
    try {
      payload = await readJsonBody(req);
      const result = await searchEngine.search(kb, payload);
      const user = getCurrentUser(req);
      const entry = auditStore.interaction({ req, type: "search", actor: user?.username, question: result.query, answer: result.hits.map((hit) => hit.title).join("\n"), status: "success", duration_ms: Date.now() - startedAt, retrieval_mode: result.mode, traces: result.hits, top_score: result.hits[0]?.score, metadata: { candidate_count: result.candidate_count, reranked: result.reranked, embedding_provider: result.embedding_provider?.name } });
      ok(res, { ...result, quality: entry.quality }, { data_source: kb.meta?.data_source });
    } catch (error) {
      auditStore.interaction({ req, type: "search", actor: getCurrentUser(req)?.username, question: payload.query || payload.question, status: "failed", duration_ms: Date.now() - startedAt, retrieval_mode: payload.mode, error: error.message });
      fail(res, 400, error.message);
    }
    return true;
  }

  if (req.method === "POST" && pathname === "/api/admin/search/rebuild") {
    const user = requireUser(req, res);
    if (!user) return true;
    try {
      const result = await searchEngine.ensureBuilt(kb, true);
      auditStore.operation({ req, actor: user.username, actor_role: user.role, action: "search.index.rebuild", resource_type: "search_index", resource_id: result.built_at, status: "success", metadata: { document_count: result.document_count, term_count: result.term_count, provider: result.embedding_provider?.name } });
      ok(res, result);
    } catch (error) {
      auditStore.operation({ req, actor: user.username, actor_role: user.role, action: "search.index.rebuild", resource_type: "search_index", status: "failed", detail: error.message });
      fail(res, 500, error.message);
    }
    return true;
  }

  if (req.method === "POST" && pathname === "/api/retrieval/test") {
    const startedAt = Date.now();
    const payload = await readJsonBody(req);
    if (!payload.question) {
      fail(res, 400, "question is required");
      return true;
    }
    try {
      const result = await searchEngine.search(kb, {
        ...payload,
        query: payload.question,
        mode: payload.mode || "hybrid",
        limit: toNumber(payload.limit) || 8,
      });
      const entry = auditStore.interaction({ req, type: "search", actor: getCurrentUser(req)?.username, question: payload.question, answer: result.hits.map((hit) => hit.title).join("\n"), status: "success", duration_ms: Date.now() - startedAt, retrieval_mode: result.mode, traces: result.hits, top_score: result.hits[0]?.score, metadata: { source: "retrieval_test", candidate_count: result.candidate_count } });
      ok(res, { question: payload.question, ...result, quality: entry.quality }, { data_source: kb.meta?.data_source });
    } catch (error) {
      auditStore.interaction({ req, type: "search", actor: getCurrentUser(req)?.username, question: payload.question, status: "failed", duration_ms: Date.now() - startedAt, retrieval_mode: payload.mode, error: error.message, metadata: { source: "retrieval_test" } });
      fail(res, 400, error.message);
    }
    return true;
  }

  if (req.method === "POST" && pathname === "/api/chat") {
    const startedAt = Date.now();
    let payload = {};
    try {
      payload = await readJsonBody(req);
      if ((!payload.app_name && !payload.app_id) || !payload.message) {
        auditStore.interaction({ req, type: "chat", actor: getCurrentUser(req)?.username, question: payload.message, status: "failed", duration_ms: Date.now() - startedAt, app_id: payload.app_id, app_name: payload.app_name, error: "app_name/app_id and message are required" });
        fail(res, 400, "app_name/app_id and message are required");
        return true;
      }
      const result = await callMaxKB(payload);
      const entry = auditStore.interaction({ req, type: "chat", actor: getCurrentUser(req)?.username, question: payload.message, answer: result.answer, status: "success", duration_ms: Date.now() - startedAt, app_id: result.app_id || payload.app_id, app_name: result.app_name || payload.app_name, chat_id: result.chat_id, traces: result.traces, top_score: result.traces?.[0]?.comprehensive_score ?? result.traces?.[0]?.similarity, metadata: { client_id: result.client_id } });
      sendJson(res, 200, { ...result, quality: entry.quality, quality_score: entry.quality.overall });
    } catch (error) {
      auditStore.interaction({ req, type: "chat", actor: getCurrentUser(req)?.username, question: payload.message, status: "failed", duration_ms: Date.now() - startedAt, app_id: payload.app_id, app_name: payload.app_name, chat_id: payload.chat_id, error: error.message });
      fail(res, 500, error.message);
    }
    return true;
  }

  if (pathname.startsWith("/api/")) {
    fail(res, 404, "API not found");
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (await handleApi(req, res, url)) return;
  } catch (error) {
    fail(res, 500, error.message);
    return;
  }

  const urlPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  if (urlPath.startsWith("/.") || urlPath.startsWith("/storage/") || urlPath.startsWith("/runtime/") || urlPath.startsWith("/node_modules/") || urlPath.startsWith("/data/audit/") || urlPath === "/data/documents.json" || urlPath === "/data/search_index.json") {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }
  const filePath = path.normalize(path.join(root, urlPath));
  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    send(res, 200, data, mimeTypes[path.extname(filePath)] || "application/octet-stream");
  });
});

server.listen(port, () => {
  console.log(`Enterprise knowledge API running at http://localhost:${port}`);
  console.log(`Data source: ${mysqlConfig.enabled ? "MySQL with JSON fallback" : "JSON"}`);
  documentsStore.ready()
    .then((storageStatus) => console.log(`Document storage ready: ${storageStatus.metadata_driver} / ${storageStatus.object_driver}`))
    .catch((error) => console.error(`Document storage initialization failed: ${error.message}`));
  loadKnowledgeBase()
    .then((kb) => searchEngine.ensureBuilt(kb))
    .then((searchStatus) => console.log(`Search index ready: ${searchStatus.document_count} documents / ${searchStatus.embedding_provider.name}`))
    .catch((error) => console.error(`Search index build failed: ${error.message}`));
});
