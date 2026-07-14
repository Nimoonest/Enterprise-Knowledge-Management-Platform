const crypto = require("crypto");

function parseKnowledgeIds(value = "ekmp-product-kb") {
  return new Set(String(value).split(",").map((item) => item.trim()).filter(Boolean));
}

function loadDifyConfig(env = process.env) {
  return {
    apiKey: String(env.DIFY_EXTERNAL_KB_API_KEY || ""),
    knowledgeIds: parseKnowledgeIds(env.DIFY_EXTERNAL_KB_IDS),
  };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function authorizeDify(header, config) {
  if (!config.apiKey) return { ok: false, status: 503, error_code: 1003, error_msg: "External knowledge API is not configured." };
  const match = String(header || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false, status: 401, error_code: 1001, error_msg: "Invalid Authorization header format." };
  if (!safeEqual(match[1].trim(), config.apiKey)) return { ok: false, status: 401, error_code: 1002, error_msg: "Authorization failed." };
  return { ok: true };
}

function validateRequest(payload, config) {
  const knowledgeId = String(payload?.knowledge_id || "").trim();
  const query = String(payload?.query || "").trim();
  if (!knowledgeId) return { ok: false, status: 400, error_code: 2000, error_msg: "knowledge_id is required." };
  if (!config.knowledgeIds.has(knowledgeId)) return { ok: false, status: 404, error_code: 2001, error_msg: "Knowledge base not found." };
  if (!query) return { ok: false, status: 400, error_code: 2002, error_msg: "query is required." };

  const settings = payload.retrieval_setting || {};
  const topKValue = Number(settings.top_k);
  const thresholdValue = Number(settings.score_threshold);
  const topK = Number.isFinite(topKValue) ? Math.min(50, Math.max(1, Math.trunc(topKValue))) : 4;
  const scoreThreshold = Number.isFinite(thresholdValue) ? Math.min(1, Math.max(0, thresholdValue)) : 0;
  return { ok: true, knowledgeId, query, topK, scoreThreshold };
}

function toDifyRecord(hit) {
  return {
    content: String(hit.content || ""),
    score: Math.max(0, Math.min(1, Number(hit.score) || 0)),
    title: String(hit.title || "Untitled"),
    metadata: {
      chunk_id: String(hit.chunk_id || ""),
      ...(hit.sku ? { sku: String(hit.sku) } : {}),
      keywords: Array.isArray(hit.keywords) ? hit.keywords : [],
      scores: hit.scores && typeof hit.scores === "object" ? hit.scores : {},
    },
  };
}

async function retrieveForDify({ payload, config, search, kb }) {
  const input = validateRequest(payload, config);
  if (!input.ok) return input;
  const result = await search(kb, {
    query: input.query,
    mode: "hybrid",
    rerank: true,
    limit: Math.min(50, Math.max(input.topK, input.topK * 4)),
  });
  const records = result.hits
    .map(toDifyRecord)
    .filter((record) => record.content && record.score >= input.scoreThreshold)
    .slice(0, input.topK);
  return { ok: true, status: 200, records, result, input };
}

module.exports = { authorizeDify, loadDifyConfig, retrieveForDify, toDifyRecord, validateRequest };
