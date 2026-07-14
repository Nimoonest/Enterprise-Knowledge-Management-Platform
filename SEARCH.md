# Search Architecture

The search layer is implemented in `search-engine.js` and is independent from
the document parsing pipeline. It consumes the normalized `kb.chunks` contract:

```json
{
  "chunk_id": "unique-id",
  "sku": "optional-business-id",
  "title": "chunk title",
  "content": "chunk content",
  "keywords": ["tag", "category"]
}
```

## Retrieval stages

1. Keyword retrieval uses BM25. Titles and keywords receive additional term
   weight when the index is built.
2. Vector retrieval calculates cosine similarity against the persisted vector
   index.
3. Hybrid retrieval merges both ranked lists with weighted Reciprocal Rank
   Fusion (BM25 0.55, vector 0.45).
4. Reranking combines fusion score, query-term coverage, title coverage, exact
   phrase/SKU matches, budget fit, and inventory availability.
5. Every hit returns `keyword`, `vector`, `fusion`, and `rerank` scores so the
   ranking can be inspected from the frontend or logs.

The generated cache is `data/search_index.json`. It is ignored by Git and is
automatically rebuilt when the chunk fingerprint or embedding provider changes.

## Embedding providers

The default provider is `local_feature_hash`. It is deterministic, requires no
external service, and makes vector retrieval testable now. It is a lexical
feature vector, not a full semantic model.

To use a real OpenAI-compatible embedding service:

```powershell
$env:EMBEDDING_PROVIDER='openai_compatible'
$env:EMBEDDING_API_URL='http://embedding-service/v1/embeddings'
$env:EMBEDDING_API_KEY='replace-me'
$env:EMBEDDING_MODEL='your-embedding-model'
$env:EMBEDDING_DIMENSIONS='1024'
```

Restart the API and rebuild the index. The search API and frontend do not need
to change.

## APIs

```http
GET  /api/search/status
POST /api/search
POST /api/admin/search/rebuild
```

Example search request:

```json
{
  "query": "wood scented candle under 1000",
  "mode": "hybrid",
  "rerank": true,
  "limit": 5
}
```

`POST /api/admin/search/rebuild` requires an authenticated admin or operator
session. The existing `POST /api/retrieval/test` endpoint now delegates to the
same hybrid engine for backward compatibility.

## Pipeline boundary

The parser owned by the ingestion team only needs to publish the normalized
chunk contract. Search-index synchronization is then triggered through the
authenticated rebuild endpoint. MaxKB submission can consume the same chunks,
so parser output does not need separate search-specific formatting.
