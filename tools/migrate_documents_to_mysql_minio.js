const fs = require("fs");
const path = require("path");

const { createEnterpriseDocumentsStore, loadConfig } = require("../enterprise-documents-store");
const { loadEnvFile } = require("../env-loader");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data", "documents.json");
loadEnvFile(path.join(root, ".env"));

async function main() {
  const config = loadConfig();
  if (config.metadataDriver !== "mysql" || config.objectDriver !== "minio") {
    throw new Error("Migration requires DOCUMENT_METADATA_DRIVER=mysql and DOCUMENT_OBJECT_DRIVER=minio");
  }
  const documents = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const store = createEnterpriseDocumentsStore(root, { config });
  const health = await store.ready();
  const results = [];

  for (const document of documents) {
    let file = null;
    let fileStatus = "none";
    if (document.file) {
      const storedName = document.file.stored_name || document.file.object_key;
      const localPath = path.join(root, "storage", "documents", document.id, storedName || "");
      if (storedName && fs.existsSync(localPath)) {
        file = {
          name: document.file.name,
          type: document.file.type,
          buffer: fs.readFileSync(localPath),
        };
        fileStatus = "uploaded";
      } else {
        fileStatus = "missing_local_file";
      }
    }

    const migrated = await store.importDocument(document, file);
    results.push({ id: migrated.id, title: migrated.title, metadata: "upserted", file: fileStatus, object_available: migrated.has_file });
  }

  const target = await store.list({});
  await store.close();
  console.log(JSON.stringify({
    source: sourcePath,
    source_count: documents.length,
    target_count: target.total,
    storage: health,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
