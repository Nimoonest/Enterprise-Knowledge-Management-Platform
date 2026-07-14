const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { createAuditStore, calculateQuality } = require("../audit-store");

test("persists operation and interaction logs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ekmp-audit-"));
  const store = createAuditStore(root);
  store.operation({ actor: "admin", action: "document.create", resource_type: "document", resource_id: "doc-1" });
  store.interaction({
    type: "search",
    question: "wood candle",
    status: "success",
    duration_ms: 18,
    top_score: 0.82,
    traces: [{ title: "Wood candle", score: 0.82 }],
  });

  const reloaded = createAuditStore(root);
  assert.equal(reloaded.listOperations({}).total, 1);
  assert.equal(reloaded.listInteractions({ type: "search" }).total, 1);
  assert.equal(reloaded.analytics(7).metrics.search_count, 1);
  assert.equal(reloaded.analytics(7).metrics.success_rate, 100);
  fs.rmSync(root, { recursive: true, force: true });
});

test("quality score exposes dimensions and risk flags", () => {
  const strong = calculateQuality({
    type: "chat",
    answer: "A".repeat(260),
    status: "success",
    traces: [{ similarity: 0.9 }, { comprehensive_score: 0.84 }],
  });
  const weak = calculateQuality({ type: "chat", answer: "", status: "failed", traces: [] });
  assert.ok(strong.overall >= 80);
  assert.ok(strong.relevance >= 80);
  assert.ok(weak.overall < 30);
  assert.ok(weak.flags.includes("empty_answer"));
  assert.ok(weak.flags.includes("no_evidence"));
});
