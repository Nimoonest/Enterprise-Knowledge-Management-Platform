const PRODUCT_KB_URL = "./data/products_kb.json";
const PRODUCT_APP_NAME = "商品导购问答机器人";
const PRODUCT_APP_ID = "5c9aab66-7aac-11f1-807c-fe3788870ed2";

const modes = {
  library: { type: "insight", title: "商品知识库", subtitle: "查看 products_v2.xlsx 生成的商品、分类、图片、搭配关系和知识分段。", prompts: ["全部商品", "有库存商品", "高价商品"] },
  coverage: { type: "insight", title: "知识覆盖", subtitle: "按商品字段、关联关系、图片、分类和导购分段检查新知识库完整度。", prompts: ["总体覆盖", "待补字段", "导购视角"] },
  guide: { type: "chat", title: "AI 商品导购", subtitle: "连接商品导购应用，支持连续追问、商品推荐和价格咨询。", placeholder: "例如：我想要木质香调的蜡烛，预算 1000 左右，有什么推荐？", prompts: ["我想要木质香调的蜡烛，预算 1000 左右，有什么推荐？", "有没有圣日尔曼大道34号相关的香氛产品？", "我想了解大号香氛蜡烛-圣日尔曼大道34号的各方面信息", "想送礼，推荐几款有质感的家居香氛"] },
  recall: { type: "insight", title: "召回测试", subtitle: "用商品名称、SKU、香味、品类和场景问题检查本地知识分段命中情况。", prompts: ["全部样本", "香味查询", "商品详情"] },
  lineage: { type: "insight", title: "知识溯源", subtitle: "展示导购问题如何命中商品分段、结构化字段和搭配关系。", prompts: ["推荐链路", "详情链路", "搭配链路"] },
};

let kb = { meta: {}, products: [], chunks: [] };
let currentMode = "library";
let pending = false;
let selectedProductSku = "";
let selectedRecallIndex = 0;
let selectedLineageIndex = 0;
const session = { chatId: null, clientId: crypto.randomUUID() };

const modeGrid = document.querySelector("#modeGrid");
const mainPanel = document.querySelector("#mainPanel");
const tracePanel = document.querySelector("#tracePanel");
const pageTitle = document.querySelector("#pageTitle");
const panelTitle = document.querySelector("#panelTitle");
const panelSubtitle = document.querySelector("#panelSubtitle");
const quickPrompts = document.querySelector("#quickPrompts");
const conversation = document.querySelector("#conversation");
const insightWorkspace = document.querySelector("#insightWorkspace");
const composer = document.querySelector("#composer");
const questionInput = document.querySelector("#questionInput");
const traceList = document.querySelector("#traceList");
const resetButton = document.querySelector("#resetButton");
const qualityScore = document.querySelector("#qualityScore");
const qualityBar = document.querySelector("#qualityBar");

async function init() {
  try {
    const response = await fetch(PRODUCT_KB_URL);
    if (!response.ok) throw new Error(`商品知识文件加载失败：${response.status}`);
    kb = await response.json();
    selectedProductSku = kb.products[0]?.SKU || "";
    renderModeCards();
    renderNav();
    setMode("library");
  } catch (error) {
    conversation.textContent = error.message;
    renderTrace([], 0);
  }
}

function renderModeCards() {
  modeGrid.innerHTML = `
    <button class="mode-card" data-mode="guide"><span class="mode-icon orange">◆</span><span class="mode-title">AI 商品导购</span><span class="mode-badge">MaxKB</span><span class="mode-desc">基于 Excel 商品知识推荐香氛、蜡烛、家居扩香和关联搭配。</span><span class="mode-foot">知识来源：products_v2.xlsx / MySQL / MaxKB 分段</span></button>
    <button class="mode-card" data-mode="library"><span class="mode-icon green">▣</span><span class="mode-title">商品知识库</span><span class="mode-badge green">${kb.meta.product_count || kb.products.length} SKU</span><span class="mode-desc">查看结构化商品字段、分类、库存、价格和知识分段状态。</span><span class="mode-foot">适用知识：商品主表、分类、图片、搭配关系</span></button>
    <button class="mode-card" data-mode="coverage"><span class="mode-icon purple">◎</span><span class="mode-title">知识覆盖</span><span class="mode-badge purple">质量</span><span class="mode-desc">检查导购问答所需字段是否完整，定位待补内容。</span><span class="mode-foot">适用知识：描述、香味、使用建议、关联推荐</span></button>
    <button class="mode-card" data-mode="recall"><span class="mode-icon teal">◇</span><span class="mode-title">召回测试</span><span class="mode-badge teal">检索</span><span class="mode-desc">模拟用户按香味、SKU、品类、场景检索商品知识。</span><span class="mode-foot">适用知识：MaxKB 商品分段</span></button>`;
  modeGrid.querySelectorAll(".mode-card").forEach((card) => card.addEventListener("click", () => setMode(card.dataset.mode)));
}

function renderNav() {
  document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => {
    if (item.dataset.navMode && modes[item.dataset.navMode]) setMode(item.dataset.navMode);
  }));
}

function setMode(mode) {
  currentMode = mode;
  const data = modes[mode];
  pageTitle.textContent = data.title;
  panelTitle.textContent = data.title;
  panelSubtitle.textContent = data.subtitle;
  questionInput.placeholder = data.placeholder || "输入查询内容";
  quickPrompts.innerHTML = data.prompts.map((prompt, index) => `<button type="button" data-index="${index}">${escapeHtml(prompt)}</button>`).join("");
  quickPrompts.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => handleQuickPrompt(Number(button.dataset.index))));
  document.querySelectorAll(".mode-card").forEach((card) => card.classList.toggle("active", card.dataset.mode === mode));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.navMode === mode));

  const isChat = data.type === "chat";
  conversation.hidden = !isChat;
  composer.hidden = !isChat;
  insightWorkspace.hidden = isChat;
  mainPanel.classList.toggle("single-module", !isChat);
  tracePanel.hidden = false;
  if (isChat) resetConversation(); else renderInsight(mode);
}

function handleQuickPrompt(index) {
  if (modes[currentMode].type === "chat") return runChat(modes[currentMode].prompts[index]);
  if (currentMode === "library") renderLibrary(index);
  if (currentMode === "coverage") renderCoverage(index);
  if (currentMode === "recall") renderRecall(index);
  if (currentMode === "lineage") renderLineage(index);
}

function resetConversation() {
  conversation.innerHTML = "";
  addMessage("assistant", `你好，我是${modes.guide.title}。你可以告诉我想要的香调、品类、预算、使用场景，或直接给我商品名/货号，我来帮你挑。`);
  renderTrace(buildTrace(kb.chunks.slice(0, 5), 0.72), 86);
}

function renderInsight(mode) {
  if (mode === "library") renderLibrary();
  if (mode === "coverage") renderCoverage();
  if (mode === "recall") renderRecall();
  if (mode === "lineage") renderLineage();
}

function productStats() {
  const products = kb.products;
  const withStock = products.filter((item) => Number(item["库存"]) > 0);
  const withDescription = products.filter((item) => item["描述"]);
  const withUsage = products.filter((item) => item["使用建议"]);
  const withRelations = products.filter((item) => [...item.pairing_suggestions, ...item.related_products, ...item.cross_sell, ...item.upgrade_recommendations].length > 0);
  const categories = new Set(products.flatMap((item) => item.categories || []));
  const avgPrice = Math.round(products.reduce((sum, item) => sum + Number(item["价格"] || 0), 0) / Math.max(products.length, 1));
  return { products, withStock, withDescription, withUsage, withRelations, categories, avgPrice };
}

function renderLibrary(filterIndex = 0) {
  const stats = productStats();
  let products = [...stats.products];
  if (filterIndex === 1) products = products.filter((item) => Number(item["库存"]) > 0);
  if (filterIndex === 2) products = products.filter((item) => Number(item["价格"]) >= stats.avgPrice).sort((a, b) => Number(b["价格"]) - Number(a["价格"]));
  if (!products.some((item) => item.SKU === selectedProductSku)) selectedProductSku = products[0]?.SKU || "";
  const selected = products.find((item) => item.SKU === selectedProductSku) || products[0];
  insightWorkspace.innerHTML = `
    <div class="library-summary">${renderMetric("商品 SKU", stats.products.length, "来自 Excel 商品信息")}${renderMetric("有库存", stats.withStock.length, "库存大于 0")}${renderMetric("分类路径", stats.categories.size, "分类映射表")}${renderMetric("知识分段", kb.chunks.length, "可导入 MaxKB")}</div>
    <div class="library-layout"><div class="library-assets"><div class="library-assets-head"><span>商品</span><span>价格</span><span>库存</span><span>类型</span></div>${products.slice(0, 80).map(renderProductRow).join("")}</div><aside class="library-detail">${selected ? renderProductDetail(selected) : ""}</aside></div>`;
  insightWorkspace.querySelectorAll(".library-row").forEach((button) => button.addEventListener("click", () => { selectedProductSku = button.dataset.sku; renderLibrary(filterIndex); }));
  renderTrace(buildTrace(products.slice(0, 5).map(productToChunk), 0.8), Math.round((stats.withDescription.length / stats.products.length) * 100));
}

function renderProductRow(product) {
  return `<button class="library-row ${product.SKU === selectedProductSku ? "selected" : ""}" data-sku="${escapeHtml(product.SKU)}" type="button"><span><strong>${escapeHtml(product["名称"])}</strong><em>${escapeHtml(product.SKU)}</em></span><span>${formatPrice(product["价格"])}</span><span>${escapeHtml(product["库存"] ?? "--")}</span><b class="ready">${escapeHtml(product["类型"] || "未分类")}</b></button>`;
}

function renderProductDetail(product) {
  const relations = [...product.pairing_suggestions, ...product.related_products.slice(0, 3), ...product.cross_sell.slice(0, 3), ...product.upgrade_recommendations.slice(0, 3)];
  return `<h3>${escapeHtml(product["名称"])}</h3><p>${escapeHtml(product["描述"] || "该商品暂无描述字段。")}</p><div class="library-health"><span>${escapeHtml(product.SKU)}</span><strong>${formatPrice(product["价格"])}</strong></div><div class="library-section"><h4>香味与类型</h4><div class="tag-list">${[product["副标题"], product["香调"], product["类型"]].filter(Boolean).map((item) => `<span>${escapeHtml(item)}</span>`).join("") || "<span>未收录</span>"}</div></div><div class="library-section"><h4>分类</h4><div class="tag-list">${(product.categories || []).slice(0, 8).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div><div class="library-section"><h4>使用建议</h4><p>${escapeHtml(product["使用建议"] || "未收录使用建议。")}</p></div><div class="library-section"><h4>搭配与关联</h4><div class="expected-list">${relations.slice(0, 8).map((item) => `<span>${escapeHtml(item)}</span>`).join("") || "<span>未收录关联推荐</span>"}</div></div>`;
}

function renderCoverage(filterIndex = 0) {
  const stats = productStats();
  const rows = [coverageRow("商品主数据", stats.products.length, stats.products.length, "SKU、名称、类型、价格、库存已结构化入库"), coverageRow("商品描述", stats.withDescription.length, stats.products.length, "支撑用户了解产品特点和香气描述"), coverageRow("使用建议", stats.withUsage.length, stats.products.length, "支撑怎么用、适合什么场景等问题"), coverageRow("搭配关系", stats.withRelations.length, stats.products.length, "支撑交叉销售、升级推荐和套装建议"), coverageRow("图片资源", kb.products.filter((item) => (item.images || []).length > 0).length, stats.products.length, "支撑前端展示和商品详情页跳转"), coverageRow("MaxKB 分段", kb.chunks.length, stats.products.length, "每个商品一段导购知识")];
  const visible = filterIndex === 1 ? rows.filter((row) => row.score < 90) : rows;
  const average = Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length);
  insightWorkspace.innerHTML = `<div class="coverage-summary">${renderMetric("平均覆盖", `${average}%`, "导购字段完整度")}${renderMetric("待补维度", rows.filter((row) => row.score < 90).length, "低于 90%")}${renderMetric("商品分段", kb.chunks.length, "MaxKB 可导入")}</div><div class="coverage-layout"><div class="coverage-board">${visible.map(renderCoverageCard).join("")}</div><aside class="coverage-detail"><h3>建议动作</h3><p>优先补充缺少使用建议、搭配关系和香调字段的商品；这些字段直接影响按香味推荐、送礼推荐、使用场景推荐的回答质量。</p><div class="library-section"><h4>当前转换策略</h4><p>MySQL 保留结构化字段，MaxKB 使用每个 SKU 一个商品分段，分段中合并描述、使用建议、产品特性、搭配建议和详情页。</p></div></aside></div>`;
  renderTrace(visible.map((row) => ({ title: row.label, content: row.note, similarity: row.score / 100 })), average);
}

function coverageRow(label, covered, total, note) { return { label, covered, total, note, score: Math.round((covered / Math.max(total, 1)) * 100) }; }
function renderCoverageCard(row) { const cls = row.score >= 90 ? "pass" : row.score >= 70 ? "watch" : "risk"; return `<div class="coverage-card"><div class="coverage-card-head"><span>${escapeHtml(row.label)}</span><b class="${cls}">${row.score}%</b></div><p>${escapeHtml(row.note)}</p><div class="coverage-row"><span>${row.covered}/${row.total}</span><strong>${row.score}%</strong></div><div class="coverage-bar"><span style="width: ${row.score}%"></span></div></div>`; }

function recallSamples() { return [{ question: "木质香调蜡烛推荐", expected: ["木质", "蜡烛"] }, { question: "圣日尔曼大道34号淡香精", expected: ["圣日尔曼大道34号", "淡香精"] }, { question: "预算1000左右的香氛蜡烛", expected: ["蜡烛", "CNY"] }, { question: "车载扩香器香氛套装", expected: ["车载", "扩香"] }, { question: "适合送礼的家居香氛", expected: ["gift", "home", "香氛"] }]; }

function renderRecall(filterIndex = 0) {
  const samples = recallSamples().filter((item) => filterIndex === 1 ? item.question.includes("香调") || item.question.includes("圣日尔曼") : filterIndex === 2 ? item.question.includes("淡香精") || item.question.includes("蜡烛") : true);
  if (selectedRecallIndex >= samples.length) selectedRecallIndex = 0;
  const selected = samples[selectedRecallIndex];
  const hits = searchKnowledge(selected.question).slice(0, 5);
  const score = Math.round((hits[0]?.score || 0) * 100);
  insightWorkspace.innerHTML = `<div class="recall-summary">${renderMetric("测试样本", samples.length, "香味、品类、详情")}${renderMetric("Top1 分", `${score}%`, "本地检索模拟")}${renderMetric("命中分段", hits.length, "Top 5")}</div><div class="recall-layout"><div class="recall-table"><div class="recall-table-head"><span>问题</span><span>期望信号</span><span>状态</span></div>${samples.map((item, index) => `<button class="recall-row ${index === selectedRecallIndex ? "selected" : ""}" data-index="${index}"><span>${escapeHtml(item.question)}</span><span>${item.expected.map(escapeHtml).join("、")}</span><b>可测</b></button>`).join("")}</div><aside class="recall-detail"><h3>${escapeHtml(selected.question)}</h3><div class="expected-list">${selected.expected.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>${hits.map((hit, index) => `<div class="trace-item"><div class="trace-title"><span>${index + 1}. ${escapeHtml(hit.title)}</span><span class="trace-score">${hit.score.toFixed(2)}</span></div><div class="trace-body">${escapeHtml(hit.content).slice(0, 260)}</div></div>`).join("")}</aside></div>`;
  insightWorkspace.querySelectorAll(".recall-row").forEach((button) => button.addEventListener("click", () => { selectedRecallIndex = Number(button.dataset.index); renderRecall(filterIndex); }));
  renderTrace(hits, score || 70);
}

function renderLineage(filterIndex = 0) {
  const cases = [{ question: "我想要木质香调的蜡烛", route: ["用户问题", "AI 商品导购", "MaxKB 商品分段检索", "命中香味/品类/价格字段", "生成推荐理由"] }, { question: "介绍圣日尔曼大道34号淡香精", route: ["用户问题", "AI 商品导购", "命中商品名称", "读取描述/副标题/价格/详情页", "生成商品详情"] }, { question: "买蜡烛还可以搭配什么", route: ["用户问题", "AI 商品导购", "命中商品关系表", "读取搭配/交叉销售/升级推荐", "生成组合建议"] }];
  selectedLineageIndex = filterIndex === 0 ? selectedLineageIndex : Math.min(filterIndex - 1, cases.length - 1);
  const selected = cases[selectedLineageIndex] || cases[0];
  const hits = searchKnowledge(selected.question).slice(0, 4);
  insightWorkspace.innerHTML = `<div class="lineage-summary">${renderMetric("知识来源", "Excel + MySQL", "结构化存储")}${renderMetric("RAG 文档", "Markdown/JSONL", "MaxKB 可导入")}${renderMetric("应用入口", PRODUCT_APP_NAME, "知识模拟模块")}</div><div class="lineage-layout"><div class="panel-card lineage-case-list">${cases.map((item, index) => `<button class="lineage-row ${index === selectedLineageIndex ? "active" : ""}" data-index="${index}"><strong>${escapeHtml(item.question)}</strong><span>${escapeHtml(item.route.at(-1))}</span></button>`).join("")}</div><article class="panel-card lineage-detail"><div class="lineage-heading"><h3>${escapeHtml(selected.question)}</h3><span>证据链路</span></div><div class="lineage-route">${selected.route.map((step, index) => `<span>${index + 1}. ${escapeHtml(step)}</span>`).join("")}</div>${hits.map((hit) => `<div class="evidence-card"><div><strong>${escapeHtml(hit.title)}</strong><span>${hit.score.toFixed(2)}</span></div><p>${escapeHtml(hit.content).slice(0, 220)}</p></div>`).join("")}</article></div>`;
  insightWorkspace.querySelectorAll(".lineage-row").forEach((button) => button.addEventListener("click", () => { selectedLineageIndex = Number(button.dataset.index); renderLineage(); }));
  renderTrace(hits, 88);
}

function renderMetric(label, value, note) { return `<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><em>${escapeHtml(note)}</em></div>`; }
function addMessage(role, text) { const bubble = document.createElement("div"); bubble.className = `message ${role}`; bubble.textContent = text; conversation.appendChild(bubble); conversation.scrollTop = conversation.scrollHeight; return bubble; }

function renderTrace(items, score) {
  traceList.innerHTML = "";
  if (!items.length) { const empty = document.createElement("div"); empty.className = "trace-empty"; empty.textContent = "暂无命中结果"; traceList.appendChild(empty); }
  items.forEach((item) => { const trace = document.createElement("div"); trace.className = "trace-item"; trace.innerHTML = `<div class="trace-title"><span>${escapeHtml(item.title || "未命名分段")}</span><span class="trace-score">${Number(item.similarity ?? item.score ?? 0).toFixed(2)}</span></div><div class="trace-body">${escapeHtml(item.content || "").slice(0, 220)}</div>`; traceList.appendChild(trace); });
  qualityScore.textContent = score ? String(score) : "--";
  qualityBar.style.width = `${score || 0}%`;
}

function productToChunk(product) { return { title: `${product["名称"]}（${product.SKU}）`, content: [product["副标题"], product["类型"], product["描述"], product["使用建议"]].filter(Boolean).join("。") }; }
function buildTrace(items, baseScore = 0.7) { return items.map((item, index) => ({ title: item.title || `${item["名称"]}（${item.SKU}）`, content: item.content || item.search_text || item["描述"] || "", similarity: Math.max(0.45, baseScore - index * 0.04) })); }

function tokenize(text) {
  const normalized = String(text || "").toLowerCase();
  const latin = normalized.match(/[a-z0-9]+/g) || [];
  const chinese = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const grams = [];
  chinese.forEach((word) => { for (let index = 0; index < word.length - 1; index += 1) grams.push(word.slice(index, index + 2)); if (word.length > 3) grams.push(word); });
  return [...new Set([...latin, ...chinese, ...grams])];
}

function searchKnowledge(question) {
  const terms = tokenize(question);
  const budgetMatch = String(question).match(/(\d{3,5})\s*(?:元|块|左右|以内|预算)?/);
  const budget = budgetMatch ? Number(budgetMatch[1]) : null;
  const scored = kb.chunks.map((chunk) => {
    const product = kb.products.find((item) => item.SKU === chunk.sku);
    const haystack = `${chunk.title}\n${chunk.content}\n${(chunk.keywords || []).join("\n")}`.toLowerCase();
    let score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    if (budget && product?.["价格"]) { const price = Number(product["价格"]); if (price <= budget * 1.15) score += 2; if (price > budget * 1.5) score -= 1; }
    if (Number(product?.["库存"]) > 0) score += 0.4;
    return { ...chunk, product, rawScore: score };
  });
  const maxScore = Math.max(...scored.map((item) => item.rawScore), 1);
  return scored.filter((item) => item.rawScore > 0).sort((a, b) => b.rawScore - a.rawScore).slice(0, 8).map((item) => ({ ...item, score: Math.min(0.98, Math.max(0.52, item.rawScore / maxScore)) }));
}

function productTypeLabel(type) { const labels = { candle: "家居香氛", fragrance: "个人香氛", bodycare: "身体护理", decoration: "香氛配件" }; return labels[String(type || "").toLowerCase()] || type || ""; }

function cleanRelationText(text) { return String(text || "").replace(/\s*\[[^\]]+\]/g, ""); }

function answerFromLocalKnowledge(question) {
  const hits = searchKnowledge(question);
  const selected = hits.length ? hits.slice(0, 4) : kb.chunks.slice(0, 3).map((chunk, index) => ({ ...chunk, score: 0.55 - index * 0.03, product: kb.products.find((item) => item.SKU === chunk.sku) }));
  const lead = hits.length ? "可以，按你的需求我比较推荐这几款：" : "我暂时没有找到完全贴合的款式，先给你几款可参考的选择：";
  const lines = selected.map((hit, index) => { const product = hit.product || {}; const meta = [formatPrice(product["价格"]), product["副标题"], productTypeLabel(product["类型"]), product.SKU ? `货号 ${product.SKU}` : ""].filter(Boolean).join("｜"); const reasons = [product["副标题"], productTypeLabel(product["类型"]), product["描述"]?.slice(0, 80)].filter(Boolean).join("；"); const relation = cleanRelationText([...(product.pairing_suggestions || []), ...(product.cross_sell || [])][0]); return `${index + 1}. ${product["名称"] || hit.title}${meta ? `（${meta}）` : ""}\n   推荐理由：${reasons || "这款比较适合作为备选。"}${relation ? `\n   搭配上可以考虑：${relation}。` : ""}`; });
  return { answer: [lead, ...lines, "", "你也可以再告诉我更具体的香味偏好、预算、使用场景或送礼对象，我继续帮你缩小范围。"].join("\n"), traces: selected, quality_score: hits.length ? 89 : 72 };
}

async function runChat(question) {
  if (pending) return;
  pending = true;
  addMessage("user", question);
  const loadingBubble = addMessage("assistant", "我先帮你看一下合适的选择...");
  setComposerState(false);
  try {
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app_id: PRODUCT_APP_ID, app_name: PRODUCT_APP_NAME, message: question, chat_id: session.chatId, client_id: session.clientId }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "导购服务暂时不可用");
    session.chatId = result.chat_id;
    session.clientId = result.client_id || session.clientId;
    loadingBubble.textContent = result.answer || "我暂时没有找到合适的回答，你可以换个说法再试一次。";
    renderTrace(result.traces || [], result.quality_score || 0);
  } catch (error) {
    loadingBubble.textContent = "导购服务暂时没有成功返回，请稍后再试。";
    renderTrace([], 0);
  } finally {
    pending = false;
    setComposerState(true);
  }
}

function setComposerState(enabled) { questionInput.disabled = !enabled; composer.querySelector("button").disabled = !enabled; }
function formatPrice(value) { const number = Number(value); return Number.isFinite(number) && number > 0 ? `CNY ${Math.round(number)}` : "价格未收录"; }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

composer.addEventListener("submit", (event) => { event.preventDefault(); const question = questionInput.value.trim(); if (!question) return; questionInput.value = ""; runChat(question); });
resetButton.addEventListener("click", () => setMode(currentMode));
init();
