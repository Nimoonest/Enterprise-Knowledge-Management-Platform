# Document Center: MySQL and MinIO

## Architecture

```text
documents.html / documents.js
              |
              | HTTP + ekmp_session
              v
          server.js
              |
              v
 enterprise-documents-store.js
       |                    |
       v                    v
 MySQL 127.0.0.1:3307   MinIO 127.0.0.1:9000
 documents              ekmp-documents
 document_tags          private bucket
```

- MySQL owns document metadata, categories, tags, review state, and object metadata.
- MinIO owns attachment bytes. The bucket is not publicly readable.
- Browsers never receive MinIO credentials or object keys. Uploads and downloads pass through the authenticated API.
- The migration keeps `data/documents.json` and `storage/documents/` as a rollback source.

## Data model

The schema is defined in `db/document_center_schema.sql`.

- `documents` stores content metadata, review state, version, timestamps, and attachment object metadata.
- `document_tags` stores the many-to-many tag relation and is replaced transactionally on update.
- List filter fields are indexed. A full-text index reserves a path for later search integration.

MinIO object keys use `{documentId}/{uuid}-{safeFilename}`. Replacing an attachment follows this order:

1. Upload the new object.
2. Commit its metadata in MySQL.
3. Delete the previous object after the database commit.
4. Delete the new object as compensation if the database commit fails.

## Configuration

Copy `.env.example` to `.env` and replace development credentials:

```dotenv
DOCUMENT_METADATA_DRIVER=mysql
DOCUMENT_OBJECT_DRIVER=minio
DOCUMENT_MYSQL_HOST=127.0.0.1
DOCUMENT_MYSQL_PORT=3307
DOCUMENT_MYSQL_DATABASE=ekmp
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_BUCKET=ekmp-documents
```

`.env` is ignored by Git. Do not commit production secrets. Inject them with the deployment platform or a secrets manager.

## Development startup

On the current Windows workstation:

```powershell
powershell.exe -ExecutionPolicy Bypass -File tools\start_enterprise.ps1
```

The script initializes and starts an isolated MySQL instance on port 3307, bootstraps the restricted application account, starts MinIO in WSL Docker with the `ekmp_minio_data` volume, waits for health checks, and starts the Node API.

To start storage only:

```powershell
powershell.exe -ExecutionPolicy Bypass -File tools\start_enterprise.ps1 -InfrastructureOnly
```

`docker-compose.yml` is available for a standard Docker environment. Its named MySQL and MinIO volumes persist data across container restarts.

## Legacy data migration

Start the infrastructure, then run:

```powershell
npm run migrate:documents
```

`tools/migrate_documents_to_mysql_minio.js`:

1. Reads `data/documents.json`.
2. Upserts metadata into MySQL using stable document IDs.
3. Reads legacy attachments from `storage/documents/{id}/`.
4. Uploads attachments to MinIO and writes object metadata to MySQL.
5. Leaves all legacy JSON and local files in place.

The migration is idempotent and can be rerun after an interruption.

## API behavior

- `POST /api/admin/documents`: create metadata in MySQL.
- `PATCH /api/admin/documents/{id}`: transactionally update metadata and tags.
- `PUT /api/admin/documents/{id}/file`: upload an object and update MySQL.
- `GET /api/admin/documents/{id}/file`: stream a private MinIO object through the backend.
- `GET /api/health`: report MySQL and MinIO health under `document_storage`.

All document endpoints require an `ekmp_session` cookie. The upload limit remains 20 MB.

## Verification and recovery

After migration:

1. Confirm `metadata_driver=mysql`, `object_driver=minio`, and status `ok` in `/api/health`.
2. Compare document, tag, review-state, and attachment counts with the legacy source.
3. Download attachments through the API and compare SHA-256 hashes.
4. Confirm direct access to `/.env`, `/runtime/`, `/data/documents.json`, and MinIO objects is denied.
5. Restart Node, MySQL, and MinIO and repeat list and download checks.

During recovery, preserve the MySQL data directory, Docker volume, legacy JSON, and legacy attachment directory. Fix connectivity or credentials first, then rerun the idempotent migration.

## Production hardening

- Store credentials in a secrets manager and rotate all development defaults.
- Enable MySQL backups and binlogs; enable MinIO versioning, encryption, lifecycle rules, and multi-node redundancy.
- Add tenant or department ownership plus document-level authorization.
- Add reconciliation for orphaned objects and database rows, capacity metrics, latency, and failure alerts.
- Use HTTPS and restrict ports 9000 and 9001 to backend and operations networks.
