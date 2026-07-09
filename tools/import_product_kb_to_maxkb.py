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

PROMPT = """Knowledge snippets:
{data}

你是中文商品导购问答机器人。只能使用上方商品知识回答，不要使用外部常识，不要提到知识片段、上下文或知识库。

回答规则：
1. 用户询问香味、品类、预算、送礼对象或使用场景时，推荐 2-4 个相关商品，并说明每个商品的名称、SKU、价格、香味/副标题和推荐理由。
2. 用户询问具体商品时，返回名称、SKU、价格、香味/副标题、核心描述、使用建议、搭配关系和详情页。
3. 用户询问某某香味时，优先根据副标题、香调、描述、分类和商品名检索推荐。
4. 如果没有相关商品或字段未收录，回答“没有在知识库中查找到相关信息。”，不要编造库存、价格、功效或链接。

Question:
{question}"""


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
            "dialogue_number": 0,
            "user_id": user.id,
            "model_id": template.model_id,
            "dataset_setting": {
                **(template.dataset_setting or {}),
                "top_n": 6,
                "similarity": 0.0,
                "search_mode": "blend",
                "max_paragraph_char_number": 8000,
                "no_references_setting": {"value": "没有在知识库中查找到相关信息。", "status": "designated_answer"},
            },
            "model_setting": {
                **(template.model_setting or {}),
                "prompt": PROMPT,
                "no_references_prompt": "没有在知识库中查找到相关信息。",
                "reasoning_content_enable": False,
                "reasoning_content_start": "<think>",
                "reasoning_content_end": "</think>",
            },
            "model_params_setting": {**(template.model_params_setting or {}), "max_tokens": 1200, "temperature": 0.35},
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

