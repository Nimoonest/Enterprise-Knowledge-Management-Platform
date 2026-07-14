# Audit and Operations Architecture

The audit layer is implemented in `audit-store.js`. It persists append-only
JSON Lines records under `data/audit/` and survives API process restarts.

## Event types

Operation events capture administrative activity:

- authentication login/logout and failed login attempts;
- document creation, metadata updates, file upload, and download;
- search-index rebuild success or failure.

Interaction events capture user-facing retrieval activity:

- `search`: query, retrieval mode, candidates, evidence, latency, and quality;
- `chat`: question, answer, MaxKB application/chat identifiers, evidence,
  latency, quality, and failure details.

Passwords, session cookies, API keys, and uploaded file contents are never
written to audit metadata.

## Quality score

Each interaction receives a 0-100 quality object with these dimensions:

- relevance: retrieval evidence scores;
- groundedness: evidence presence, count, and confidence;
- completeness: answer completeness based on available response content;
- reliability: request success, partial success, or failure.

The overall score uses the following weights:

```text
relevance 35% + groundedness 30% + completeness 20% + reliability 15%
```

Risk flags identify empty answers, missing evidence, low retrieval confidence,
and failed requests. This is a deterministic operational score, not an LLM
judge. A model-based evaluator can be added later without changing log APIs.

## APIs

All endpoints require an authenticated backend session:

```http
GET /api/admin/analytics?days=7
GET /api/admin/audit/operations?page=1&page_size=30&q=&status=
GET /api/admin/audit/qa?page=1&page_size=30&q=&status=&type=
```

The analytics endpoint returns metrics, daily trends, action and channel
distributions, quality bands, top queries, and recent activity.

## Security and storage

Runtime files are:

```text
data/audit/operations.jsonl
data/audit/interactions.jsonl
```

They are ignored by Git and blocked by the static file server. Access is only
available through authenticated APIs. JSONL is suitable for the current demo;
production deployment should move this contract to MySQL/ClickHouse or an audit
service and add retention, field masking, export controls, and immutable storage.
