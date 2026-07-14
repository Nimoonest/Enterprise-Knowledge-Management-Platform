#!/bin/sh
set -eu

: "${MINIO_ACCESS_KEY:?MINIO_ACCESS_KEY is required}"
: "${MINIO_SECRET_KEY:?MINIO_SECRET_KEY is required}"
: "${DIFY_MINIO_ACCESS_KEY_ID:?DIFY_MINIO_ACCESS_KEY_ID is required}"
: "${DIFY_MINIO_SECRET_KEY:?DIFY_MINIO_SECRET_KEY is required}"

mc alias set local http://127.0.0.1:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null
mc admin policy create local dify-ekmp-policy /policy.json >/dev/null
mc admin user add local "$DIFY_MINIO_ACCESS_KEY_ID" "$DIFY_MINIO_SECRET_KEY" >/dev/null
mc admin policy attach local dify-ekmp-policy --user "$DIFY_MINIO_ACCESS_KEY_ID" >/dev/null
mc admin user info local "$DIFY_MINIO_ACCESS_KEY_ID"
