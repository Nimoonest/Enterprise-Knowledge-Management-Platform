# 项目索引与跨项目协作

## 当前项目

- 项目名称：Enterprise Knowledge Management Platform Demo
- 本地前端目录：D:\Enterprise-Knowledge-Management-Platform
- GitHub 仓库：git@github.com:Nimoonest/Enterprise-Knowledge-Management-Platform.git
- 前端入口：http://localhost:5178
- MaxKB 入口：http://localhost:8080
- Excel 数据源：C:\Users\倪商\Desktop\products_v2.xlsx

## 核心源码

- `index.html`：商品知识平台页面结构和知识模拟入口。
- `styles.css`：页面布局和模块样式。
- `script.js`：商品知识库看板、召回测试、本地导购兜底和 MaxKB 调用。
- `server.js`：本地 Node 代理，提供静态文件和 `/api/chat`。
- `maxkb_call_app.py`：调用 MaxKB 容器内应用的脚本。
- `tools/build_product_kb.py`：Excel 转 MySQL CSV、前端 JSON、MaxKB Markdown/JSONL 的生成器。
- `db/schema.sql`：MySQL 结构化存储建表脚本。

## 知识资产

- `data/products_kb.json`：前端商品知识数据。
- `data/maxkb_product_chunks.jsonl`：MaxKB/其他 RAG 系统可消费的 JSONL 分段。
- `sources/product-guide-knowledge.md`：可直接导入 MaxKB 知识库的 Markdown 文档。
- `db/*.csv`：MySQL `LOAD DATA LOCAL INFILE` 导入文件。
