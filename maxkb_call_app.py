import json
import os
import re
import sys
import uuid

os.chdir("/opt/maxkb/app")
sys.path.insert(0, "/opt/maxkb/app/apps")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartdoc.settings")

import django

django.setup()

from application.models import Application, ApplicationDatasetMapping
from dataset.models import Paragraph


def tokens(text):
    text = text or ""
    words = set(item.lower() for item in re.findall(r"[\w\u4e00-\u9fff]+", text))
    try:
        import jieba
        words.update(item.lower() for item in jieba.cut_for_search(text) if item.strip())
    except Exception:
        pass
    return list(words)


def field(content, name):
    match = re.search(rf"^{re.escape(name)}：(.+)$", content or "", re.MULTILINE)
    return match.group(1).strip() if match else ""


def clip(text, limit=260):
    text = re.sub(r"\s+", " ", text or "").strip()
    return text[:limit] + ("..." if len(text) > limit else "")


def normalize_identity(text):
    return re.sub(r"[^\w\u4e00-\u9fff]+", "", text or "").lower()


def is_price_query(message):
    return any(keyword in (message or "") for keyword in ["价格", "多少钱", "售价", "价钱", "几钱", "多少元"])


def product_identity_score(message, paragraph):
    msg = normalize_identity(message)
    content = paragraph.content or ""
    name = field(content, "名称") or (paragraph.title or "")
    sku = field(content, "SKU")
    normalized_name = normalize_identity(name)
    normalized_sku = normalize_identity(sku)
    score = 0
    if normalized_sku and normalized_sku in msg:
        score += 120
    if normalized_name and normalized_name in msg:
        score += 100
    if normalized_name:
        name_parts = [part for part in tokens(name) if len(part) > 1]
        matched_parts = [part for part in name_parts if part in msg]
        score += len(matched_parts) * 10
    return score


def paragraph_score(message, paragraph):
    content = paragraph.content or ""
    haystack = f"{paragraph.title or ''}\n{content}".lower()
    score = product_identity_score(message, paragraph)
    for token in tokens(message):
        if len(token) <= 1:
            continue
        if token in (paragraph.title or "").lower():
            score += 8
        if token in haystack:
            score += 3

    for phrase in re.findall(r"[\u4e00-\u9fffA-Za-z0-9]+(?:[-·][\u4e00-\u9fffA-Za-z0-9]+)+", message or ""):
        if phrase.lower() in haystack:
            score += 12
    return score


def build_price_answer(paragraph):
    content = paragraph.content or ""
    name = field(content, "名称") or (paragraph.title or "该商品")
    sku = field(content, "SKU")
    price = field(content, "价格")
    detail_url = field(content, "详情页")
    if price:
        parts = [f"{name}的价格是 {price}"]
    else:
        parts = [f"我在 MaxKB 商品导购知识库里找到了{name}，但当前知识里没有记录价格"]
    if sku:
        parts.append(f"SKU：{sku}")
    if detail_url:
        parts.append(f"详情页：{detail_url}")
    return "。".join(parts) + "。"


def build_answer(message, paragraphs):
    if paragraphs and is_price_query(message):
        return build_price_answer(paragraphs[0])

    if not paragraphs:
        return "我已经连接到 MaxKB 商品导购知识库，但没有找到足够匹配的商品。你可以换一个香调、产品名、SKU 或使用场景再问我。"

    lines = ["我从 MaxKB 商品导购知识库里找到了这些相关商品："]
    for index, paragraph in enumerate(paragraphs[:3], 1):
        content = paragraph.content or ""
        name = field(content, "名称") or (paragraph.title or "未命名商品")
        sku = field(content, "SKU")
        price = field(content, "价格")
        scent = field(content, "副标题/香味线索")
        product_type = field(content, "类型")
        description = field(content, "描述")
        details = "；".join(part for part in [sku and f"SKU {sku}", price, scent, product_type] if part)
        lines.append(f"{index}. {name}" + (f"（{details}）" if details else ""))
        if description:
            lines.append(f"   推荐理由：{clip(description, 180)}")

    top_content = paragraphs[0].content or ""
    usage = field(top_content, "使用建议")
    pairing = field(top_content, "搭配产品建议")
    if usage:
        lines.append(f"使用建议：{clip(usage, 220)}")
    if pairing:
        lines.append(f"搭配建议：{clip(pairing, 220)}")
    lines.append("以上结果来自当前绑定的 MaxKB 应用和商品导购知识库。")
    return "\n".join(lines)


def main():
    payload = json.loads(sys.stdin.read())
    app_id = payload.get("app_id")
    app_name = payload.get("app_name")
    message = payload["message"]
    chat_id = payload.get("chat_id") or str(uuid.uuid1())
    client_id = payload.get("client_id") or str(uuid.uuid1())

    app = Application.objects.get(id=app_id) if app_id else Application.objects.get(name=app_name)
    dataset_ids = list(
        ApplicationDatasetMapping.objects.filter(application_id=app.id).values_list("dataset_id", flat=True)
    )
    candidates = list(
        Paragraph.objects.filter(dataset_id__in=dataset_ids, is_active=True)
        .select_related("dataset", "document")
        .only("id", "title", "content", "dataset", "document")
    )
    ranked = sorted(
        ((paragraph_score(message, paragraph), paragraph) for paragraph in candidates),
        key=lambda item: item[0],
        reverse=True,
    )
    selected = [paragraph for score, paragraph in ranked if score > 0][:5] or [paragraph for _, paragraph in ranked[:5]]
    traces = [
        {
            "title": paragraph.title,
            "content": paragraph.content,
            "dataset_name": paragraph.dataset.name if paragraph.dataset else "",
            "document_name": paragraph.document.name if paragraph.document else "",
            "similarity": round(min(0.99, max(0.1, score / 40)), 2),
            "comprehensive_score": score,
        }
        for score, paragraph in ranked[:5]
    ]
    result = {
        "app_name": app.name,
        "app_id": str(app.id),
        "chat_id": chat_id,
        "client_id": client_id,
        "answer": build_answer(message, selected),
        "traces": traces,
        "quality_score": min(99, 72 + len([item for item in traces if item["comprehensive_score"] > 0]) * 5),
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
