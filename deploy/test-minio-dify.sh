#!/bin/sh
set -eu

: "${DIFY_MINIO_ACCESS_KEY_ID:?DIFY_MINIO_ACCESS_KEY_ID is required}"
: "${DIFY_MINIO_SECRET_KEY:?DIFY_MINIO_SECRET_KEY is required}"
endpoint="${DIFY_MINIO_ENDPOINT:-http://127.0.0.1:9000}"

object=".dify-credential-check-$(date +%s)"
trap 'mc rm --force "dify/ekmp-documents/$object" >/dev/null 2>&1 || true' EXIT

mc alias set dify "$endpoint" "$DIFY_MINIO_ACCESS_KEY_ID" "$DIFY_MINIO_SECRET_KEY" >/dev/null
printf 'dify-minio-credential-check' > /tmp/check.txt
mc cp /tmp/check.txt "dify/ekmp-documents/$object" >/dev/null
test "$(mc cat "dify/ekmp-documents/$object")" = "dify-minio-credential-check"
mc rm "dify/ekmp-documents/$object" >/dev/null

if mc admin info dify >/dev/null 2>&1; then
  echo "unexpected admin access" >&2
  exit 1
fi

echo "bucket_read_write_delete=ok"
echo "admin_access=denied"
