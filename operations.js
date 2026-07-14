const ui = {
  metrics: document.querySelector("#opsMetrics"),
  daily: document.querySelector("#dailyTrend"),
  quality: document.querySelector("#qualityDistribution"),
  channels: document.querySelector("#channelDistribution"),
  queries: document.querySelector("#topQueries"),
  table: document.querySelector("#logTable"),
  period: document.querySelector("#periodSelect"),
  search: document.querySelector("#logSearch"),
  status: document.querySelector("#logStatus"),
  type: document.querySelector("#interactionType"),
  previous: document.querySelector("#previousPage"),
  next: document.querySelector("#nextPage"),
  pageStatus: document.querySelector("#pageStatus"),
};

const labels = {
  title: "\u5ba1\u8ba1\u4e0e\u8fd0\u8425",
  eyebrow: "\u5e73\u53f0\u6cbb\u7406",
  trend: "\u6bcf\u65e5\u8d8b\u52bf",
  trendLegend: "\u4ea4\u4e92 / \u64cd\u4f5c / \u8d28\u91cf",
  quality: "\u8d28\u91cf\u5206\u5e03",
  channels: "\u4ea4\u4e92\u6e20\u9053",
  queries: "\u70ed\u95e8\u95ee\u9898",
  operations: "\u64cd\u4f5c\u65e5\u5fd7",
  interactions: "\u95ee\u7b54\u65e5\u5fd7",
  operationCount: "\u64cd\u4f5c\u6570",
  interactionCount: "\u4ea4\u4e92\u6570",
  successRate: "\u6210\u529f\u7387",
  averageQuality: "\u5e73\u5747\u8d28\u91cf",
  p95: "P95 \u8017\u65f6",
  lowQuality: "\u4f4e\u8d28\u91cf",
  search: "\u641c\u7d22",
  chat: "\u95ee\u7b54",
  excellent: "\u4f18\u79c0",
  good: "\u826f\u597d",
  watch: "\u89c2\u5bdf",
  risk: "\u98ce\u9669",
  noData: "\u6682\u65e0\u6570\u636e",
  actor: "\u64cd\u4f5c\u4eba",
  action: "\u52a8\u4f5c",
  resource: "\u8d44\u6e90",
  status: "\u72b6\u6001",
  time: "\u65f6\u95f4",
  question: "\u95ee\u9898",
  channel: "\u6e20\u9053",
  qualityScore: "\u8d28\u91cf\u5206",
  duration: "\u8017\u65f6",
  evidence: "\u8bc1\u636e",
  answer: "\u56de\u7b54",
  flags: "\u98ce\u9669\u6807\u8bb0",
  allStatuses: "\u5168\u90e8\u72b6\u6001",
  allInteractions: "\u5168\u90e8\u4ea4\u4e92",
};

let activeTab = "operations";
let page = 1;
let pageCount = 1;
let searchTimer;

async function api(path) {
  const response = await fetch(path, { credentials: "same-origin" });
  const payload = await response.json();
  if (response.status === 401) {
    window.location.replace("./admin.html");
    throw new Error("authentication required");
  }
  if (!response.ok) throw new Error(payload.message || `Request failed: ${response.status}`);
  return payload.data;
}

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));
const formatDate = (value) => value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value)) : "-";
const qualityClass = (value) => value >= 85 ? "excellent" : value >= 70 ? "good" : value >= 60 ? "watch" : "risk";

function localize() {
  document.title = `${labels.title} - Enterprise Knowledge Management`;
  document.querySelector("#opsTitle").textContent = labels.title;
  document.querySelector("#opsEyebrow").textContent = labels.eyebrow;
  document.querySelector("#trendTitle").textContent = labels.trend;
  document.querySelector("#trendLegend").textContent = labels.trendLegend;
  document.querySelector("#qualityTitle").textContent = labels.quality;
  document.querySelector("#channelTitle").textContent = labels.channels;
  document.querySelector("#queryTitle").textContent = labels.queries;
  document.querySelector("#operationsTab").textContent = labels.operations;
  document.querySelector("#interactionsTab").textContent = labels.interactions;
  ui.search.placeholder = "\u641c\u7d22\u65e5\u5fd7";
  ui.status.options[0].textContent = labels.allStatuses;
  ui.type.options[0].textContent = labels.allInteractions;
  ui.type.options[1].textContent = labels.search;
  ui.type.options[2].textContent = labels.chat;
}

function renderMetrics(metrics) {
  const items = [
    [labels.operationCount, metrics.operation_count, "audit"],
    [labels.interactionCount, metrics.interaction_count, `${metrics.chat_count} chat / ${metrics.search_count} search`],
    [labels.successRate, `${metrics.success_rate}%`, "success"],
    [labels.averageQuality, metrics.average_quality, "0-100"],
    [labels.p95, `${metrics.p95_duration_ms} ms`, "latency"],
    [labels.lowQuality, metrics.low_quality_count, "< 60"],
  ];
  ui.metrics.innerHTML = items.map(([label, value, note]) => `<div class="ops-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><em>${escapeHtml(note)}</em></div>`).join("");
}

function renderTrend(daily) {
  const max = Math.max(1, ...daily.flatMap((item) => [item.interactions, item.operations]));
  ui.daily.innerHTML = daily.map((item) => `<div class="ops-trend-day" title="${escapeHtml(item.date)}">
    <div class="ops-bars"><i style="height:${Math.max(3, item.interactions / max * 100)}%"></i><b style="height:${Math.max(3, item.operations / max * 100)}%"></b></div>
    <strong>${item.average_quality || 0}</strong><span>${item.date.slice(5)}</span>
  </div>`).join("");
}

function renderDistribution(container, rows, nameMap = {}) {
  const total = Math.max(1, rows.reduce((sum, row) => sum + row.count, 0));
  container.innerHTML = rows.length ? rows.map((row) => `<div class="ops-distribution-row"><div><strong>${escapeHtml(nameMap[row.name] || labels[row.name] || row.name)}</strong><span>${row.count}</span></div><div class="ops-progress"><i style="width:${row.count / total * 100}%"></i></div></div>`).join("") : `<div class="ops-empty">${labels.noData}</div>`;
}

function renderQueries(rows) {
  ui.queries.innerHTML = rows.length ? rows.map((row, index) => `<div class="ops-query-row"><span>${index + 1}</span><strong>${escapeHtml(row.query)}</strong><em>${row.count}</em></div>`).join("") : `<div class="ops-empty">${labels.noData}</div>`;
}

function operationTable(items) {
  return `<div class="ops-table-head"><span>${labels.action}</span><span>${labels.actor}</span><span>${labels.resource}</span><span>${labels.status}</span><span>${labels.time}</span></div>${items.map((item) => `<div class="ops-table-row"><span><strong>${escapeHtml(item.action)}</strong><small>${escapeHtml(item.detail || item.ip)}</small></span><span>${escapeHtml(item.actor)}</span><span>${escapeHtml(item.resource_type)}<small>${escapeHtml(item.resource_id)}</small></span><span><b class="ops-status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</b></span><span>${formatDate(item.timestamp)}</span></div>`).join("")}`;
}

function interactionTable(items) {
  return `<div class="ops-table-head interaction"><span>${labels.question}</span><span>${labels.channel}</span><span>${labels.qualityScore}</span><span>${labels.status}</span><span>${labels.duration}</span></div>${items.map((item) => `<details class="ops-interaction-row"><summary><span><strong>${escapeHtml(item.question || "-")}</strong><small>${formatDate(item.timestamp)}</small></span><span>${escapeHtml(item.type)}</span><span><b class="ops-quality ${qualityClass(item.quality?.overall || 0)}">${item.quality?.overall || 0}</b></span><span><b class="ops-status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</b></span><span>${Math.round(item.duration_ms)} ms</span></summary><div class="ops-interaction-detail"><div><strong>${labels.answer}</strong><p>${escapeHtml(item.answer || item.error || "-")}</p></div><div><strong>${labels.evidence}</strong><p>${item.evidence_count} / Top ${Number(item.top_score || 0).toFixed(3)}</p></div><div><strong>${labels.flags}</strong><p>${(item.quality?.flags || []).map(escapeHtml).join(" / ") || "-"}</p></div></div></details>`).join("")}`;
}

async function loadAnalytics() {
  const analytics = await api(`/api/admin/analytics?days=${ui.period.value}`);
  renderMetrics(analytics.metrics);
  renderTrend(analytics.daily);
  renderDistribution(ui.quality, analytics.quality_distribution);
  renderDistribution(ui.channels, analytics.interaction_distribution, { search: labels.search, chat: labels.chat });
  renderQueries(analytics.top_queries);
}

async function loadLogs() {
  const params = new URLSearchParams({ page, page_size: 25 });
  if (ui.search.value.trim()) params.set("q", ui.search.value.trim());
  if (ui.status.value) params.set("status", ui.status.value);
  if (activeTab === "interactions" && ui.type.value) params.set("type", ui.type.value);
  const endpoint = activeTab === "operations" ? "/api/admin/audit/operations" : "/api/admin/audit/qa";
  const result = await api(`${endpoint}?${params}`);
  ui.table.innerHTML = result.items.length ? (activeTab === "operations" ? operationTable(result.items) : interactionTable(result.items)) : `<div class="ops-empty">${labels.noData}</div>`;
  pageCount = Math.max(1, Math.ceil(result.total / result.page_size));
  ui.pageStatus.textContent = `${result.page} / ${pageCount}`;
  ui.previous.disabled = result.page <= 1;
  ui.next.disabled = result.page >= pageCount;
}

async function refreshAll() {
  await Promise.all([loadAnalytics(), loadLogs()]);
}

document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", async () => {
  activeTab = button.dataset.tab;
  page = 1;
  document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("active", item === button));
  ui.type.hidden = activeTab !== "interactions";
  await loadLogs();
}));
document.querySelector("#refreshButton").addEventListener("click", refreshAll);
ui.period.addEventListener("change", loadAnalytics);
ui.status.addEventListener("change", () => { page = 1; loadLogs(); });
ui.type.addEventListener("change", () => { page = 1; loadLogs(); });
ui.search.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { page = 1; loadLogs(); }, 250); });
ui.previous.addEventListener("click", () => { if (page > 1) { page -= 1; loadLogs(); } });
ui.next.addEventListener("click", () => { if (page < pageCount) { page += 1; loadLogs(); } });

(async function init() {
  localize();
  try {
    const me = await api("/api/auth/me");
    if (!me.authenticated) {
      window.location.replace("./admin.html");
      return;
    }
    document.querySelector("#opsUser").textContent = `${me.user.name} / ${me.user.role}`;
    await refreshAll();
  } catch (error) {
    ui.table.innerHTML = `<div class="ops-empty">${escapeHtml(error.message)}</div>`;
  }
})();
