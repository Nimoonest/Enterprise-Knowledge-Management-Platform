# 企业信息与新员工入门

## 平台产品地图

当前 Demo 是商品知识管理与 AI 导购平台，数据源来自 `C:\Users\倪商\Desktop\products_v2.xlsx`。平台能力包括商品知识库、知识覆盖、AI 商品导购、召回测试和知识溯源。

## 新员工熟悉路径

1. 先查看 `db/schema.sql`，理解商品主表、分类、图片、关联关系和知识分段的结构化存储方式。
2. 查看 `tools/build_product_kb.py`，理解 Excel 如何转换为 MySQL CSV、前端 JSON 和 MaxKB Markdown/JSONL。
3. 查看 `sources/product-guide-knowledge.md`，理解 MaxKB 将要索引的商品导购知识分段。
4. 启动 `node server.js`，在知识模拟模块测试用户按香味、品类、预算、送礼场景和具体商品名称提问。

## 回答边界

AI 导购只能基于 Excel 已收录的商品名称、SKU、价格、库存、描述、使用建议、搭配关系和详情页回答。知识库未收录的信息应明确说明未收录，不编造功效、库存、价格或商品链接。
