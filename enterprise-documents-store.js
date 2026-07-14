const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const STATUSES = new Set(["draft", "pending_review", "approved", "rejected"]);

function normalizeTags(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[,\uFF0C]/);
  return [...new Set(source.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 20);
}

function normalizeStatus(value, fallback = "draft") {
  const status = String(value || fallback);
  if (!STATUSES.has(status)) throw new Error(`invalid review_status: ${status}`);
  return status;
}

function iso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function publicDocument(document) {
  if (!document) return null;
  return {
    ...document,
    created_at: iso(document.created_at),
    updated_at: iso(document.updated_at),
    has_file: Boolean(document.file?.object_key || document.file?.stored_name),
    file: document.file ? {
      name: document.file.name,
      type: document.file.type,
      size: Number(document.file.size || 0),
      uploaded_at: iso(document.file.uploaded_at),
    } : null,
  };
}

function safeFileName(value) {
  return path.basename(String(value || "document.bin"))
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .slice(0, 180) || "document.bin";
}

function createJsonRepository(root) {
  const dataPath = path.join(root, "data", "documents.json");
  const ensure = () => {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]\n", "utf8");
  };
  const read = () => {
    ensure();
    const items = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    if (!Array.isArray(items)) throw new Error("data/documents.json must contain an array");
    return items;
  };
  const write = (items) => fs.writeFileSync(dataPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");

  return {
    name: "json",
    async initialize() { ensure(); },
    async health() { return { status: "ok", path: dataPath }; },
    async list(filters = {}) {
      const q = String(filters.q || "").trim().toLowerCase();
      const items = read()
        .filter((item) => !q || [item.title, item.summary, item.category, ...(item.tags || [])].join(" ").toLowerCase().includes(q))
        .filter((item) => !filters.status || item.review_status === filters.status)
        .filter((item) => !filters.category || item.category === filters.category)
        .filter((item) => !filters.tag || (item.tags || []).includes(filters.tag))
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
      return { items, total: items.length };
    },
    async get(id) { return read().find((item) => item.id === id) || null; },
    async create(payload, actor) {
      const now = new Date().toISOString();
      const item = {
        id: crypto.randomUUID(),
        title: payload.title,
        summary: payload.summary,
        category: payload.category,
        tags: payload.tags,
        review_status: payload.review_status,
        created_by: actor,
        updated_by: null,
        created_at: now,
        updated_at: now,
        version: 1,
        file: null,
      };
      const items = read();
      items.push(item);
      write(items);
      return item;
    },
    async upsert(item) {
      const items = read();
      const index = items.findIndex((candidate) => candidate.id === item.id);
      const current = index >= 0 ? items[index] : null;
      const value = { ...current, ...item, file: current?.file || item.file || null };
      if (index >= 0) items[index] = value;
      else items.push(value);
      write(items);
      return value;
    },
    async update(id, payload, actor) {
      const items = read();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return null;
      items[index] = { ...items[index], ...payload, updated_by: actor, updated_at: new Date().toISOString(), version: Number(items[index].version || 1) + 1 };
      write(items);
      return items[index];
    },
    async updateFile(id, file, actor) {
      const items = read();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return null;
      items[index] = { ...items[index], file, updated_by: actor, updated_at: new Date().toISOString(), version: Number(items[index].version || 1) + 1 };
      write(items);
      return items[index];
    },
    async facets() {
      const items = read();
      return {
        categories: [...new Set(items.map((item) => item.category).filter(Boolean))].sort(),
        tags: [...new Set(items.flatMap((item) => item.tags || []))].sort(),
        statuses: [...STATUSES],
      };
    },
    async close() {},
  };
}

function createMysqlRepository(root, config) {
  const mysql = require("mysql2/promise");
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: config.connectionLimit,
    charset: "utf8mb4",
    timezone: "Z",
    multipleStatements: true,
    waitForConnections: true,
  });
  const schemaPath = path.join(root, "db", "document_center_schema.sql");

  async function tagsByDocument(ids, connection = pool) {
    if (!ids.length) return new Map();
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await connection.query(`SELECT document_id, tag FROM document_tags WHERE document_id IN (${placeholders}) ORDER BY tag`, ids);
    return rows.reduce((result, row) => {
      const values = result.get(row.document_id) || [];
      values.push(row.tag);
      result.set(row.document_id, values);
      return result;
    }, new Map());
  }

  function mapRow(row, tags = []) {
    return {
      id: row.id,
      title: row.title,
      summary: row.summary || "",
      category: row.category,
      tags,
      review_status: row.review_status,
      created_by: row.created_by,
      updated_by: row.updated_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      version: Number(row.version || 1),
      file: row.file_object_key ? {
        object_key: row.file_object_key,
        name: row.file_name,
        type: row.file_type,
        size: Number(row.file_size || 0),
        uploaded_at: row.file_uploaded_at,
      } : null,
    };
  }

  async function saveTags(connection, id, tags) {
    await connection.query("DELETE FROM document_tags WHERE document_id = ?", [id]);
    if (tags.length) {
      await connection.query("INSERT INTO document_tags (document_id, tag) VALUES ?", [tags.map((tag) => [id, tag])]);
    }
  }

  async function get(id, connection = pool) {
    const [rows] = await connection.query("SELECT * FROM documents WHERE id = ?", [id]);
    if (!rows[0]) return null;
    const tags = await tagsByDocument([id], connection);
    return mapRow(rows[0], tags.get(id) || []);
  }

  return {
    name: "mysql",
    async initialize() {
      await pool.query(fs.readFileSync(schemaPath, "utf8"));
      await pool.query("SELECT 1");
    },
    async health() {
      const startedAt = Date.now();
      await pool.query("SELECT 1");
      return { status: "ok", host: config.host, port: config.port, database: config.database, latency_ms: Date.now() - startedAt };
    },
    async list(filters = {}) {
      const where = [];
      const params = [];
      if (filters.status) { where.push("d.review_status = ?"); params.push(filters.status); }
      if (filters.category) { where.push("d.category = ?"); params.push(filters.category); }
      if (filters.tag) { where.push("EXISTS (SELECT 1 FROM document_tags dt WHERE dt.document_id = d.id AND dt.tag = ?)"); params.push(filters.tag); }
      if (filters.q) {
        const q = `%${String(filters.q).trim()}%`;
        where.push("(d.title LIKE ? OR d.summary LIKE ? OR d.category LIKE ? OR EXISTS (SELECT 1 FROM document_tags dq WHERE dq.document_id = d.id AND dq.tag LIKE ?))");
        params.push(q, q, q, q);
      }
      const sql = `SELECT d.* FROM documents d ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY d.updated_at DESC`;
      const [rows] = await pool.query(sql, params);
      const tags = await tagsByDocument(rows.map((row) => row.id));
      const items = rows.map((row) => mapRow(row, tags.get(row.id) || []));
      return { items, total: items.length };
    },
    get,
    async create(payload, actor) {
      const connection = await pool.getConnection();
      const id = crypto.randomUUID();
      const now = new Date();
      try {
        await connection.beginTransaction();
        await connection.query(
          "INSERT INTO documents (id, title, summary, category, review_status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [id, payload.title, payload.summary, payload.category, payload.review_status, actor, now, now]
        );
        await saveTags(connection, id, payload.tags);
        await connection.commit();
        return await get(id);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async upsert(item) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          `INSERT INTO documents (id, title, summary, category, review_status, created_by, updated_by, created_at, updated_at, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), category=VALUES(category), review_status=VALUES(review_status), updated_by=VALUES(updated_by), updated_at=VALUES(updated_at), version=GREATEST(version, VALUES(version))`,
          [item.id, item.title, item.summary || "", item.category, item.review_status, item.created_by || "migration", item.updated_by || null, new Date(item.created_at || Date.now()), new Date(item.updated_at || Date.now()), Number(item.version || 1)]
        );
        await saveTags(connection, item.id, normalizeTags(item.tags));
        await connection.commit();
        return await get(item.id);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async update(id, payload, actor) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [result] = await connection.query(
          "UPDATE documents SET title=?, summary=?, category=?, review_status=?, updated_by=?, updated_at=?, version=version+1 WHERE id=?",
          [payload.title, payload.summary, payload.category, payload.review_status, actor, new Date(), id]
        );
        if (!result.affectedRows) { await connection.rollback(); return null; }
        await saveTags(connection, id, payload.tags);
        await connection.commit();
        return await get(id);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async updateFile(id, file, actor) {
      const [result] = await pool.query(
        "UPDATE documents SET file_object_key=?, file_name=?, file_type=?, file_size=?, file_uploaded_at=?, updated_by=?, updated_at=?, version=version+1 WHERE id=?",
        [file.object_key, file.name, file.type, file.size, new Date(file.uploaded_at), actor, new Date(), id]
      );
      return result.affectedRows ? get(id) : null;
    },
    async facets() {
      const [[categories], [tags]] = await Promise.all([
        pool.query("SELECT DISTINCT category FROM documents ORDER BY category"),
        pool.query("SELECT DISTINCT tag FROM document_tags ORDER BY tag"),
      ]);
      return { categories: categories.map((row) => row.category), tags: tags.map((row) => row.tag), statuses: [...STATUSES] };
    },
    async close() { await pool.end(); },
  };
}

function createFilesystemObjectStore(root) {
  const uploadRoot = path.join(root, "storage", "documents");
  return {
    name: "filesystem",
    async initialize() { fs.mkdirSync(uploadRoot, { recursive: true }); },
    async health() { return { status: "ok", path: uploadRoot }; },
    async put(documentId, file) {
      const directory = path.join(uploadRoot, documentId);
      fs.mkdirSync(directory, { recursive: true });
      const name = safeFileName(file.name);
      const objectKey = `${Date.now()}-${crypto.randomUUID()}-${name}`;
      fs.writeFileSync(path.join(directory, objectKey), file.buffer);
      return { object_key: objectKey, name, type: file.type || "application/octet-stream", size: file.buffer.length, uploaded_at: new Date().toISOString() };
    },
    async get(documentId, file) {
      const objectKey = file.object_key || file.stored_name;
      const directory = path.join(uploadRoot, documentId);
      const filePath = path.join(directory, objectKey);
      if (!filePath.startsWith(directory) || !fs.existsSync(filePath)) return null;
      return { stream: fs.createReadStream(filePath), size: Number(file.size || fs.statSync(filePath).size), name: file.name, type: file.type || "application/octet-stream", object_key: objectKey };
    },
    async remove(documentId, objectKey) {
      if (!objectKey) return;
      const directory = path.join(uploadRoot, documentId);
      const filePath = path.join(directory, objectKey);
      if (filePath.startsWith(directory) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    },
  };
}

function createMinioObjectStore(config) {
  const Minio = require("minio");
  const client = new Minio.Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region,
  });
  return {
    name: "minio",
    async initialize() {
      if (!await client.bucketExists(config.bucket)) await client.makeBucket(config.bucket, config.region);
    },
    async health() {
      const startedAt = Date.now();
      const exists = await client.bucketExists(config.bucket);
      return { status: exists ? "ok" : "missing_bucket", endpoint: `${config.useSSL ? "https" : "http"}://${config.endPoint}:${config.port}`, bucket: config.bucket, latency_ms: Date.now() - startedAt };
    },
    async put(documentId, file) {
      const name = safeFileName(file.name);
      const objectKey = `${documentId}/${crypto.randomUUID()}-${name}`;
      const type = file.type || "application/octet-stream";
      await client.putObject(config.bucket, objectKey, file.buffer, file.buffer.length, { "Content-Type": type, "X-Amz-Meta-Original-Name": encodeURIComponent(name) });
      return { object_key: objectKey, name, type, size: file.buffer.length, uploaded_at: new Date().toISOString() };
    },
    async get(_documentId, file) {
      if (!file.object_key) return null;
      const [stream, stat] = await Promise.all([client.getObject(config.bucket, file.object_key), client.statObject(config.bucket, file.object_key)]);
      return { stream, size: Number(file.size || stat.size), name: file.name, type: file.type || stat.metaData?.["content-type"] || "application/octet-stream", object_key: file.object_key };
    },
    async remove(_documentId, objectKey) {
      if (objectKey) await client.removeObject(config.bucket, objectKey);
    },
  };
}

function loadConfig(env = process.env) {
  return {
    metadataDriver: String(env.DOCUMENT_METADATA_DRIVER || "json").toLowerCase(),
    objectDriver: String(env.DOCUMENT_OBJECT_DRIVER || "filesystem").toLowerCase(),
    mysql: {
      host: env.DOCUMENT_MYSQL_HOST || "127.0.0.1",
      port: Number(env.DOCUMENT_MYSQL_PORT || 3307),
      user: env.DOCUMENT_MYSQL_USER || "ekmp",
      password: env.DOCUMENT_MYSQL_PASSWORD || "",
      database: env.DOCUMENT_MYSQL_DATABASE || "ekmp",
      connectionLimit: Number(env.DOCUMENT_MYSQL_CONNECTION_LIMIT || 10),
    },
    minio: {
      endPoint: env.MINIO_ENDPOINT || "127.0.0.1",
      port: Number(env.MINIO_PORT || 9000),
      useSSL: String(env.MINIO_USE_SSL || "false").toLowerCase() === "true",
      accessKey: env.MINIO_ACCESS_KEY || "",
      secretKey: env.MINIO_SECRET_KEY || "",
      bucket: env.MINIO_BUCKET || "ekmp-documents",
      region: env.MINIO_REGION || "us-east-1",
    },
  };
}

function createEnterpriseDocumentsStore(root, options = {}) {
  const config = options.config || loadConfig(options.env);
  const repository = options.repository || (config.metadataDriver === "mysql" ? createMysqlRepository(root, config.mysql) : createJsonRepository(root));
  const objects = options.objects || (config.objectDriver === "minio" ? createMinioObjectStore(config.minio) : createFilesystemObjectStore(root));
  let readyPromise = null;
  const ready = () => {
    if (!readyPromise) {
      readyPromise = Promise.all([repository.initialize(), objects.initialize()])
        .catch((error) => {
          readyPromise = null;
          throw error;
        });
    }
    return readyPromise;
  };

  function normalizePayload(payload, current = {}) {
    const title = payload.title === undefined ? current.title : String(payload.title || "").trim();
    if (!title) throw new Error("title is required");
    return {
      title,
      summary: payload.summary === undefined ? (current.summary || "") : String(payload.summary || "").trim(),
      category: payload.category === undefined ? (current.category || "\u672a\u5206\u7c7b") : (String(payload.category || "").trim() || "\u672a\u5206\u7c7b"),
      tags: payload.tags === undefined ? normalizeTags(current.tags) : normalizeTags(payload.tags),
      review_status: payload.review_status === undefined ? normalizeStatus(current.review_status) : normalizeStatus(payload.review_status),
    };
  }

  return {
    config: { metadata_driver: repository.name, object_driver: objects.name },
    async ready() { await ready(); return this.health(); },
    async health() {
      await ready();
      const [metadata, object] = await Promise.all([repository.health(), objects.health()]);
      return { status: metadata.status === "ok" && object.status === "ok" ? "ok" : "degraded", metadata_driver: repository.name, object_driver: objects.name, metadata, object };
    },
    async list(filters) {
      await ready();
      const result = await repository.list(filters);
      return { ...result, items: result.items.map(publicDocument) };
    },
    async get(id) { await ready(); return publicDocument(await repository.get(id)); },
    async create(payload, actor) { await ready(); return publicDocument(await repository.create(normalizePayload(payload), actor)); },
    async update(id, payload, actor) {
      await ready();
      const current = await repository.get(id);
      if (!current) return null;
      return publicDocument(await repository.update(id, normalizePayload(payload, current), actor));
    },
    async attachFile(id, file, actor) {
      await ready();
      const current = await repository.get(id);
      if (!current) return null;
      const previousKey = current.file?.object_key || current.file?.stored_name;
      const uploaded = await objects.put(id, file);
      try {
        const updated = await repository.updateFile(id, uploaded, actor);
        if (!updated) throw new Error("document not found after object upload");
        if (previousKey && previousKey !== uploaded.object_key) await objects.remove(id, previousKey);
        return publicDocument(updated);
      } catch (error) {
        await objects.remove(id, uploaded.object_key).catch(() => {});
        throw error;
      }
    },
    async getFile(id) {
      await ready();
      const document = await repository.get(id);
      if (!document?.file) return null;
      return objects.get(id, document.file);
    },
    async facets() { await ready(); return repository.facets(); },
    async importDocument(item, file) {
      await ready();
      const normalized = normalizePayload(item);
      const imported = await repository.upsert({ ...item, ...normalized, id: item.id || crypto.randomUUID(), created_by: item.created_by || "migration", created_at: item.created_at || new Date().toISOString(), updated_at: item.updated_at || new Date().toISOString() });
      if (!file) return publicDocument(imported);
      return this.attachFile(imported.id, file, "migration");
    },
    async close() { await repository.close(); },
  };
}

module.exports = { createEnterpriseDocumentsStore, loadConfig, normalizeTags };
