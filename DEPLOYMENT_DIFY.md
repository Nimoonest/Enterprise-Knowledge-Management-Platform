# Dify External Knowledge Production Deployment

## Scope

This deployment exposes only `POST /api/dify/retrieval` to Dify. The Node API,
MySQL, MinIO, search index, admin UI, and internal APIs remain on private Docker
networks. Cloudflare Tunnel provides the public hostname and TLS certificate.

## Prerequisites

- A Linux server with Docker Engine and the Docker Compose plugin.
- A domain managed by Cloudflare.
- A remotely managed Cloudflare Tunnel and its connector token.
- The repository copied to `/opt/ekmp` or another persistent server directory.

## 1. Create production secrets

```bash
cd /opt/ekmp
cp .env.production.example .env.production
chmod 600 .env.production
openssl rand -hex 32
```

Generate a different random value for the Dify API key, admin password, MySQL
root password, MySQL application password, and MinIO password. Store the Tunnel
token in `CLOUDFLARE_TUNNEL_TOKEN`. Never commit `.env.production`.

## 2. Configure Cloudflare Tunnel

In Cloudflare Zero Trust, create a named Tunnel and add a public hostname:

```text
Hostname: kb-api.example.com
Service:  http://gateway:8080
```

The service name resolves because `cloudflared` and `gateway` share the Compose
`edge` network. The Caddy gateway is an independent allowlist: it proxies only
`POST /api/dify/retrieval` and returns 404 for every other method and path.

Do not add Cloudflare Access interactive login to this hostname. Dify sends the
origin Bearer API key but cannot complete a browser login flow. Use WAF rate
limits when available, while keeping the origin API key mandatory.

## 3. Validate and start

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config
docker compose --env-file .env.production -f docker-compose.production.yml build api
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 api gateway cloudflared
```

The production Compose file has no host `ports` mappings. No inbound firewall
rule is needed for HTTP, HTTPS, MySQL, or MinIO because Tunnel traffic is
outbound from `cloudflared`. Restrict SSH to the operations network.

## 4. Verify the public boundary

```bash
export DIFY_KEY='the-value-from-.env.production'

curl -i https://kb-api.example.com/
curl -i -X POST https://kb-api.example.com/api/search
curl -i -X POST https://kb-api.example.com/api/dify/retrieval

curl -i -X POST https://kb-api.example.com/api/dify/retrieval \
  -H "Authorization: Bearer ${DIFY_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "knowledge_id": "ekmp-product-kb",
    "query": "candle",
    "retrieval_setting": {"top_k": 4, "score_threshold": 0.0}
  }'
```

Expected results:

- `/` and `/api/search`: HTTP 404 from the gateway.
- Retrieval without a key: HTTP 401.
- Retrieval with a valid key and knowledge ID: HTTP 200 with a top-level
  `records` array.
- Each record contains `content`, `score`, `title`, and an object-valued
  `metadata` field.

Also verify from another machine that ports 3306, 3307, 5178, 9000, and 9001
are not reachable on the server public IP.

## 5. Configure Dify

```text
API Endpoint:          https://kb-api.example.com/api/dify
API Key:               DIFY_EXTERNAL_KB_API_KEY
External Knowledge ID: ekmp-product-kb
Top K:                 4
Score threshold:       disabled initially, or 0.2 after score calibration
```

Dify appends `/retrieval` to the API Endpoint automatically.

## Operations

Upgrade and restart:

```bash
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Check logs and health:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --since=30m api gateway cloudflared
```

Back up the `ekmp_mysql_data`, `ekmp_minio_data`, and `ekmp_audit_data` volumes.
The search index volume can be rebuilt from normalized chunks. Test restores on
a separate server before relying on the backup procedure.
