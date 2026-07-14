const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const STATUSES = new Set(["draft", "pending_review", "approved", "rejected"]);

function createDocumentsStore(root) {
  const dataPath = path.join(root, "data", "documents.json");
  const uploadRoot = path.join(root, "storage", "documents");
  const ensure = () => {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.mkdirSync(uploadRoot, { recursive: true });
    if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]\n", "utf8");
  };
  const read = () => {
    ensure();
    const items = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    if (!Array.isArray(items)) throw new Error("data/documents.json must contain an array");
    return items;
  };
  const write = (items) => fs.writeFileSync(dataPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  const tags = (value) => [...new Set((Array.isArray(value) ? value : String(value || "").split(/[,?]/)).map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 20);
  const status = (value = "draft") => {
    if (!STATUSES.has(value)) throw new Error(`invalid review_status: ${value}`);
    return value;
  };
  const view = (item) => ({
    ...item,
    has_file: Boolean(item.file),
    file: item.file ? { name: item.file.name, type: item.file.type, size: item.file.size, uploaded_at: item.file.uploaded_at } : null,
  });
  const find = (items, id) => items.findIndex((item) => item.id === id);

  function list(filters = {}) {
    const q = String(filters.q || "").trim().toLowerCase();
    const items = read()
      .filter((item) => !q || [item.title, item.summary, item.category, ...(item.tags || [])].join(" ").toLowerCase().includes(q))
      .filter((item) => !filters.status || item.review_status === filters.status)
      .filter((item) => !filters.category || item.category === filters.category)
      .filter((item) => !filters.tag || (item.tags || []).includes(filters.tag))
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .map(view);
    return { items, total: items.length };
  }

  function get(id) {
    const item = read().find((document) => document.id === id);
    return item ? view(item) : null;
  }

  function create(payload, actor) {
    const title = String(payload.title || "").trim();
    if (!title) throw new Error("title is required");
    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(), title, summary: String(payload.summary || "").trim(),
      category: String(payload.category || "\u672a\u5206\u7c7b").trim() || "\u672a\u5206\u7c7b",
      tags: tags(payload.tags), review_status: status(payload.review_status),
      created_by: actor, created_at: now, updated_at: now, file: null,
    };
    const items = read();
    items.push(item);
    write(items);
    return view(item);
  }

  function update(id, payload, actor) {
    const items = read();
    const index = find(items, id);
    if (index < 0) return null;
    const current = items[index];
    const title = payload.title === undefined ? current.title : String(payload.title).trim();
    if (!title) throw new Error("title is required");
    items[index] = {
      ...current, title,
      summary: payload.summary === undefined ? current.summary : String(payload.summary).trim(),
      category: payload.category === undefined ? current.category : (String(payload.category).trim() || "\u672a\u5206\u7c7b"),
      tags: payload.tags === undefined ? current.tags : tags(payload.tags),
      review_status: payload.review_status === undefined ? current.review_status : status(payload.review_status),
      updated_by: actor, updated_at: new Date().toISOString(),
    };
    write(items);
    return view(items[index]);
  }

  function attachFile(id, file, actor) {
    const items = read();
    const index = find(items, id);
    if (index < 0) return null;
    const name = (path.basename(String(file.name || "document.bin")).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 180) || "document.bin");
    const directory = path.join(uploadRoot, id);
    fs.mkdirSync(directory, { recursive: true });
    const storedName = `${Date.now()}-${name}`;
    fs.writeFileSync(path.join(directory, storedName), file.buffer);
    items[index] = {
      ...items[index],
      file: { name, stored_name: storedName, type: String(file.type || "application/octet-stream"), size: file.buffer.length, uploaded_at: new Date().toISOString() },
      updated_by: actor, updated_at: new Date().toISOString(),
    };
    write(items);
    return view(items[index]);
  }

  function getFile(id) {
    const item = read().find((document) => document.id === id);
    if (!item?.file) return null;
    const directory = path.join(uploadRoot, id);
    const filePath = path.join(directory, item.file.stored_name);
    if (!filePath.startsWith(directory) || !fs.existsSync(filePath)) return null;
    return { ...item.file, path: filePath };
  }

  function facets() {
    const items = read();
    return {
      categories: [...new Set(items.map((item) => item.category).filter(Boolean))].sort(),
      tags: [...new Set(items.flatMap((item) => item.tags || []))].sort(),
      statuses: [...STATUSES],
    };
  }

  ensure();
  return { list, get, create, update, attachFile, getFile, facets };
}

module.exports = { createDocumentsStore };
