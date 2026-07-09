# 本地运维手册

## MaxKB 服务

- 地址：http://localhost:8080
- 容器名：maxkb
- WSL 发行版：Ubuntu-22.04
- 商品导购应用名称：商品导购问答机器人

常用命令：

```powershell
wsl -d Ubuntu-22.04 -u root -- docker ps
wsl -d Ubuntu-22.04 -u root -- docker logs -f maxkb
wsl -d Ubuntu-22.04 -u root -- docker restart maxkb
```

## MySQL 商品库

推荐数据库名：`product_knowledge`。

```powershell
python tools/build_product_kb.py --excel C:\Users\倪商\Desktop\products_v2.xlsx --output .
mysql --local-infile=1 -uroot -p < db/schema.sql
mysql --local-infile=1 -uroot -p product_knowledge < db/load_data.sql
```

当前仓库已生成 `db/products.csv`、`db/product_categories.csv`、`db/product_images.csv`、`db/product_relations.csv`、`db/product_knowledge_chunks.csv`。

## MaxKB 知识导入

把 `sources/product-guide-knowledge.md` 导入 MaxKB 新知识库，并创建名为“商品导购问答机器人”的应用。应用提示词建议要求：

- 只根据商品知识库回答。
- 用户问香味、品类、预算、送礼、使用场景时，推荐 2-4 个商品并说明理由。
- 用户问具体商品时，返回名称、SKU、价格、香味/副标题、描述、使用建议、搭配关系和详情页。
- 未收录的信息要说明未收录，不编造。

## 前端代理

- 目录：D:\Enterprise-Knowledge-Management-Platform
- 地址：http://localhost:5178
- 启动命令：`node server.js`

前端请求 `/api/chat`，由 Node 代理调用 WSL Docker 容器中的 Python 脚本，再访问 MaxKB 应用。若 MaxKB 应用尚未创建或调用失败，前端会使用 `data/products_kb.json` 做本地检索兜底。
