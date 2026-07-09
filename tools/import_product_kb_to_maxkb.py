import json
import os
import sys
import uuid
from pathlib import Path

os.chdir("/opt/maxkb/app")
sys.path.insert(0, "/opt/maxkb/app/apps")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartdoc.settings")

import django

django.setup()

from application.models import Application, ApplicationDatasetMapping, ApplicationTypeChoices
from dataset.models.data_set import DataSet, Document, Paragraph, Status, TaskType, State
from embedding.task.embedding import embedding_by_document
from users.models import User

DATASET_NAME = "商品导购知识库"
APP_NAME = "商品导购问答机器人"
TEMPLATE_APP_NAME = "AI导购模拟"
JSONL_PATH = Path("/tmp/maxkb_product_chunks.jsonl")

PROMPT = '商品资料：\n{data}\n\n你是一名真实、耐心、专业的中文香氛导购。商品资料只作为事实来源；回答时不要提到 MaxKB、RAG、知识库、检索、上下文、片段、系统等内部词。\n\n对话规则：\n1. 必须结合历史对话理解用户当前问题。用户说“这几款 / 上面 / 刚才 / 其中 / 第二款 / 这三款”时，优先基于历史对话中已经推荐过的候选商品回答，不要重新推荐无关商品，除非用户明确要求换一批。\n2. 商品事实必须来自商品资料或历史对话中已经给出的商品事实。价格、货号/SKU、库存、链接等确定字段不能编造。\n3. 用户询问香味、品类、预算、送礼对象或使用场景时，像真实导购一样优先推荐 3 个相关商品，说明商品名、价格、货号、香调/特点和推荐理由。\n4. 用户询问具体商品时，优先直接回答用户关心的信息；必要时补充香调、价格、货号、使用建议或搭配建议，不要堆砌无关字段。\n5. 用户比较“哪款更淡 / 更适合送礼 / 更高级 / 更适合小空间”时，根据历史候选商品和商品描述做相对判断，并说明理由。\n6. 如果商品资料和历史对话都不足以回答，要自然地说明还需要补充哪类偏好或商品信息，不要说“知识库未查到”。\n\n用户当前问题：\n{question}'


def read_chunks():
    chunks = []
    with JSONL_PATH.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))
    return chunks


def status_success():
    status = Status("")
    status.update_status(TaskType.EMBEDDING, State.SUCCESS)
    return str(status)


def status_pending():
    status = Status("")
    status.update_status(TaskType.EMBEDDING, State.PENDING)
    return str(status)


def main():
    chunks = read_chunks()
    template = Application.objects.filter(name=TEMPLATE_APP_NAME).first() or Application.objects.first()
    if template is None:
        raise RuntimeError("No template application found in MaxKB")
    user = User.objects.filter(id=template.user_id).first() or User.objects.filter(is_active=True).first()
    if user is None:
        raise RuntimeError("No active MaxKB user found")

    dataset, dataset_created = DataSet.objects.update_or_create(
        name=DATASET_NAME,
        defaults={
            "desc": "由 products_v2.xlsx 生成的商品导购知识库，包含商品字段、分类、搭配关系和导购分段。",
            "user_id": user.id,
            "type": "0",
            "embedding_mode_id": (DataSet.objects.first().embedding_mode_id if DataSet.objects.first() else DataSet._meta.get_field("embedding_mode").default()),
            "meta": {"source": "products_v2.xlsx", "chunk_count": len(chunks)},
        },
    )

    # Rebuild document and paragraphs idempotently for this generated knowledge base.
    Document.objects.filter(dataset=dataset, name="products_v2 商品导购分段").delete()
    document = Document.objects.create(
        dataset=dataset,
        name="products_v2 商品导购分段",
        char_length=sum(len(item["content"]) for item in chunks),
        status=status_pending(),
        status_meta={"state_time": {}},
        is_active=True,
        type="0",
        hit_handling_method="optimization",
        directly_return_similarity=0.9,
        meta={"source": "data/maxkb_product_chunks.jsonl"},
    )
    paragraphs = [
        Paragraph(
            id=uuid.uuid1(),
            document=document,
            dataset=dataset,
            title=item["title"][:256],
            content=item["content"][:102400],
            status=status_pending(),
            status_meta={"state_time": {}},
            hit_num=0,
            is_active=True,
        )
        for item in chunks
    ]
    Paragraph.objects.bulk_create(paragraphs, batch_size=100)

    application, app_created = Application.objects.update_or_create(
        name=APP_NAME,
        defaults={
            "desc": "基于 products_v2.xlsx 商品知识库的 AI 导购问答应用。",
            "prologue": "你好，我是商品导购问答机器人，可以按香味、品类、预算、送礼场景或具体商品名称帮你推荐。",
            "dialogue_number": 5,
            "user_id": user.id,
            "model_id": template.model_id,
            "dataset_setting": {
                **(template.dataset_setting or {}),
                "top_n": 5,
                "similarity": 0.0,
                "search_mode": "blend",
                "max_paragraph_char_number": 5500,
                "no_references_setting": {"value": "{question}", "status": "ai_questioning"},
            },
            "model_setting": {
                **(template.model_setting or {}),
                "prompt": PROMPT,
                "no_references_prompt": '请结合历史对话继续回答用户。如果历史对话也不足以回答，请用真实导购口吻询问用户补充香调、预算、使用空间或具体商品。不要提到 MaxKB、RAG、知识库、检索、上下文等内部词。\n\n用户当前问题：\n{question}',
                "reasoning_content_enable": False,
                "reasoning_content_start": "<think>",
                "reasoning_content_end": "</think>",
            },
            "model_params_setting": {**(template.model_params_setting or {}), "max_tokens": 700, "temperature": 0.35},
            "tts_model_params_setting": template.tts_model_params_setting or {},
            "problem_optimization": False,
            "icon": template.icon,
            "work_flow": template.work_flow or {},
            "type": ApplicationTypeChoices.SIMPLE,
            "problem_optimization_prompt": template.problem_optimization_prompt or "",
            "tts_model_id": template.tts_model_id,
            "stt_model_id": template.stt_model_id,
            "tts_model_enable": False,
            "stt_model_enable": False,
            "tts_type": template.tts_type,
            "tts_autoplay": False,
            "stt_autosend": False,
            "clean_time": template.clean_time,
            "file_upload_enable": False,
            "file_upload_setting": template.file_upload_setting or {},
        },
    )
    ApplicationDatasetMapping.objects.filter(application=application).delete()
    ApplicationDatasetMapping.objects.create(application=application, dataset=dataset)

    embedding_status = "not_started"
    try:
        embedding_by_document(str(document.id), str(dataset.embedding_mode_id))
        document.refresh_from_db()
        embedding_status = document.status
    except Exception as exc:
        embedding_status = f"failed: {exc}"

    print(json.dumps({
        "dataset_id": str(dataset.id),
        "dataset_created": dataset_created,
        "document_id": str(document.id),
        "paragraphs": len(paragraphs),
        "application_id": str(application.id),
        "application_created": app_created,
        "embedding_status": embedding_status,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
