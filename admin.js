const loginPanel = document.querySelector("#loginPanel");
const dashboardPanel = document.querySelector("#dashboardPanel");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const logoutButton = document.querySelector("#logoutButton");
const adminUserLine = document.querySelector("#adminUserLine");
const adminMetrics = document.querySelector("#adminMetrics");
const serviceList = document.querySelector("#serviceList");
const roleList = document.querySelector("#roleList");
const coverageList = document.querySelector("#coverageList");
const actionList = document.querySelector("#actionList");

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || `Request failed: ${response.status}`);
  return payload.data;
}

function showLogin(message = "") {
  loginPanel.hidden = false;
  dashboardPanel.hidden = true;
  loginError.textContent = message;
}

function showDashboard(user) {
  loginPanel.hidden = true;
  dashboardPanel.hidden = false;
  adminUserLine.textContent = `${user.name} / ${user.role}`;
}

function renderSummary(summary) {
  adminMetrics.innerHTML = [
    ["商品数", summary.product_count],
    ["知识分段", summary.chunk_count],
    ["覆盖度", `${summary.coverage_score}%`],
    ["数据源", summary.data_source],
  ].map(([label, value]) => `<div class="admin-metric"><span>${label}</span><strong>${value}</strong></div>`).join("");

  serviceList.innerHTML = summary.services.map((item) => `
    <div class="admin-list-row"><strong>${item.name}</strong><span>${item.status}</span><em>${item.endpoint}</em></div>
  `).join("");

  roleList.innerHTML = summary.roles.map((role) => `
    <div class="admin-list-row"><strong>${role.name}</strong><span>${role.key}</span><em>${role.permissions.join(" / ")}</em></div>
  `).join("");

  coverageList.innerHTML = summary.low_coverage_items.length
    ? summary.low_coverage_items.map((item) => `
      <div class="admin-list-row"><strong>${item.label}</strong><span>${item.score}%</span><em>${item.note}</em></div>
    `).join("")
    : '<div class="admin-list-row"><strong>暂无低覆盖项</strong><span>通过</span><em>所有维度均达到阈值</em></div>';

  actionList.innerHTML = summary.recent_actions.map((item) => `
    <div class="admin-list-row"><strong>${item.action}</strong><span>${item.actor}</span><em>${item.time}</em></div>
  `).join("");
}

async function loadDashboard(user) {
  showDashboard(user);
  const summary = await api("/api/admin/summary");
  renderSummary(summary);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const username = document.querySelector("#usernameInput").value.trim();
  const password = document.querySelector("#passwordInput").value;
  try {
    const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    await loadDashboard(result.user);
  } catch (error) {
    showLogin(error.message);
  }
});

logoutButton.addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST", body: "{}" });
  showLogin();
});

(async function init() {
  try {
    const me = await api("/api/auth/me");
    if (me.authenticated) await loadDashboard(me.user);
    else showLogin();
  } catch (error) {
    showLogin(error.message);
  }
})();
