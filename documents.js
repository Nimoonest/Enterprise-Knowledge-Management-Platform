const elements = {
  search: document.querySelector("#documentSearch"),
  category: document.querySelector("#categoryFilter"),
  tag: document.querySelector("#tagFilter"),
  status: document.querySelector("#statusFilter"),
  count: document.querySelector("#documentCount"),
  list: document.querySelector("#documentList"),
  detail: document.querySelector("#documentDetail"),
  dialog: document.querySelector("#documentDialog"),
  form: document.querySelector("#documentForm"),
  formTitle: document.querySelector("#documentFormTitle"),
  formError: document.querySelector("#documentFormError"),
  id: document.querySelector("#documentId"),
  title: document.querySelector("#documentTitle"),
  summary: document.querySelector("#documentSummary"),
  documentCategory: document.querySelector("#documentCategory"),
  documentStatus: document.querySelector("#documentStatus"),
  tags: document.querySelector("#documentTags"),
  file: document.querySelector("#documentFile"),
};

const statusLabels = { draft: "\u8349\u7a3f", pending_review: "\u5f85\u5ba1\u6838", approved: "\u5df2\u901a\u8fc7", rejected: "\u5df2\u9a73\u56de" };
let documents = [];

function localizeStaticUi() {
  const text = (selector, value) => { document.querySelector(selector).textContent = value; };
  document.title = "\u6587\u6863\u4e2d\u5fc3 - \u4f01\u4e1a\u77e5\u8bc6\u7ba1\u7406\u5e73\u53f0";
  text(".document-header .document-eyebrow", "\u77e5\u8bc6\u8d44\u4ea7\u7ba1\u7406");
  text(".document-header h1", "\u6587\u6863\u4e2d\u5fc3");
  text(".document-header > div > p:last-child", "\u7ba1\u7406\u6587\u6863\u5143\u6570\u636e\u3001\u672c\u5730\u539f\u6587\u4ef6\u548c\u5ba1\u6838\u72b6\u6001\u3002");
  text(".document-header .admin-actions a:nth-child(1)", "\u5e73\u53f0\u6982\u89c8");
  text(".document-header .admin-actions a:nth-child(2)", "\u8fd4\u56de\u524d\u53f0");
  text("#newDocumentButton", "\u65b0\u5efa\u6587\u6863");
  elements.search.placeholder = "\u641c\u7d22\u6807\u9898\u3001\u6458\u8981\u3001\u5206\u7c7b\u6216\u6807\u7b7e";
  text("#categoryFilter option", "\u5168\u90e8\u5206\u7c7b");
  text("#tagFilter option", "\u5168\u90e8\u6807\u7b7e");
  text("#statusFilter option", "\u5168\u90e8\u72b6\u6001");
  document.querySelectorAll('option[value="draft"]').forEach((node) => { node.textContent = statusLabels.draft; });
  document.querySelectorAll('option[value="pending_review"]').forEach((node) => { node.textContent = statusLabels.pending_review; });
  document.querySelectorAll('option[value="approved"]').forEach((node) => { node.textContent = statusLabels.approved; });
  document.querySelectorAll('option[value="rejected"]').forEach((node) => { node.textContent = statusLabels.rejected; });
  text(".document-section-head h2", "\u6587\u6863\u5217\u8868");
  text("#documentDetail .document-empty", "\u4ece\u5217\u8868\u4e2d\u9009\u62e9\u4e00\u4efd\u6587\u6863\u67e5\u770b\u8be6\u60c5");
  text(".document-dialog .document-eyebrow", "\u6587\u6863\u4fe1\u606f");
  text("#documentFormTitle", "\u65b0\u5efa\u6587\u6863");
  document.querySelector("#closeDocumentDialog").setAttribute("aria-label", "\u5173\u95ed");
  document.querySelector("#closeDocumentDialog").textContent = "\u00d7";
  const directLabels = document.querySelectorAll("#documentForm > label");
  directLabels[0].childNodes[0].nodeValue = "\u6807\u9898";
  directLabels[1].childNodes[0].nodeValue = "\u6458\u8981";
  directLabels[2].childNodes[0].nodeValue = "\u6807\u7b7e";
  directLabels[3].childNodes[0].nodeValue = "\u672c\u5730\u6587\u4ef6\uff08\u6700\u5927 20 MB\uff09";
  const gridLabels = document.querySelectorAll(".document-form-grid label");
  gridLabels[0].childNodes[0].nodeValue = "\u5206\u7c7b";
  gridLabels[1].childNodes[0].nodeValue = "\u5ba1\u6838\u72b6\u6001";
  elements.tags.placeholder = "\u591a\u4e2a\u6807\u7b7e\u4f7f\u7528\u9017\u53f7\u5206\u9694";
  text(".document-form-note", "\u9644\u4ef6\u4fdd\u5b58\u5728\u79c1\u6709\u5bf9\u8c61\u5b58\u50a8\u4e2d\uff0c\u4e0a\u4f20\u548c\u4e0b\u8f7d\u5747\u7531\u540e\u7aef\u7edf\u4e00\u9274\u6743\u3002");
  text("#cancelDocumentButton", "\u53d6\u6d88");
  text(".document-form-actions .primary-action", "\u4fdd\u5b58");
}
let selectedId = null;

async function api(path, options = {}) {
  const headers = options.body instanceof Blob ? {
    "X-File-Name": encodeURIComponent(options.body.name),
    "X-File-Type": options.body.type || "application/octet-stream",
  } : { "Content-Type": "application/json" };
  const response = await fetch(path, { credentials: "same-origin", ...options, headers: { ...headers, ...(options.headers || {}) } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || `\u8bf7\u6c42\u5931\u8d25\uff1a${response.status}`);
  return payload.data;
}

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));
const formatDate = (value) => value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
const formatSize = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

async function loadFacets() {
  const facets = await api("/api/admin/document-facets");
  const setOptions = (select, items, label) => {
    const current = select.value;
    select.innerHTML = `<option value="">${label}</option>${items.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    select.value = current;
  };
  setOptions(elements.category, facets.categories, "\u5168\u90e8\u5206\u7c7b");
  setOptions(elements.tag, facets.tags, "\u5168\u90e8\u6807\u7b7e");
  document.querySelector("#categoryOptions").innerHTML = facets.categories.map((item) => `<option value="${escapeHtml(item)}"></option>`).join("");
}

async function loadDocuments() {
  const params = new URLSearchParams();
  if (elements.search.value.trim()) params.set("q", elements.search.value.trim());
  if (elements.category.value) params.set("category", elements.category.value);
  if (elements.tag.value) params.set("tag", elements.tag.value);
  if (elements.status.value) params.set("status", elements.status.value);
  const result = await api(`/api/admin/documents?${params}`);
  documents = result.items;
  elements.count.textContent = `${result.total} \u7bc7`;
  renderList();
  if (selectedId) {
    const selected = documents.find((item) => item.id === selectedId);
    if (selected) renderDetail(selected);
  }
}

function renderList() {
  if (!documents.length) {
    elements.list.innerHTML = '<div class="document-empty">\u6ca1\u6709\u7b26\u5408\u6761\u4ef6\u7684\u6587\u6863</div>';
    return;
  }
  elements.list.innerHTML = documents.map((item) => `
    <button class="document-row ${item.id === selectedId ? "selected" : ""}" data-document-id="${escapeHtml(item.id)}" type="button">
      <span class="document-row-main">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.category)} \u00b7 ${formatDate(item.updated_at)}</small>
      </span>
      <span class="document-status status-${escapeHtml(item.review_status)}">${statusLabels[item.review_status] || item.review_status}</span>
      <span class="document-tags">${(item.tags || []).map((tag) => `<em>${escapeHtml(tag)}</em>`).join("")}</span>
    </button>
  `).join("");
}

function renderDetail(item) {
  selectedId = item.id;
  renderList();
  elements.detail.innerHTML = `
    <div class="document-detail-head">
      <div><p class="document-eyebrow">${escapeHtml(item.category)}</p><h2>${escapeHtml(item.title)}</h2></div>
      <button class="primary-action" id="editDocumentButton" type="button">\u7f16\u8f91</button>
    </div>
    <p class="document-summary">${escapeHtml(item.summary || "\u6682\u65e0\u6458\u8981")}</p>
    <dl class="document-metadata">
      <div><dt>\u5ba1\u6838\u72b6\u6001</dt><dd><span class="document-status status-${escapeHtml(item.review_status)}">${statusLabels[item.review_status]}</span></dd></div>
      <div><dt>\u6807\u7b7e</dt><dd>${(item.tags || []).map((tag) => `<span class="detail-tag">${escapeHtml(tag)}</span>`).join("") || "\u65e0"}</dd></div>
      <div><dt>\u521b\u5efa\u4eba</dt><dd>${escapeHtml(item.created_by)}</dd></div>
      <div><dt>\u66f4\u65b0\u65f6\u95f4</dt><dd>${formatDate(item.updated_at)}</dd></div>
    </dl>
    <div class="document-file-block">
      <h3>\u539f\u59cb\u6587\u4ef6</h3>
      ${item.file ? `<div><strong>${escapeHtml(item.file.name)}</strong><span>${formatSize(item.file.size)}</span><a href="/api/admin/documents/${encodeURIComponent(item.id)}/file">\u4e0b\u8f7d</a></div>` : "<p>\u5c1a\u672a\u4e0a\u4f20\u672c\u5730\u6587\u4ef6</p>"}
    </div>
  `;
  document.querySelector("#editDocumentButton").addEventListener("click", () => openForm(item));
}

function openForm(item = null) {
  elements.form.reset();
  elements.formError.textContent = "";
  elements.formTitle.textContent = item ? "\u7f16\u8f91\u6587\u6863" : "\u65b0\u5efa\u6587\u6863";
  elements.id.value = item?.id || "";
  elements.title.value = item?.title || "";
  elements.summary.value = item?.summary || "";
  elements.documentCategory.value = item?.category || "";
  elements.documentStatus.value = item?.review_status || "draft";
  elements.tags.value = (item?.tags || []).join("\uFF0C");
  elements.dialog.showModal();
}

elements.list.addEventListener("click", (event) => {
  const row = event.target.closest("[data-document-id]");
  if (!row) return;
  const item = documents.find((document) => document.id === row.dataset.documentId);
  if (item) renderDetail(item);
});
document.querySelector("#newDocumentButton").addEventListener("click", () => openForm());
document.querySelector("#closeDocumentDialog").addEventListener("click", () => elements.dialog.close());
document.querySelector("#cancelDocumentButton").addEventListener("click", () => elements.dialog.close());
[elements.category, elements.tag, elements.status].forEach((element) => element.addEventListener("change", loadDocuments));
let searchTimer;
elements.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadDocuments, 250);
});

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.formError.textContent = "";
  try {
    const payload = {
      title: elements.title.value.trim(),
      summary: elements.summary.value.trim(),
      category: elements.documentCategory.value.trim(),
      tags: elements.tags.value,
      review_status: elements.documentStatus.value,
    };
    const id = elements.id.value;
    let saved = await api(id ? `/api/admin/documents/${encodeURIComponent(id)}` : "/api/admin/documents", {
      method: id ? "PATCH" : "POST", body: JSON.stringify(payload),
    });
    const file = elements.file.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) throw new Error("\u6587\u4ef6\u4e0d\u80fd\u8d85\u8fc7 20 MB");
      saved = await api(`/api/admin/documents/${encodeURIComponent(saved.id)}/file`, { method: "PUT", body: file });
    }
    selectedId = saved.id;
    elements.dialog.close();
    await Promise.all([loadFacets(), loadDocuments()]);
    renderDetail(saved);
  } catch (error) {
    elements.formError.textContent = error.message;
  }
});

(async function init() {
  localizeStaticUi();
  try {
    const me = await api("/api/auth/me");
    if (!me.authenticated) {
      window.location.replace("./admin.html");
      return;
    }
    await loadFacets();
    await loadDocuments();
    if (documents[0]) renderDetail(documents[0]);
  } catch (error) {
    elements.list.innerHTML = `<div class="document-empty">${escapeHtml(error.message)}</div>`;
  }
})();
