const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DEFAULT_DIMENSIONS = 384;
const MODES = new Set(["keyword", "vector", "hybrid"]);

function tokenize(value) {
  const text = String(value || "").toLowerCase().normalize("NFKC");
  const latin = text.match(/[a-z0-9]+/g) || [];
  const chineseRuns = text.match(/[\u4e00-\u9fff]+/g) || [];
  const chinese = [];
  chineseRuns.forEach((run) => {
    for (const character of run) chinese.push(character);
    for (let index = 0; index < run.length - 1; index += 1) chinese.push(run.slice(index, index + 2));
    for (let index = 0; index < run.length - 2; index += 1) chinese.push(run.slice(index, index + 3));
  });
  return [...latin, ...chinese];
}

function hashToken(token) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeVector(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

function localEmbedding(text, dimensions = DEFAULT_DIMENSIONS) {
  const vector = new Array(dimensions).fill(0);
  const frequencies = new Map();
  tokenize(text).forEach((token) => frequencies.set(token, (frequencies.get(token) || 0) + 1));
  frequencies.forEach((frequency, token) => {
    const hash = hashToken(token);
    const index = hash % dimensions;
    const sign = (hash & 0x80000000) === 0 ? 1 : -1;
    vector[index] += sign * (1 + Math.log(frequency));
  });
  return normalizeVector(vector);
}

function cosine(left, right) {
  let score = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) score += left[index] * right[index];
  return score;
}

function createEmbeddingProvider(config = {}) {
  const provider = String(config.provider || process.env.EMBEDDING_PROVIDER || "local").toLowerCase();
  const dimensions = Number(config.dimensions || process.env.EMBEDDING_DIMENSIONS || DEFAULT_DIMENSIONS);
  const apiUrl = config.apiUrl || process.env.EMBEDDING_API_URL || "";
  const apiKey = config.apiKey || process.env.EMBEDDING_API_KEY || "";
  const model = config.model || process.env.EMBEDDING_MODEL || "text-embedding-3-small";

  if (provider === "openai_compatible") {
    if (!apiUrl) throw new Error("EMBEDDING_API_URL is required for openai_compatible provider");
    return {
      name: provider,
      model,
      dimensions,
      async embed(inputs) {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ model, input: inputs, dimensions }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message || payload.message || `embedding request failed: ${response.status}`);
        return [...payload.data].sort((a, b) => a.index - b.index).map((item) => normalizeVector(item.embedding));
      },
    };
  }

  return {
    name: "local_feature_hash",
    model: "feature-hash-v1",
    dimensions,
    async embed(inputs) {
      return inputs.map((input) => localEmbedding(input, dimensions));
    },
  };
}

function fingerprintChunks(chunks, provider) {
  const hash = crypto.createHash("sha256");
  hash.update(`${provider.name}:${provider.model}:${provider.dimensions}\n`);
  chunks.forEach((chunk) => hash.update(`${chunk.chunk_id}\u0000${chunk.title}\u0000${chunk.content}\u0000${(chunk.keywords || []).join("|")}\n`));
  return hash.digest("hex");
}

function chunkText(chunk) {
  return [chunk.title, ...(chunk.keywords || []), chunk.content].filter(Boolean).join("\n");
}

function weightedTokens(chunk) {
  return [
    ...tokenize(chunk.title),
    ...tokenize(chunk.title),
    ...tokenize((chunk.keywords || []).join(" ")),
    ...tokenize((chunk.keywords || []).join(" ")),
    ...tokenize(chunk.content),
  ];
}

function normalizeScores(rows, key) {
  const values = rows.map((row) => row[key]);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  rows.forEach((row) => { row[`${key}_normalized`] = (row[key] - min) / range; });
}

function createSearchEngine(options = {}) {
  const indexPath = options.indexPath || path.join(options.root || __dirname, "data", "search_index.json");
  const provider = createEmbeddingProvider(options.embedding);
  let index = null;
  let buildPromise = null;

  async function embedBatches(texts, batchSize = 24) {
    const vectors = [];
    for (let offset = 0; offset < texts.length; offset += batchSize) {
      const batch = texts.slice(offset, offset + batchSize).map((text) => text.slice(0, 12000));
      vectors.push(...await provider.embed(batch));
    }
    return vectors;
  }

  async function build(kb, force = false) {
    const chunks = kb.chunks || [];
    const fingerprint = fingerprintChunks(chunks, provider);
    if (!force && index?.fingerprint === fingerprint) return status();
    if (!force && fs.existsSync(indexPath)) {
      try {
        const cached = JSON.parse(fs.readFileSync(indexPath, "utf8"));
        if (cached.fingerprint === fingerprint) {
          index = cached;
          return status();
        }
      } catch (_) {
        // A corrupt cache is rebuilt from source chunks.
      }
    }

    const documentFrequency = {};
    const documents = chunks.map((chunk) => {
      const tokens = weightedTokens(chunk);
      const termFrequency = {};
      tokens.forEach((token) => { termFrequency[token] = (termFrequency[token] || 0) + 1; });
      Object.keys(termFrequency).forEach((token) => { documentFrequency[token] = (documentFrequency[token] || 0) + 1; });
      return {
        chunk_id: chunk.chunk_id,
        sku: chunk.sku,
        title: chunk.title,
        content: chunk.content,
        keywords: chunk.keywords || [],
        term_frequency: termFrequency,
        length: tokens.length,
      };
    });
    const vectors = await embedBatches(chunks.map(chunkText));
    documents.forEach((document, position) => { document.vector = vectors[position]; });
    index = {
      version: 1,
      fingerprint,
      built_at: new Date().toISOString(),
      provider: { name: provider.name, model: provider.model, dimensions: provider.dimensions },
      average_document_length: documents.reduce((sum, document) => sum + document.length, 0) / Math.max(documents.length, 1),
      document_frequency: documentFrequency,
      documents,
    };
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    fs.writeFileSync(indexPath, `${JSON.stringify(index)}\n`, "utf8");
    return status();
  }

  function ensureBuilt(kb, force = false) {
    if (!buildPromise || force) {
      buildPromise = build(kb, force).finally(() => { buildPromise = null; });
    }
    return buildPromise;
  }

  function keywordSearch(query, candidateLimit) {
    const queryTerms = [...new Set(tokenize(query))];
    const total = index.documents.length;
    const averageLength = index.average_document_length || 1;
    const k1 = 1.5;
    const b = 0.75;
    const rows = index.documents.map((document) => {
      let score = 0;
      const matchedTerms = [];
      queryTerms.forEach((term) => {
        const frequency = document.term_frequency[term] || 0;
        if (!frequency) return;
        matchedTerms.push(term);
        const documentFrequency = index.document_frequency[term] || 0;
        const idf = Math.log(1 + (total - documentFrequency + 0.5) / (documentFrequency + 0.5));
        score += idf * ((frequency * (k1 + 1)) / (frequency + k1 * (1 - b + b * document.length / averageLength)));
      });
      return { document, score, matchedTerms };
    }).filter((row) => row.score > 0).sort((a, bRow) => bRow.score - a.score).slice(0, candidateLimit);
    normalizeScores(rows, "score");
    return rows;
  }

  async function vectorSearch(query, candidateLimit) {
    const [queryVector] = await provider.embed([query]);
    const rows = index.documents.map((document) => ({ document, score: cosine(queryVector, document.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, candidateLimit);
    normalizeScores(rows, "score");
    return rows;
  }

  function rerank(query, candidates, productsBySku) {
    const queryText = String(query).toLowerCase();
    const queryTerms = [...new Set(tokenize(query))];
    const budgetMatch = queryText.match(/(\d{2,6})\s*(?:cny|rmb|yuan|\u5143)?/i);
    const budget = budgetMatch ? Number(budgetMatch[1]) : null;
    return candidates.map((candidate) => {
      const document = candidate.document;
      const product = productsBySku.get(document.sku);
      const title = String(document.title || "").toLowerCase();
      const body = `${title}\n${document.content}\n${document.keywords.join(" ")}`.toLowerCase();
      const matchedTerms = queryTerms.filter((term) => body.includes(term));
      const coverage = matchedTerms.length / Math.max(queryTerms.length, 1);
      const titleCoverage = queryTerms.filter((term) => title.includes(term)).length / Math.max(queryTerms.length, 1);
      const exactPhrase = queryText.length >= 2 && body.includes(queryText) ? 1 : 0;
      const skuExact = document.sku && queryText.includes(String(document.sku).toLowerCase()) ? 1 : 0;
      let businessScore = 0;
      const price = Number(product?.["\u4ef7\u683c"]);
      if (budget && Number.isFinite(price)) {
        if (price <= budget * 1.15) businessScore += 0.08;
        if (price > budget * 1.5) businessScore -= 0.06;
      }
      if (Number(product?.["\u5e93\u5b58"]) > 0) businessScore += 0.02;
      const rerankScore = candidate.fusion_score * 0.58 + coverage * 0.2 + titleCoverage * 0.1 + exactPhrase * 0.06 + skuExact * 0.12 + businessScore;
      return { ...candidate, product, matchedTerms, rerank_score: rerankScore };
    }).sort((left, right) => right.rerank_score - left.rerank_score);
  }

  async function search(kb, payload = {}) {
    const query = String(payload.query || payload.question || "").trim();
    if (!query) throw new Error("query is required");
    const mode = MODES.has(payload.mode) ? payload.mode : "hybrid";
    const limit = Math.min(50, Math.max(1, Number(payload.limit || 8)));
    const candidateLimit = Math.min(200, Math.max(limit * 6, 30));
    const startedAt = process.hrtime.bigint();
    await ensureBuilt(kb);
    const [keywordRows, vectorRows] = await Promise.all([
      mode === "vector" ? Promise.resolve([]) : Promise.resolve(keywordSearch(query, candidateLimit)),
      mode === "keyword" ? Promise.resolve([]) : vectorSearch(query, candidateLimit),
    ]);

    const candidates = new Map();
    const addRows = (rows, source, weight) => rows.forEach((row, rank) => {
      const current = candidates.get(row.document.chunk_id) || {
        document: row.document,
        keyword_score: 0,
        vector_score: 0,
        fusion_score: 0,
        rank_sources: [],
      };
      current[`${source}_score`] = row.score_normalized;
      current.fusion_score += weight / (60 + rank + 1);
      current.rank_sources.push({ source, rank: rank + 1, score: row.score });
      candidates.set(row.document.chunk_id, current);
    });
    addRows(keywordRows, "keyword", mode === "keyword" ? 1 : 0.55);
    addRows(vectorRows, "vector", mode === "vector" ? 1 : 0.45);
    const fusionRows = [...candidates.values()].sort((a, b) => b.fusion_score - a.fusion_score).slice(0, candidateLimit);
    normalizeScores(fusionRows, "fusion_score");
    fusionRows.forEach((row) => { row.fusion_score = row.fusion_score_normalized; });
    const productsBySku = new Map((kb.products || []).map((product) => [product.SKU, product]));
    const ranked = payload.rerank === false ? fusionRows : rerank(query, fusionRows, productsBySku);
    const hits = ranked.slice(0, limit).map((row, rank) => ({
      rank: rank + 1,
      chunk_id: row.document.chunk_id,
      sku: row.document.sku,
      title: row.document.title,
      content: row.document.content,
      keywords: row.document.keywords,
      product: row.product || productsBySku.get(row.document.sku),
      score: Math.max(0, Math.min(1, payload.rerank === false ? row.fusion_score : row.rerank_score)),
      scores: {
        keyword: row.keyword_score,
        vector: row.vector_score,
        fusion: row.fusion_score,
        rerank: row.rerank_score ?? row.fusion_score,
      },
      matched_terms: row.matchedTerms || [],
      rank_sources: row.rank_sources,
    }));
    return {
      query,
      mode,
      reranked: payload.rerank !== false,
      embedding_provider: index.provider,
      took_ms: Number(process.hrtime.bigint() - startedAt) / 1e6,
      candidate_count: candidates.size,
      hits,
    };
  }

  function status() {
    return {
      ready: Boolean(index),
      building: Boolean(buildPromise),
      index_path: indexPath,
      built_at: index?.built_at || null,
      document_count: index?.documents?.length || 0,
      term_count: index ? Object.keys(index.document_frequency).length : 0,
      embedding_provider: index?.provider || { name: provider.name, model: provider.model, dimensions: provider.dimensions },
    };
  }

  return { ensureBuilt, search, status };
}

module.exports = { createSearchEngine, tokenize };
