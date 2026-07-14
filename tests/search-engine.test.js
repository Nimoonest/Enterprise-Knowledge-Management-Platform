const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { createSearchEngine } = require("../search-engine");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ekmp-search-"));
const kb = {
  products: [
    { SKU: "WOOD-1", "\u4ef7\u683c": 800, "\u5e93\u5b58": 5 },
    { SKU: "FLORAL-1", "\u4ef7\u683c": 600, "\u5e93\u5b58": 2 },
    { SKU: "DIFFUSER-1", "\u4ef7\u683c": 1200, "\u5e93\u5b58": 0 },
  ],
  chunks: [
    { chunk_id: "wood", sku: "WOOD-1", title: "\u6728\u8d28\u9999\u8c03\u8721\u70db WOOD-1", content: "\u6a61\u6728\u548c\u6c89\u9999\u6c14\u606f\uff0c\u9002\u5408\u5ba2\u5385", keywords: ["\u6728\u8d28", "\u8721\u70db"] },
    { chunk_id: "floral", sku: "FLORAL-1", title: "\u82b1\u9999\u8721\u70db FLORAL-1", content: "\u73ab\u7470\u548c\u8309\u8389\u9999\u6c14", keywords: ["\u82b1\u9999", "\u8721\u70db"] },
    { chunk_id: "diffuser", sku: "DIFFUSER-1", title: "\u5ba4\u5185\u6269\u9999 DIFFUSER-1", content: "\u957f\u65f6\u95f4\u5ba4\u5185\u6269\u9999", keywords: ["\u6269\u9999"] },
  ],
};

test.after(() => fs.rmSync(root, { recursive: true, force: true }));

test("builds an index and retrieves an exact SKU with BM25", async () => {
  const engine = createSearchEngine({ root });
  const result = await engine.search(kb, { query: "WOOD-1", mode: "keyword", limit: 2 });
  assert.equal(result.hits[0].sku, "WOOD-1");
  assert.equal(engine.status().document_count, 3);
  assert.ok(engine.status().term_count > 0);
});

test("supports vector and hybrid retrieval with explainable scores", async () => {
  const engine = createSearchEngine({ root });
  const vector = await engine.search(kb, { query: "\u6a61\u6728\u9999\u6c14", mode: "vector", limit: 2 });
  const hybrid = await engine.search(kb, { query: "\u6728\u8d28\u8721\u70db", mode: "hybrid", limit: 2 });
  assert.equal(vector.embedding_provider.name, "local_feature_hash");
  assert.equal(vector.hits[0].sku, "WOOD-1");
  assert.equal(hybrid.hits[0].sku, "WOOD-1");
  assert.deepEqual(Object.keys(hybrid.hits[0].scores), ["keyword", "vector", "fusion", "rerank"]);
});

test("can disable reranking and validates the query", async () => {
  const engine = createSearchEngine({ root });
  const result = await engine.search(kb, { query: "\u8721\u70db", mode: "hybrid", rerank: false });
  assert.equal(result.reranked, false);
  await assert.rejects(() => engine.search(kb, { query: "" }), /query is required/);
});
