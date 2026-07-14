const assert = require("node:assert/strict");
const test = require("node:test");

const { authorizeDify, loadDifyConfig, retrieveForDify, validateRequest } = require("../dify-retrieval");

const config = loadDifyConfig({ DIFY_EXTERNAL_KB_API_KEY: "test-secret", DIFY_EXTERNAL_KB_IDS: "kb-main,kb-secondary" });

test("validates the Dify bearer token without accepting malformed credentials", () => {
  assert.equal(authorizeDify("Bearer test-secret", config).ok, true);
  assert.equal(authorizeDify("test-secret", config).error_code, 1001);
  assert.equal(authorizeDify("Bearer wrong", config).error_code, 1002);
  assert.equal(authorizeDify("Bearer test-secret", loadDifyConfig({})).status, 503);
});

test("validates knowledge ids and normalizes retrieval settings", () => {
  assert.equal(validateRequest({ knowledge_id: "missing", query: "hello", retrieval_setting: {} }, config).error_code, 2001);
  const input = validateRequest({ knowledge_id: "kb-main", query: "hello", retrieval_setting: { top_k: 100, score_threshold: 2 } }, config);
  assert.deepEqual({ topK: input.topK, threshold: input.scoreThreshold }, { topK: 50, threshold: 1 });
});

test("adapts hybrid search hits to the Dify records contract", async () => {
  let searchPayload;
  const response = await retrieveForDify({
    payload: { knowledge_id: "kb-main", query: "wood candle", retrieval_setting: { top_k: 2, score_threshold: 0.5 } },
    config,
    kb: { chunks: [] },
    search: async (_kb, payload) => {
      searchPayload = payload;
      return {
        hits: [
          { chunk_id: "c1", sku: "WOOD-1", title: "Wood", content: "Oak candle", score: 0.9, keywords: ["wood"], scores: { rerank: 0.9 } },
          { chunk_id: "c2", title: "Weak", content: "Low score", score: 0.3 },
        ],
      };
    },
  });
  assert.deepEqual(searchPayload, { query: "wood candle", mode: "hybrid", rerank: true, limit: 8 });
  assert.equal(response.records.length, 1);
  assert.deepEqual(response.records[0], {
    content: "Oak candle",
    score: 0.9,
    title: "Wood",
    metadata: { chunk_id: "c1", sku: "WOOD-1", keywords: ["wood"], scores: { rerank: 0.9 } },
  });
});
