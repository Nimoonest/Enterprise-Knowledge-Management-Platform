import argparse
import csv
import json
import re
from pathlib import Path

import pandas as pd


TEXT_COLUMNS = [
    "描述",
    "灵感来源",
    "使用建议",
    "产品特性",
    "制作工艺",
    "配方与质地",
    "产品成分",
    "详细说明",
    "编辑内容",
]

PRODUCT_COLUMNS = [
    "SKU",
    "名称",
    "副标题",
    "类型",
    "香调",
    "价格",
    "市场价",
    "库存",
    "状态",
    "是否刻字",
    "评论数",
    "所属分类",
    "图片数",
    "url_key",
    "详情页",
    *TEXT_COLUMNS,
]


def clean(value):
    if pd.isna(value):
        return ""
    text = str(value).replace("\r\n", "\n").replace("\r", "\n").strip()
    return re.sub(r"\n{3,}", "\n\n", text)


def as_int(value):
    text = clean(value)
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def as_decimal(value):
    text = clean(value)
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def split_lines(value):
    return [line.strip("- ").strip() for line in clean(value).splitlines() if line.strip()]


def safe_filename(name):
    return re.sub(r"[^0-9A-Za-z._-]+", "_", name).strip("_") or "products"


def read_sheet(path, sheet):
    return pd.read_excel(path, sheet_name=sheet, dtype=str).fillna("")


def product_summary(product):
    parts = [
        product.get("名称", ""),
        product.get("副标题", ""),
        product.get("类型", ""),
        product.get("香调", ""),
        product.get("描述", ""),
        product.get("产品特性", ""),
        product.get("使用建议", ""),
        product.get("详细说明", ""),
    ]
    text = "；".join([clean(part) for part in parts if clean(part)])
    return text[:500]


def build_products(info_df, relation_df, image_df, category_df):
    relations = {clean(row["SKU"]): row for row in relation_df.to_dict(orient="records")}
    images = {}
    for row in image_df.to_dict(orient="records"):
        sku = clean(row["SKU"])
        if sku:
            images.setdefault(sku, []).append(
                {
                    "sort_order": as_int(row.get("序号")) or len(images.get(sku, [])) + 1,
                    "url": clean(row.get("图片URL")),
                }
            )

    categories = {}
    for row in category_df.to_dict(orient="records"):
        sku = clean(row["SKU"])
        category = clean(row.get("所属分类(url_path)"))
        if sku and category:
            categories.setdefault(sku, []).append(category)

    products = []
    for raw in info_df.to_dict(orient="records"):
        sku = clean(raw.get("SKU"))
        if not sku:
            continue
        relation = relations.get(sku, {})
        product = {column: clean(raw.get(column)) for column in PRODUCT_COLUMNS}
        product["价格"] = as_decimal(raw.get("价格"))
        product["市场价"] = as_decimal(raw.get("市场价"))
        product["库存"] = as_int(raw.get("库存"))
        product["状态"] = as_int(raw.get("状态"))
        product["是否刻字"] = as_int(raw.get("是否刻字"))
        product["评论数"] = as_int(raw.get("评论数"))
        product["图片数"] = as_int(raw.get("图片数"))
        product["categories"] = categories.get(sku) or split_lines(raw.get("所属分类", "").replace("|", "\n"))
        product["images"] = sorted(images.get(sku, []), key=lambda item: item["sort_order"])
        product["pairing_suggestions"] = split_lines(relation.get("搭配产品建议", ""))
        product["related_products"] = split_lines(relation.get("相关产品", ""))
        product["cross_sell"] = split_lines(relation.get("交叉销售", ""))
        product["upgrade_recommendations"] = split_lines(relation.get("升级推荐", ""))
        product["search_text"] = product_summary(product)
        products.append(product)
    return products


def build_chunks(products):
    chunks = []
    for product in products:
        fields = [
            ("SKU", product["SKU"]),
            ("名称", product["名称"]),
            ("副标题/香味线索", product["副标题"]),
            ("类型", product["类型"]),
            ("香调", product["香调"]),
            ("价格", f"CNY {product['价格']:.0f}" if product["价格"] is not None else ""),
            ("库存", str(product["库存"]) if product["库存"] is not None else ""),
            ("分类", "、".join(product["categories"][:8])),
            ("详情页", product["详情页"]),
            ("描述", product["描述"]),
            ("灵感来源", product["灵感来源"]),
            ("使用建议", product["使用建议"]),
            ("产品特性", product["产品特性"]),
            ("制作工艺", product["制作工艺"]),
            ("配方与质地", product["配方与质地"]),
            ("产品成分", product["产品成分"]),
            ("详细说明", product["详细说明"]),
            ("搭配产品建议", "\n".join(product["pairing_suggestions"][:12])),
            ("相关产品", "\n".join(product["related_products"][:12])),
            ("交叉销售", "\n".join(product["cross_sell"][:8])),
            ("升级推荐", "\n".join(product["upgrade_recommendations"][:12])),
        ]
        content = "\n".join([f"{label}：{value}" for label, value in fields if value])
        chunks.append(
            {
                "chunk_id": f"product-{product['SKU']}",
                "sku": product["SKU"],
                "title": f"{product['名称']}（{product['SKU']}）",
                "content": content,
                "keywords": [
                    item
                    for item in [
                        product["SKU"],
                        product["名称"],
                        product["副标题"],
                        product["类型"],
                        product["香调"],
                        *product["categories"][:5],
                    ]
                    if item
                ],
            }
        )
    return chunks


def write_csv(path, rows, columns):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_outputs(products, chunks, output_dir):
    data_dir = output_dir / "data"
    db_dir = output_dir / "db"
    sources_dir = output_dir / "sources"
    data_dir.mkdir(exist_ok=True)
    db_dir.mkdir(exist_ok=True)
    sources_dir.mkdir(exist_ok=True)

    product_rows = []
    relation_rows = []
    image_rows = []
    category_rows = []
    chunk_rows = []
    for product in products:
        product_rows.append(
            {
                "sku": product["SKU"],
                "name": product["名称"],
                "subtitle": product["副标题"],
                "product_type": product["类型"],
                "scent": product["香调"],
                "price": product["价格"],
                "market_price": product["市场价"],
                "stock": product["库存"],
                "status": product["状态"],
                "engraving_available": product["是否刻字"],
                "review_count": product["评论数"],
                "category_path": product["所属分类"],
                "image_count": product["图片数"],
                "url_key": product["url_key"],
                "detail_url": product["详情页"],
                "description": product["描述"],
                "inspiration": product["灵感来源"],
                "usage_advice": product["使用建议"],
                "features": product["产品特性"],
                "craft": product["制作工艺"],
                "formula_texture": product["配方与质地"],
                "ingredients": product["产品成分"],
                "details": product["详细说明"],
                "editorial_content": product["编辑内容"],
            }
        )
        for relation_type, values in [
            ("pairing", product["pairing_suggestions"]),
            ("related", product["related_products"]),
            ("cross_sell", product["cross_sell"]),
            ("upgrade", product["upgrade_recommendations"]),
        ]:
            for index, value in enumerate(values, 1):
                relation_rows.append(
                    {
                        "sku": product["SKU"],
                        "relation_type": relation_type,
                        "sort_order": index,
                        "related_text": value,
                    }
                )
        for image in product["images"]:
            image_rows.append({"sku": product["SKU"], **image})
        for index, category in enumerate(product["categories"], 1):
            category_rows.append({"sku": product["SKU"], "sort_order": index, "category_path": category})

    for chunk in chunks:
        chunk_rows.append(
            {
                "chunk_id": chunk["chunk_id"],
                "sku": chunk["sku"],
                "title": chunk["title"],
                "content": chunk["content"],
                "keywords": json.dumps(chunk["keywords"], ensure_ascii=False),
            }
        )

    write_csv(db_dir / "products.csv", product_rows, list(product_rows[0].keys()))
    write_csv(db_dir / "product_relations.csv", relation_rows, ["sku", "relation_type", "sort_order", "related_text"])
    write_csv(db_dir / "product_images.csv", image_rows, ["sku", "sort_order", "url"])
    write_csv(db_dir / "product_categories.csv", category_rows, ["sku", "sort_order", "category_path"])
    write_csv(db_dir / "product_knowledge_chunks.csv", chunk_rows, ["chunk_id", "sku", "title", "content", "keywords"])

    payload = {
        "meta": {
            "source": "C:/Users/倪商/Desktop/products_v2.xlsx",
            "product_count": len(products),
            "chunk_count": len(chunks),
        },
        "products": products,
        "chunks": chunks,
    }
    (data_dir / "products_kb.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (data_dir / "maxkb_product_chunks.jsonl").write_text(
        "\n".join(json.dumps(chunk, ensure_ascii=False) for chunk in chunks) + "\n",
        encoding="utf-8",
    )

    md_lines = [
        "# 商品导购知识库",
        "",
        f"- 商品数：{len(products)}",
        f"- MaxKB 分段数：{len(chunks)}",
        "- 来源：products_v2.xlsx",
        "",
        "## 导购回答规则",
        "",
        "- 根据用户描述的香味、品类、预算、使用场景、送礼对象、库存和搭配需求推荐商品。",
        "- 回答应优先引用商品名称、SKU、价格、香味/副标题、核心描述、使用建议、搭配产品和详情页。",
        "- 当用户询问某个香味或某类产品时，先给 2-4 个最相关选项，再说明推荐理由和差异。",
        "- 当知识库缺少用户要求的信息时，明确说明未收录，不编造功效、库存、价格或链接。",
        "",
        "## 商品分段",
        "",
    ]
    for chunk in chunks:
        md_lines.extend([f"### {chunk['title']}", "", chunk["content"], ""])
    (sources_dir / "product-guide-knowledge.md").write_text("\n".join(md_lines), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Build product SQL/MaxKB/frontend knowledge assets from products_v2.xlsx.")
    parser.add_argument("--excel", default=r"C:\Users\倪商\Desktop\products_v2.xlsx")
    parser.add_argument("--output", default=".")
    args = parser.parse_args()

    excel = Path(args.excel)
    output = Path(args.output)
    info_df = read_sheet(excel, "商品信息")
    relation_df = read_sheet(excel, "搭配与关联")
    image_df = read_sheet(excel, "图片")
    category_df = read_sheet(excel, "分类映射")
    products = build_products(info_df, relation_df, image_df, category_df)
    chunks = build_chunks(products)
    write_outputs(products, chunks, output)
    print(json.dumps({"products": len(products), "chunks": len(chunks)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
