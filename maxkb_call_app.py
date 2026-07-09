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


def is_gift_query(message):
    return any(keyword in (message or "") for keyword in ["送礼", "礼物", "礼盒", "送人", "赠礼"])


def budget_from_message(message):
    text = message or ""
    match = re.search(r"预算\s*(\d+(?:\.\d+)?)", text)
    if not match:
        match = re.search(r"(\d+(?:\.\d+)?)\s*(?:元|块|左右|以内)", text)
    return float(match.group(1)) if match else None


def product_price(paragraph):
    price = field(paragraph.content or "", "价格")
    match = re.search(r"(\d+(?:\.\d+)?)", price or "")
    return float(match.group(1)) if match else None


def clean_relation(text):
    return re.sub(r"\s*\[[^\]]+\]", "", text or "")


def product_type_label(raw_type):
    mapping = {
        "candle": "家居香氛",
        "fragrance": "个人香氛",
        "bodycare": "身体护理",
        "decoration": "香氛配件",
    }
    return mapping.get((raw_type or "").lower(), raw_type or "")


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
    budget = budget_from_message(message)
    price = product_price(paragraph)
    if budget and price:
        if price <= budget * 1.2:
            score += 18
        elif price > budget * 1.5:
            score -= 35
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
    name = field(content, "名称") or (paragraph.title or "这款商品")
    sku = field(content, "SKU")
    price = field(content, "价格")
    scent = field(content, "副标题/香味线索")
    if price:
        answer = f"这款{name}的价格是 {price}。"
    else:
        answer = f"这款{name}我目前没有查到明确售价，建议以下单页或门店实时价格为准。"
    details = []
    if scent:
        details.append(f"香调是{scent}")
    if sku:
        details.append(f"货号 {sku}")
    if details:
        answer += "另外，" + "，".join(details) + "。"
    return answer


def product_summary(paragraph):
    content = paragraph.content or ""
    name = field(content, "名称") or (paragraph.title or "这款商品")
    sku = field(content, "SKU")
    price = field(content, "价格")
    scent = field(content, "副标题/香味线索")
    product_type = product_type_label(field(content, "类型"))
    description = field(content, "描述")
    meta = []
    if price:
        meta.append(price)
    if scent:
        meta.append(scent)
    if product_type:
        meta.append(product_type)
    if sku:
        meta.append(f"货号 {sku}")
    return {
        "name": name,
        "meta": "｜".join(meta),
        "description": description,
    }


def recommendation_lead(message):
    if is_gift_query(message):
        return "送礼的话，我会优先考虑质感、接受度和使用场景，这几款比较合适："
    if any(keyword in (message or "") for keyword in ["预算", "左右", "以内"]):
        return "可以，按你的预算和香调偏好，我比较推荐这几款："
    return "可以，这几款会比较符合你的需求："


def build_answer(message, paragraphs):
    if paragraphs and is_price_query(message):
        return build_price_answer(paragraphs[0])

    if not paragraphs:
        return "我暂时没有找到完全匹配的商品。你可以再告诉我更具体的香调、预算、使用空间或送礼对象，我再帮你缩小范围。"

    lines = [recommendation_lead(message)]
    for index, paragraph in enumerate(paragraphs[:3], 1):
        item = product_summary(paragraph)
        lines.append(f"{index}. {item['name']}" + (f"（{item['meta']}）" if item["meta"] else ""))
        if item["description"]:
            lines.append(f"   推荐理由：{clip(item['description'], 170)}")

    top_content = paragraphs[0].content or ""
    usage = field(top_content, "使用建议")
    pairing = field(top_content, "搭配产品建议")
    if usage:
        lines.append(f"使用小建议：{clip(usage, 180)}")
    if pairing and not budget_from_message(message):
        lines.append(f"搭配上可以考虑：{clip(clean_relation(pairing), 180)}")
    lines.append("如果你更在意送礼排面、香味浓淡或使用空间大小，我可以再帮你从这几款里挑最合适的一款。")
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
    budget = budget_from_message(message)
    selected_ranked = ranked
    if budget:
        within_budget = [item for item in ranked if product_price(item[1]) is None or product_price(item[1]) <= budget * 1.2]
        if within_budget:
            selected_ranked = within_budget
    selected = [paragraph for score, paragraph in selected_ranked if score > 0][:5] or [paragraph for _, paragraph in selected_ranked[:5]]
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


