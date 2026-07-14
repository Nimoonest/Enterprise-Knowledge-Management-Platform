# 后端 API 层说明

当前项目已经从“前端直接读取 `data/products_kb.json`”升级为“前端调用后端 API”。

## 启动

```powershell
& 'C:\Users\倪商\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.js
```

默认端口：`5178`。

访问前端：

```text
http://localhost:5178
```

## 数据源

默认使用本地生成文件：

```text
data/products_kb.json
```

如果要让 API 优先从 MySQL `product_knowledge` 数据库读取，启动前设置：

```powershell
$env:EKMP_DATA_SOURCE='mysql'
$env:MYSQL_HOST='127.0.0.1'
$env:MYSQL_PORT='3306'
$env:MYSQL_USER='root'
$env:MYSQL_PASSWORD='你的密码'
$env:MYSQL_DATABASE='product_knowledge'
& 'C:\Users\倪商\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.js
```

如果 MySQL 读取失败，服务会自动回退到 `data/products_kb.json`，并在 `/api/kb` 的 `meta.mysql_fallback_error` 中显示失败原因。

## API

### 健康检查

```http
GET /api/health
```

返回商品数、知识分段数和当前数据源。

### 前端知识包

```http
GET /api/kb
```

返回前端 Demo 需要的完整知识数据。前端 `script.js` 已经改为调用这个接口。

### 商品列表

```http
GET /api/products?page=1&page_size=30&q=木质&in_stock=true&type=candle
```

支持分页、关键词、类型、有库存筛选。

### 商品详情

```http
GET /api/products/{sku}
```

例如：

```http
GET /api/products/34B600
```

### 知识分段

```http
GET /api/knowledge/chunks?sku=34B600&q=木质&limit=50
```

### 覆盖度统计

```http
GET /api/knowledge/coverage
```

返回商品主数据、描述、使用建议、搭配关系、图片资源、MaxKB 分段的覆盖度。

### 召回测试

```http
POST /api/retrieval/test
Content-Type: application/json

{
  "question": "木质香调 蜡烛 预算1000",
  "limit": 5
}
```

### AI 问答

```http
POST /api/chat
Content-Type: application/json

{
  "app_id": "5c9aab66-7aac-11f1-807c-fe3788870ed2",
  "app_name": "商品导购问答机器人",
  "message": "我想要木质香调的蜡烛，预算1000左右",
  "chat_id": null,
  "client_id": "浏览器会话ID"
}
```

该接口仍然统一调用现有 MaxKB 容器内的 `maxkb_call_app.py`。

## Document Center API

All document endpoints require an authenticated `ekmp_session` cookie.

```http
GET /api/admin/documents?q=&category=&tag=&status=
GET /api/admin/documents/{id}
GET /api/admin/document-facets
```

Create or update document metadata:

```http
POST /api/admin/documents
PATCH /api/admin/documents/{id}
Content-Type: application/json

{
  "title": "Operations handbook",
  "summary": "Platform operations reference",
  "category": "Operations",
  "tags": ["platform", "runbook"],
  "review_status": "pending_review"
}
```

Upload or download the original file:

```http
PUT /api/admin/documents/{id}/file
GET /api/admin/documents/{id}/file
```

Uploads are limited to 20 MB. In the current development configuration,
metadata is persisted in MySQL and attachment objects are persisted in the
private MinIO bucket `ekmp-documents`. Process restarts do not remove either
MySQL data or MinIO objects. Browsers download files through this authenticated
API instead of accessing MinIO directly.

Storage configuration, startup, migration, verification, and production
recommendations are documented in `DOCUMENT_STORAGE.md`.

## Search API

### Dify external knowledge retrieval

```http
POST /api/dify/retrieval
Authorization: Bearer ${DIFY_EXTERNAL_KB_API_KEY}
Content-Type: application/json

{
  "knowledge_id": "ekmp-product-kb",
  "query": "candle",
  "retrieval_setting": {
    "top_k": 4,
    "score_threshold": 0.2
  }
}
```

The response follows Dify''s external knowledge contract and returns a top-level
`records` array. Allowed knowledge IDs are configured with
`DIFY_EXTERNAL_KB_IDS`. Production exposure and Tunnel setup are documented in
`DEPLOYMENT_DIFY.md`.


Search status:

```http
GET /api/search/status
```

Keyword, vector, or hybrid retrieval:

```http
POST /api/search
Content-Type: application/json

{
  "query": "wood scented candle under 1000",
  "mode": "hybrid",
  "rerank": true,
  "limit": 5
}
```

Each hit includes separate scores for keyword retrieval, vector retrieval,
hybrid fusion, and reranking.

Rebuild the search index after normalized chunks change:

```http
POST /api/admin/search/rebuild
```

The rebuild endpoint requires an authenticated session. The generated
`data/search_index.json` cache is automatically reused after process restarts.

The legacy endpoint remains available and delegates to hybrid search:

```http
POST /api/retrieval/test
```

## Audit and Operations API

All audit endpoints require an authenticated session.

Aggregated dashboard data:

```http
GET /api/admin/analytics?days=7
```

Operation logs:

```http
GET /api/admin/audit/operations?page=1&page_size=30&q=&status=&action=&actor=
```

Search and Q&A interaction logs:

```http
GET /api/admin/audit/qa?page=1&page_size=30&q=&status=&type=
```

Supported interaction types are `search` and `chat`. Every interaction log
contains duration, evidence count, request status, and the quality dimensions
`relevance`, `groundedness`, `completeness`, and `reliability`.

The dashboard is available at:

```text
http://localhost:5178/operations.html
```
