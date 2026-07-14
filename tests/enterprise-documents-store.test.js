const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { createEnterpriseDocumentsStore } = require("../enterprise-documents-store");

function streamText(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

test("retries storage initialization after a transient dependency failure", async () => {
  let repositoryAttempts = 0;
  let objectAttempts = 0;
  const repository = {
    name: "test-metadata",
    async initialize() {
      repositoryAttempts += 1;
      if (repositoryAttempts === 1) throw new Error("database starting");
    },
    async health() { return { status: "ok" }; },
    async close() {},
  };
  const objects = {
    name: "test-objects",
    async initialize() { objectAttempts += 1; },
    async health() { return { status: "ok" }; },
  };
  const store = createEnterpriseDocumentsStore(process.cwd(), {
    config: { metadataDriver: "json", objectDriver: "filesystem" },
    repository,
    objects,
  });

  await assert.rejects(() => store.ready(), /database starting/);
  const health = await store.ready();
  assert.equal(health.status, "ok");
  assert.equal(repositoryAttempts, 2);
  assert.equal(objectAttempts, 2);
});
test("keeps the document API contract with local adapters", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ekmp-documents-"));
  const store = createEnterpriseDocumentsStore(root, { env: { DOCUMENT_METADATA_DRIVER: "json", DOCUMENT_OBJECT_DRIVER: "filesystem" } });
  await store.ready();

  const created = await store.create({ title: "Runbook", summary: "Operations", category: "Ops", tags: ["platform", "ops"], review_status: "draft" }, "admin");
  assert.equal(created.title, "Runbook");
  assert.equal(created.has_file, false);

  const updated = await store.update(created.id, { review_status: "approved", tags: "ops,approved" }, "operator");
  assert.equal(updated.review_status, "approved");
  assert.deepEqual(updated.tags, ["ops", "approved"]);

  const attached = await store.attachFile(created.id, { name: "runbook.txt", type: "text/plain", buffer: Buffer.from("persistent content") }, "admin");
  assert.equal(attached.has_file, true);
  assert.equal(attached.file.name, "runbook.txt");
  assert.equal(await streamText((await store.getFile(created.id)).stream), "persistent content");

  const list = await store.list({ status: "approved", tag: "ops" });
  assert.equal(list.total, 1);
  assert.deepEqual((await store.facets()).categories, ["Ops"]);

  const reloaded = createEnterpriseDocumentsStore(root, { env: { DOCUMENT_METADATA_DRIVER: "json", DOCUMENT_OBJECT_DRIVER: "filesystem" } });
  assert.equal((await reloaded.get(created.id)).file.name, "runbook.txt");
  await store.close();
  await reloaded.close();
  fs.rmSync(root, { recursive: true, force: true });
});

test("imports stable document ids idempotently", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ekmp-import-"));
  const store = createEnterpriseDocumentsStore(root, { env: { DOCUMENT_METADATA_DRIVER: "json", DOCUMENT_OBJECT_DRIVER: "filesystem" } });
  const source = { id: "stable-id", title: "Policy", summary: "v1", category: "Policy", tags: ["policy"], review_status: "approved", created_by: "system", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" };
  await store.importDocument(source);
  await store.importDocument({ ...source, summary: "v2" });
  assert.equal((await store.list({})).total, 1);
  assert.equal((await store.get("stable-id")).summary, "v2");
  await store.close();
  fs.rmSync(root, { recursive: true, force: true });
});
