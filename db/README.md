# 商品知识库 MySQL 导入

本目录由 `tools/build_product_kb.py` 生成 CSV，并提供 MySQL 结构化存储方案。

## 表设计

- `products`：商品主表，保留 Excel 的商品字段和全文索引。
- `product_categories`：一个 SKU 多个分类路径。
- `product_images`：商品图片 URL。
- `product_relations`：搭配建议、相关产品、交叉销售、升级推荐。
- `product_knowledge_chunks`：面向 MaxKB/RAG 的商品知识分段。

## 命令行导入

如果知道 `root@localhost:3306` 的正确密码，可在仓库根目录运行：

```powershell
.\tools\import_mysql.ps1
```

脚本会创建 `product_knowledge` 数据库，导入 `db/*.csv`，并输出 5 张表的行数。

## MySQL Workbench 导入

如果 Workbench 已保存连接但你不确定命令行密码：

1. 打开 MySQL Workbench。
2. 双击 `Local instance MySQL80`。
3. 打开文件 `D:\Enterprise-Knowledge-Management-Platform\db\workbench_import.sql`。
4. 点击执行全部 SQL。
5. 末尾会输出以下行数校验查询：
   - `products` 应为 370
   - `product_knowledge_chunks` 应为 370
   - `product_categories`、`product_images`、`product_relations` 应有对应 Excel 派生数据

## 重新生成数据

Excel 更新后，在仓库根目录运行：

```powershell
& 'C:\Users\倪商\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' tools\build_product_kb.py --excel C:\Users\倪商\Desktop\products_v2.xlsx --output .
```
