const modes = {
  guide: {
    type: "chat",
    appId: "45fa5cf6-79d2-11f1-8c78-56920ea5d652",
    appName: "AI导购模拟",
    title: "AI 导购模拟",
    subtitle: "连接 MaxKB 应用，根据发质、场景与需求推荐产品组合。",
    placeholder: "例如：我头发容易出油，发尾又干，用哪款比较合适？",
    prompts: [
      "我头发容易出油，发尾又干，用哪款比较合适？",
      "烫染后头发受损毛躁，适合什么护理？",
      "头皮敏感还能每天洗吗？",
    ],
  },
  chatbot: {
    type: "chat",
    appId: "45fd80ca-79d2-11f1-8c78-56920ea5d652",
    appName: "AI Chatbot模拟",
    title: "AI Chatbot 模拟",
    subtitle: "连接 MaxKB 应用，面向 FAQ、产品说明和风险提示进行客服问答。",
    placeholder: "例如：这款洗发水适合每天使用吗？",
    prompts: [
      "这款洗发水适合每天使用吗？",
      "潘婷强韧修护洗发水的主要功效是什么？",
      "头皮敏感的人可以用吗？",
    ],
  },
  geo: {
    type: "chat",
    appId: "460029d8-79d2-11f1-8c78-56920ea5d652",
    appName: "GEO内容检验",
    title: "GEO 内容检验",
    subtitle: "连接 MaxKB 应用，输出结构化摘要并检查 AI 搜索展示可读性。",
    placeholder: "例如：请用 JSON 总结产品名称、功效、适用人群和风险提示",
    prompts: [
      "请用 JSON 总结产品名称、功效、适用人群和风险提示",
      "检查强韧修护洗发水是否适合 AI 搜索摘要",
      "输出产品核心字段和内容完整性评分",
    ],
  },
  map: {
    type: "insight",
    title: "知识地图",
    subtitle: "把潘婷测试知识库按业务目标、知识域和覆盖度展开，适合向业务方说明知识资产结构。",
    prompts: ["查看业务入口", "查看知识域覆盖", "查看待补强区域"],
  },
  graph: {
    type: "insight",
    title: "知识图谱",
    subtitle: "把品牌、产品、场景、规则、FAQ 与风险边界串成实体关系网络，适合解释 RAG 召回路径。",
    prompts: ["聚焦产品关系", "聚焦场景规则", "聚焦风险边界"],
  },
  recall: {
    type: "insight",
    title: "召回测试",
    subtitle: "用预设问题集检查知识库命中率、Top 分和风险样本，适合演示 RAG 检索质量。",
    prompts: ["全部样本", "只看风险", "只看高分"],
  },
};

const knowledgeMap = [
  {
    id: "products",
    title: "产品矩阵",
    owner: "商品知识",
    coverage: 96,
    count: 4,
    status: "完整",
    color: "orange",
    items: ["强韧修护洗发水", "清爽控油洗发水", "滋养顺滑护发素", "深层修护发膜"],
    business: ["AI导购模拟", "AI Chatbot模拟", "GEO内容检验"],
    gap: "可继续补充规格、容量、价格带和渠道信息。",
  },
  {
    id: "rules",
    title: "导购规则",
    owner: "场景知识",
    coverage: 90,
    count: 3,
    status: "可用",
    color: "green",
    items: ["出油但发尾干", "干枯毛躁受损", "头皮敏感"],
    business: ["AI导购模拟"],
    gap: "建议补充季节、使用频率和多人群组合规则。",
  },
  {
    id: "faq",
    title: "FAQ 问答",
    owner: "客服知识",
    coverage: 88,
    count: 5,
    status: "可用",
    color: "blue",
    items: ["是否每天使用", "主要功效", "敏感头皮", "出油发尾干", "烫染受损"],
    business: ["AI Chatbot模拟", "AI导购模拟"],
    gap: "可补充售后、购买渠道、适用年龄和搭配禁忌。",
  },
  {
    id: "geo",
    title: "GEO 字段",
    owner: "AI 搜索资产",
    coverage: 84,
    count: 7,
    status: "需扩展",
    color: "purple",
    items: ["产品名称", "品类", "功效", "适用人群", "使用建议", "风险提示", "AI 搜索摘要建议"],
    business: ["GEO内容检验"],
    gap: "建议按每个 SKU 补齐结构化字段和搜索摘要版本。",
  },
  {
    id: "boundaries",
    title: "内容边界",
    owner: "合规规则",
    coverage: 92,
    count: 3,
    status: "完整",
    color: "teal",
    items: ["不夸大功效", "不替代医疗建议", "无知识库内容时不编造"],
    business: ["AI Chatbot模拟", "GEO内容检验"],
    gap: "可增加品牌禁词、竞品对比边界和医学风险分级。",
  },
  {
    id: "recall",
    title: "召回测试关键词",
    owner: "检索评估",
    coverage: 76,
    count: 8,
    status: "待补强",
    color: "slate",
    items: ["出油", "发尾干", "烫染", "毛躁", "敏感", "发膜", "控油", "修护"],
    business: ["召回测试", "知识溯源"],
    gap: "建议加入长尾口语、错别字和复合诉求样本。",
  },
];


const recallTests = [
  {
    id: "oil-dry",
    query: "我头发容易出油，发尾又干，用哪款比较合适？",
    intent: "复合发质导购",
    expected: ["导购规则-出油发尾干", "产品矩阵-清爽控油洗发水", "FAQ-出油发尾干推荐"],
    hits: [
      { title: "导购规则-出油发尾干", score: 0.94, type: "场景知识", content: "建议发根使用清爽控油洗发水，发尾搭配滋养顺滑护发素或少量发膜。" },
      { title: "产品矩阵-清爽控油洗发水", score: 0.89, type: "商品知识", content: "适合发根出油、需要清爽蓬松的人群，避免过度滋润导致塌发。" },
      { title: "FAQ-出油发尾干推荐", score: 0.84, type: "FAQ", content: "出油但发尾干时可组合控油洗发水和发尾护理产品。" },
    ],
  },
  {
    id: "damaged",
    query: "烫染后头发受损毛躁，适合什么护理？",
    intent: "受损修护",
    expected: ["导购规则-干枯毛躁受损", "产品矩阵-强韧修护洗发水", "产品矩阵-深层修护发膜"],
    hits: [
      { title: "导购规则-干枯毛躁受损", score: 0.91, type: "场景知识", content: "干枯毛躁或烫染受损发质，优先选择修护型洗发水并搭配发膜。" },
      { title: "产品矩阵-深层修护发膜", score: 0.87, type: "商品知识", content: "用于加强护理，帮助改善干枯毛躁的护理体验。" },
      { title: "产品矩阵-强韧修护洗发水", score: 0.82, type: "商品知识", content: "适合脆弱、受损、烫染后的发质进行日常清洁护理。" },
    ],
  },
  {
    id: "sensitive",
    query: "头皮敏感的人可以每天用吗？",
    intent: "敏感风险边界",
    expected: ["FAQ-头皮敏感能否使用", "内容边界-不替代医疗建议", "导购规则-头皮敏感"],
    hits: [
      { title: "FAQ-头皮敏感能否使用", score: 0.86, type: "FAQ", content: "头皮敏感人群建议先少量试用，若有明显不适应停止使用。" },
      { title: "内容边界-不替代医疗建议", score: 0.79, type: "合规规则", content: "产品建议不能替代医疗诊断或治疗建议。" },
      { title: "导购规则-头皮敏感", score: 0.72, type: "场景知识", content: "敏感场景回答需要加入风险提示和温和建议。" },
    ],
  },
  {
    id: "geo-json",
    query: "请用 JSON 总结产品名称、功效、适用人群和风险提示",
    intent: "GEO 结构化提取",
    expected: ["GEO字段-产品名称", "GEO字段-功效", "GEO字段-风险提示"],
    hits: [
      { title: "GEO字段-产品名称", score: 0.88, type: "GEO 字段", content: "结构化内容应包含产品名称、品类、功效、适用人群和使用建议。" },
      { title: "GEO字段-风险提示", score: 0.81, type: "GEO 字段", content: "摘要中应保留风险提示，避免夸大功效。" },
      { title: "内容边界-不夸大功效", score: 0.74, type: "合规规则", content: "不能承诺医学治疗或绝对效果。" },
    ],
  },
  {
    id: "unknown-medical",
    query: "脱发严重是不是洗这个就能治好？",
    intent: "未知/医疗越界",
    expected: ["内容边界-不替代医疗建议", "内容边界-不夸大功效"],
    hits: [
      { title: "内容边界-不替代医疗建议", score: 0.83, type: "合规规则", content: "如涉及严重脱发、皮肤疾病或持续不适，应建议咨询专业人士。" },
      { title: "内容边界-不夸大功效", score: 0.77, type: "合规规则", content: "不得宣称洗护产品可治疗疾病或保证效果。" },
      { title: "FAQ-产品主要功效", score: 0.51, type: "FAQ", content: "产品知识只覆盖日常清洁、控油、顺滑和修护护理体验。" },
    ],
  },
];
const graphNodes = [
  { id: "brand", label: "潘婷", type: "品牌", x: 50, y: 45, size: "large", detail: "品牌中心节点，连接产品矩阵、业务应用和内容边界。" },
  { id: "kb", label: "潘婷测试知识库", type: "知识库", x: 50, y: 18, size: "medium", detail: "20 个段落、8 个问题映射、20 条 embedding 索引。" },
  { id: "repair", label: "强韧修护洗发水", type: "产品", x: 20, y: 30, size: "medium", detail: "适合受损、脆弱、烫染后护理场景。" },
  { id: "oil", label: "清爽控油洗发水", type: "产品", x: 22, y: 62, size: "medium", detail: "适合发根容易出油、需要清爽蓬松的用户。" },
  { id: "conditioner", label: "滋养顺滑护发素", type: "产品", x: 50, y: 76, size: "medium", detail: "适合发尾干、毛躁、需要顺滑护理的搭配场景。" },
  { id: "mask", label: "深层修护发膜", type: "产品", x: 78, y: 62, size: "medium", detail: "用于加强护理，适合干枯毛躁和受损发质。" },
  { id: "oilyDry", label: "出油但发尾干", type: "场景", x: 33, y: 47, size: "small", detail: "导购规则：发根控油，发尾搭配护发素或少量发膜。" },
  { id: "damaged", label: "烫染受损", type: "场景", x: 68, y: 38, size: "small", detail: "导购规则：优先修护类洗发水，搭配发膜加强护理。" },
  { id: "sensitive", label: "头皮敏感", type: "风险", x: 75, y: 23, size: "small", detail: "回答时需要提示个体差异，严重不适建议咨询专业人士。" },
  { id: "guideApp", label: "AI导购模拟", type: "应用", x: 35, y: 88, size: "small", detail: "把场景诉求转成产品组合和使用建议。" },
  { id: "chatApp", label: "AI Chatbot模拟", type: "应用", x: 62, y: 88, size: "small", detail: "面向 FAQ、产品说明和风险提示回答。" },
  { id: "geoApp", label: "GEO内容检验", type: "应用", x: 86, y: 82, size: "small", detail: "生成结构化摘要，检查 AI 搜索可读性。" },
  { id: "boundary", label: "内容边界", type: "合规", x: 86, y: 44, size: "small", detail: "不夸大功效、不替代医疗建议、无依据不编造。" },
];

const graphEdges = [
  ["kb", "brand", "承载"],
  ["brand", "repair", "包含"],
  ["brand", "oil", "包含"],
  ["brand", "conditioner", "包含"],
  ["brand", "mask", "包含"],
  ["oil", "oilyDry", "命中"],
  ["conditioner", "oilyDry", "搭配"],
  ["repair", "damaged", "适配"],
  ["mask", "damaged", "加强护理"],
  ["sensitive", "boundary", "受约束"],
  ["oilyDry", "guideApp", "驱动"],
  ["damaged", "guideApp", "驱动"],
  ["repair", "chatApp", "问答"],
  ["boundary", "chatApp", "约束"],
  ["brand", "geoApp", "摘要"],
  ["boundary", "geoApp", "校验"],
];

const sessions = {
  guide: { chatId: null, clientId: crypto.randomUUID() },
  chatbot: { chatId: null, clientId: crypto.randomUUID() },
  geo: { chatId: null, clientId: crypto.randomUUID() },
};

let currentMode = "guide";
let pending = false;
let selectedGraphNode = "brand";
let selectedRecallId = recallTests[0].id;

const modeGrid = document.querySelector("#modeGrid");
const mainPanel = document.querySelector("#mainPanel");
const tracePanel = document.querySelector("#tracePanel");
const modeCards = document.querySelectorAll(".mode-card");
const navItems = document.querySelectorAll(".nav-item");
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

function setMode(mode) {
  currentMode = mode;
  const data = modes[mode];
  const isInsight = data.type === "insight";
  const isKnowledgeSimulation = ["guide", "chatbot", "geo"].includes(mode);

  modeGrid.hidden = !isKnowledgeSimulation;
  mainPanel.classList.toggle("single-module", isInsight);
  tracePanel.hidden = isInsight;
  modeCards.forEach((card) => card.classList.toggle("active", card.dataset.mode === mode));
  navItems.forEach((item) => item.classList.toggle("active", item.textContent.trim() === navLabelForMode(mode)));
  pageTitle.textContent = data.title;
  panelTitle.textContent = data.title;
  panelSubtitle.textContent = data.subtitle;
  quickPrompts.innerHTML = "";

  data.prompts.forEach((prompt, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => handleQuickPrompt(prompt, index));
    quickPrompts.appendChild(button);
  });

  conversation.hidden = isInsight;
  insightWorkspace.hidden = !isInsight;
  composer.hidden = isInsight;

  if (isInsight) {
    renderInsight(mode);
    return;
  }

  questionInput.placeholder = data.placeholder;
  resetConversation();
}

function navLabelForMode(mode) {
  return {
    guide: "知识模拟",
    chatbot: "知识模拟",
    geo: "知识模拟",
    map: "知识地图",
    graph: "知识图谱",
    recall: "召回测试",
  }[mode];
}

function handleQuickPrompt(prompt, index) {
  if (modes[currentMode].type === "chat") {
    questionInput.value = prompt;
    runChat(prompt);
    return;
  }

  if (currentMode === "map") {
    renderKnowledgeMap(index);
    return;
  }

  if (currentMode === "recall") {
    renderRecallTest(index);
    return;
  }

  renderKnowledgeGraph(index);
}

function resetConversation() {
  const data = modes[currentMode];
  sessions[currentMode] = { chatId: null, clientId: crypto.randomUUID() };
  conversation.innerHTML = "";
  addMessage("assistant", `你好，我是${data.title}，会直接调用 MaxKB 应用并基于潘婷测试知识库回答。`);
  renderTrace([], 0);
}

function renderInsight(mode) {
  if (mode === "map") {
    renderKnowledgeMap(0);
    return;
  }

  if (mode === "recall") {
    renderRecallTest(0);
    return;
  }

  renderKnowledgeGraph(0);
}

function renderKnowledgeMap(viewIndex = 0) {
  const sortedDomains = [...knowledgeMap].sort((a, b) => {
    if (viewIndex === 2) return a.coverage - b.coverage;
    return b.coverage - a.coverage;
  });
  const weakestDomain = [...knowledgeMap].sort((a, b) => a.coverage - b.coverage)[0];
  const average = Math.round(knowledgeMap.reduce((sum, item) => sum + item.coverage, 0) / knowledgeMap.length);
  const totalItems = knowledgeMap.reduce((sum, item) => sum + item.count, 0);

  insightWorkspace.innerHTML = `
    <div class="map-summary">
      ${renderMetric("知识域", knowledgeMap.length, "个核心模块")}
      ${renderMetric("知识项", totalItems, "条结构化资产")}
      ${renderMetric("平均覆盖", `${average}%`, "可演示水平")}
      ${renderMetric("低覆盖域", weakestDomain.title, weakestDomain.gap)}
    </div>
    <div class="knowledge-map-layout">
      <div class="domain-lane">
        ${sortedDomains.map(renderDomainCard).join("")}
      </div>
      <div class="business-map">
        <h3>业务入口覆盖</h3>
        ${renderBusinessRows()}
      </div>
    </div>
  `;

  renderTrace(
    sortedDomains.map((item) => ({
      title: item.title,
      similarity: item.coverage / 100,
      content: `${item.owner}，${item.count} 个知识项。${item.gap}`,
    })),
    average,
  );
}

function renderMetric(label, value, note) {
  return `
    <div class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <em>${escapeHtml(note)}</em>
    </div>
  `;
}

function renderDomainCard(item) {
  return `
    <article class="domain-card ${item.color}">
      <div class="domain-head">
        <div>
          <span class="domain-owner">${escapeHtml(item.owner)}</span>
          <h3>${escapeHtml(item.title)}</h3>
        </div>
        <span class="domain-status">${escapeHtml(item.status)}</span>
      </div>
      <div class="coverage-row">
        <span>覆盖度</span>
        <strong>${item.coverage}%</strong>
      </div>
      <div class="coverage-bar"><span style="width: ${item.coverage}%"></span></div>
      <div class="tag-list">
        ${item.items.map((entry) => `<span>${escapeHtml(entry)}</span>`).join("")}
      </div>
      <p>${escapeHtml(item.gap)}</p>
    </article>
  `;
}

function renderBusinessRows() {
  const rows = ["AI导购模拟", "AI Chatbot模拟", "GEO内容检验", "召回测试", "知识溯源"];
  return rows
    .map((row) => {
      const domains = knowledgeMap.filter((item) => item.business.includes(row));
      return `
        <div class="business-row">
          <span>${escapeHtml(row)}</span>
          <div>${domains.map((item) => `<strong class="${item.color}">${escapeHtml(item.title)}</strong>`).join("")}</div>
        </div>
      `;
    })
    .join("");
}


function renderRecallTest(filterIndex = 0) {
  const enriched = recallTests.map(scoreRecallTest);
  const filtered = enriched.filter((item) => {
    if (filterIndex === 1) return item.status !== "通过";
    if (filterIndex === 2) return item.topScore >= 0.86;
    return true;
  });
  const visibleTests = filtered.length ? filtered : enriched;
  if (!visibleTests.some((item) => item.id === selectedRecallId)) {
    selectedRecallId = visibleTests[0].id;
  }
  const selected = visibleTests.find((item) => item.id === selectedRecallId) || visibleTests[0];
  const passCount = enriched.filter((item) => item.status === "通过").length;
  const averageTopScore = Math.round((enriched.reduce((sum, item) => sum + item.topScore, 0) / enriched.length) * 100);
  const hitRate = Math.round((enriched.reduce((sum, item) => sum + item.expectedHitRate, 0) / enriched.length) * 100);

  insightWorkspace.innerHTML = `
    <div class="recall-summary">
      ${renderMetric("测试样本", enriched.length, "覆盖导购、FAQ、GEO、边界")}
      ${renderMetric("通过样本", `${passCount}/${enriched.length}`, "Top 命中满足预期")}
      ${renderMetric("平均 Top 分", `${averageTopScore}%`, "模拟综合相似度")}
      ${renderMetric("预期命中率", `${hitRate}%`, "命中 expected 段落比例")}
    </div>
    <div class="recall-layout">
      <div class="recall-table">
        <div class="recall-table-head">
          <span>测试问题</span>
          <span>意图</span>
          <span>Top 分</span>
          <span>状态</span>
        </div>
        ${visibleTests.map(renderRecallRow).join("")}
      </div>
      <aside class="recall-detail">
        <span class="detail-type">${escapeHtml(selected.intent)}</span>
        <h3>${escapeHtml(selected.query)}</h3>
        <div class="recall-score-line">
          <strong>${Math.round(selected.topScore * 100)}%</strong>
          <span>${escapeHtml(selected.statusText)}</span>
        </div>
        <div class="expected-list">
          ${selected.expected.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="hit-list">
          ${selected.hits.map(renderRecallHit).join("")}
        </div>
      </aside>
    </div>
  `;

  insightWorkspace.querySelectorAll(".recall-row").forEach((button) => {
    button.addEventListener("click", () => {
      selectedRecallId = button.dataset.recall;
      renderRecallTest(filterIndex);
    });
  });

  renderTrace(
    selected.hits.map((hit) => ({
      title: hit.title,
      similarity: hit.score,
      content: `${hit.type}：${hit.content}`,
    })),
    Math.round(selected.topScore * 100),
  );
}

function scoreRecallTest(test) {
  const topScore = Math.max(...test.hits.map((hit) => hit.score));
  const expectedHitCount = test.expected.filter((expected) => test.hits.some((hit) => hit.title === expected)).length;
  const expectedHitRate = expectedHitCount / test.expected.length;
  const status = topScore >= 0.82 && expectedHitRate >= 0.6 ? "通过" : topScore >= 0.72 ? "关注" : "风险";
  const statusText = status === "通过" ? "召回稳定" : status === "关注" ? "需要复核命中段落" : "建议补充知识或改写问题映射";
  return { ...test, topScore, expectedHitRate, status, statusText };
}

function renderRecallRow(item) {
  return `
    <button class="recall-row ${item.id === selectedRecallId ? "selected" : ""}" data-recall="${item.id}" type="button">
      <span>${escapeHtml(item.query)}</span>
      <span>${escapeHtml(item.intent)}</span>
      <strong>${Math.round(item.topScore * 100)}%</strong>
      <em class="${item.status === "通过" ? "pass" : item.status === "关注" ? "watch" : "risk"}">${escapeHtml(item.status)}</em>
    </button>
  `;
}

function renderRecallHit(hit, index) {
  return `
    <article class="hit-card">
      <div class="hit-card-head">
        <span>Top ${index + 1}</span>
        <strong>${Math.round(hit.score * 100)}%</strong>
      </div>
      <h4>${escapeHtml(hit.title)}</h4>
      <p>${escapeHtml(hit.content)}</p>
      <em>${escapeHtml(hit.type)}</em>
    </article>
  `;
}
function renderKnowledgeGraph(focusIndex = 0) {
  const focusGroups = ["产品", "场景", "合规"];
  const focusType = focusGroups[focusIndex] || "产品";
  const selected = graphNodes.find((node) => node.id === selectedGraphNode) || graphNodes[0];
  const edgeLines = graphEdges.map(([from, to, label]) => renderEdge(from, to, label, focusType)).join("");
  const nodeButtons = graphNodes.map((node) => renderGraphNode(node, focusType)).join("");

  insightWorkspace.innerHTML = `
    <div class="graph-shell">
      <div class="graph-canvas" aria-label="知识图谱网络">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${edgeLines}
        </svg>
        ${nodeButtons}
      </div>
      <aside class="node-detail">
        <span class="detail-type">${escapeHtml(selected.type)}</span>
        <h3>${escapeHtml(selected.label)}</h3>
        <p>${escapeHtml(selected.detail)}</p>
        <div class="relation-list">
          ${renderRelations(selected.id)}
        </div>
      </aside>
    </div>
  `;

  insightWorkspace.querySelectorAll(".graph-node").forEach((button) => {
    button.addEventListener("click", () => {
      selectedGraphNode = button.dataset.node;
      renderKnowledgeGraph(focusIndex);
    });
  });

  renderTrace(
    graphEdges
      .filter(([from, to]) => from === selected.id || to === selected.id)
      .map(([from, to, label]) => ({
        title: label,
        similarity: 0.92,
        content: `${nodeLabel(from)} -> ${nodeLabel(to)}`,
      })),
    94,
  );
}

function renderEdge(fromId, toId, label, focusType) {
  const from = graphNodes.find((node) => node.id === fromId);
  const to = graphNodes.find((node) => node.id === toId);
  const isFocus = from.type === focusType || to.type === focusType;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  return `
    <line class="graph-edge ${isFocus ? "focus" : ""}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>
    <text class="edge-label" x="${midX}" y="${midY}">${escapeHtml(label)}</text>
  `;
}

function renderGraphNode(node, focusType) {
  const isSelected = node.id === selectedGraphNode;
  const isFocus = node.type === focusType || node.type === "品牌" || node.type === "知识库";
  return `
    <button class="graph-node ${node.size} ${isSelected ? "selected" : ""} ${isFocus ? "focus" : "muted"}" data-node="${node.id}" style="left: ${node.x}%; top: ${node.y}%" type="button">
      <span>${escapeHtml(node.label)}</span>
      <em>${escapeHtml(node.type)}</em>
    </button>
  `;
}

function renderRelations(nodeId) {
  const rows = graphEdges.filter(([from, to]) => from === nodeId || to === nodeId);
  if (!rows.length) return "<span>暂无直接关系</span>";
  return rows
    .map(([from, to, label]) => `<div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(nodeLabel(from))} -> ${escapeHtml(nodeLabel(to))}</span></div>`)
    .join("");
}

function nodeLabel(id) {
  return graphNodes.find((node) => node.id === id)?.label || id;
}

function addMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = "message " + role;
  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "user" ? "用户" : "AI";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  wrapper.append(label, bubble);
  conversation.appendChild(wrapper);
  conversation.scrollTop = conversation.scrollHeight;
  return bubble;
}

function renderTrace(items, score) {
  traceList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "trace-item";
    empty.innerHTML = `
      <div class="trace-title">
        <span>等待提问</span>
        <span class="trace-score">--</span>
      </div>
      <div class="trace-body">发送问题后，这里会显示 MaxKB 真实返回的知识库命中段落。</div>
    `;
    traceList.appendChild(empty);
  }

  items.forEach((item) => {
    const trace = document.createElement("div");
    trace.className = "trace-item";
    const similarity = Number(item.similarity ?? item.comprehensive_score ?? 0);
    trace.innerHTML = `
      <div class="trace-title">
        <span>${escapeHtml(item.title || "未命名段落")}</span>
        <span class="trace-score">${similarity ? similarity.toFixed(2) : "--"}</span>
      </div>
      <div class="trace-body">${escapeHtml(item.content || "").slice(0, 220)}</div>
    `;
    traceList.appendChild(trace);
  });

  qualityScore.textContent = score ? String(score) : "--";
  qualityBar.style.width = `${score || 0}%`;
}

async function runChat(question) {
  if (pending) return;
  pending = true;

  const data = modes[currentMode];
  const session = sessions[currentMode];
  addMessage("user", question);
  const loadingBubble = addMessage("assistant", "正在调用 MaxKB 应用...");
  setComposerState(false);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: data.appId,
        app_name: data.appName,
        message: question,
        chat_id: session.chatId,
        client_id: session.clientId,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "MaxKB 调用失败");
    }

    session.chatId = result.chat_id;
    session.clientId = result.client_id || session.clientId;
    loadingBubble.textContent = result.answer || "没有返回内容。";
    renderTrace(result.traces || [], result.quality_score || 0);
  } catch (error) {
    loadingBubble.textContent = `调用失败：${error.message}`;
    renderTrace([], 0);
  } finally {
    pending = false;
    setComposerState(true);
  }
}

function setComposerState(enabled) {
  questionInput.disabled = !enabled;
  composer.querySelector("button").disabled = !enabled;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

modeCards.forEach((card) => {
  card.addEventListener("click", () => setMode(card.dataset.mode));
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    if (item.dataset.navMode) setMode(item.dataset.navMode);
  });
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;
  questionInput.value = "";
  runChat(question);
});

resetButton.addEventListener("click", () => setMode(currentMode));

setMode("guide");
