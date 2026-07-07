import json
import os
import sys
import uuid

os.chdir("/opt/maxkb/app")
sys.path.insert(0, "/opt/maxkb/app/apps")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartdoc.settings")

import django

django.setup()

from application.models import Application, ChatRecord
from application.serializers.chat_message_serializers import ChatMessageSerializer
from application.serializers.chat_serializers import ChatSerializers
from common.constants.authentication_type import AuthenticationType


def main():
    payload = json.loads(sys.stdin.read())
    app_id = payload.get("app_id")
    app_name = payload.get("app_name")
    message = payload["message"]
    chat_id = payload.get("chat_id")
    client_id = payload.get("client_id") or str(uuid.uuid1())

    if app_id:
        app = Application.objects.get(id=app_id)
    else:
        app = Application.objects.get(name=app_name)
    if not chat_id:
        chat_id = str(
            ChatSerializers.OpenChat(
                data={"user_id": app.user_id, "application_id": str(app.id)}
            ).open()
        )

    serializer = ChatMessageSerializer(
        data={
            "chat_id": chat_id,
            "message": message,
            "re_chat": False,
            "stream": False,
            "application_id": str(app.id),
            "client_id": client_id,
            "client_type": AuthenticationType.APPLICATION_ACCESS_TOKEN.value,
            "form_data": {},
            "image_list": [],
            "document_list": [],
            "audio_list": [],
            "other_list": [],
        }
    )
    serializer.chat()

    record = ChatRecord.objects.filter(chat_id=chat_id).order_by("-create_time").first()
    details = record.details if record else {}
    search_step = details.get("search_step", {})
    paragraphs = search_step.get("paragraph_list", []) or []
    result = {
        "app_name": app.name,
        "app_id": str(app.id),
        "chat_id": chat_id,
        "client_id": client_id,
        "answer": record.answer_text if record else "",
        "traces": [
            {
                "title": row.get("title"),
                "content": row.get("content"),
                "dataset_name": row.get("dataset_name"),
                "document_name": row.get("document_name"),
                "similarity": row.get("similarity"),
                "comprehensive_score": row.get("comprehensive_score"),
            }
            for row in paragraphs[:5]
        ],
        "quality_score": min(99, 72 + len(paragraphs) * 5),
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()

