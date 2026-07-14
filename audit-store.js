const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function cleanText(value, maxLength = 4000) {
  return String(value || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, maxLength);
}

function evidenceScore(trace) {
  const value = Number(trace?.comprehensive_score ?? trace?.similarity ?? trace?.score ?? 0);
  return value > 1 ? clamp(value) : clamp(value * 100);
}

function calculateQuality(input = {}) {
  const traces = Array.isArray(input.traces) ? input.traces : [];
  const answer = cleanText(input.answer, 12000).trim();
  const status = input.status || "success";
  const traceScores = traces.map(evidenceScore).filter((score) => score > 0);
  const relevance = traceScores.length ? clamp(average(traceScores)) : clamp(Number(input.top_score || 0) * 100);
  const groundedness = traces.length ? clamp(55 + Math.min(traces.length, 5) * 7 + relevance * 0.1) : 20;
  const completeness = answer.length >= 240 ? 95 : answer.length >= 100 ? 82 : answer.length >= 30 ? 65 : answer.length ? 40 : 0;
  const reliability = status === "success" ? 100 : status === "partial" ? 55 : 0;
  const overall = Math.round(relevance * 0.35 + groundedness * 0.3 + completeness * 0.2 + reliability * 0.15);
  const flags = [];
  if (!answer && input.type === "chat") flags.push("empty_answer");
  if (!traces.length) flags.push("no_evidence");
  if (relevance < 55) flags.push("low_retrieval_confidence");
  if (status !== "success") flags.push("request_failed");
  return {
    overall: clamp(overall),
    relevance: Math.round(relevance),
    groundedness: Math.round(groundedness),
    completeness: Math.round(completeness),
    reliability: Math.round(reliability),
    flags,
  };
}

function createAuditStore(root) {
  const directory = path.join(root, "data", "audit");
  const operationPath = path.join(directory, "operations.jsonl");
  const interactionPath = path.join(directory, "interactions.jsonl");

  function ensure() {
    fs.mkdirSync(directory, { recursive: true });
    [operationPath, interactionPath].forEach((filePath) => {
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "", "utf8");
    });
  }

  function append(filePath, value) {
    ensure();
    fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
    return value;
  }

  function requestContext(req) {
    const forwarded = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
    return {
      ip: forwarded || req?.socket?.remoteAddress || "unknown",
      user_agent: cleanText(req?.headers?.["user-agent"], 300),
      request_id: cleanText(req?.headers?.["x-request-id"], 100) || crypto.randomUUID(),
    };
  }

  function operation(event = {}) {
    return append(operationPath, {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor: cleanText(event.actor || "anonymous", 100),
      actor_role: cleanText(event.actor_role || "", 50),
      action: cleanText(event.action, 100),
      resource_type: cleanText(event.resource_type, 80),
      resource_id: cleanText(event.resource_id, 160),
      status: event.status || "success",
      detail: cleanText(event.detail, 500),
      metadata: event.metadata || {},
      ...requestContext(event.req),
    });
  }

  function interaction(event = {}) {
    const quality = calculateQuality(event);
    return append(interactionPath, {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: event.type || "chat",
      actor: cleanText(event.actor || "anonymous", 100),
      question: cleanText(event.question, 4000),
      answer: cleanText(event.answer, 12000),
      status: event.status || "success",
      duration_ms: Math.max(0, Number(event.duration_ms) || 0),
      app_id: cleanText(event.app_id, 160),
      app_name: cleanText(event.app_name, 200),
      chat_id: cleanText(event.chat_id, 160),
      retrieval_mode: cleanText(event.retrieval_mode, 40),
      evidence_count: Array.isArray(event.traces) ? event.traces.length : 0,
      top_score: Number(event.top_score || 0),
      quality,
      error: cleanText(event.error, 1000),
      metadata: event.metadata || {},
      traces: (event.traces || []).slice(0, 8).map((trace) => ({
        title: cleanText(trace.title, 300),
        source: cleanText(trace.dataset_name || trace.document_name || trace.sku || trace.chunk_id, 300),
        score: evidenceScore(trace),
      })),
      ...requestContext(event.req),
    });
  }

  function read(filePath) {
    ensure();
    const content = fs.readFileSync(filePath, "utf8").trim();
    if (!content) return [];
    return content.split(/\r?\n/).flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch (_) {
        return [];
      }
    });
  }

  function list(filePath, filters = {}) {
    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters.page_size || 30)));
    const q = cleanText(filters.q, 200).toLowerCase();
    const from = filters.from ? new Date(filters.from).getTime() : 0;
    const to = filters.to ? new Date(filters.to).getTime() : Number.MAX_SAFE_INTEGER;
    const items = read(filePath).filter((item) => {
      const timestamp = new Date(item.timestamp).getTime();
      if (timestamp < from || timestamp > to) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.action && item.action !== filters.action) return false;
      if (filters.actor && item.actor !== filters.actor) return false;
      if (q && !JSON.stringify(item).toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    const offset = (page - 1) * pageSize;
    return { items: items.slice(offset, offset + pageSize), total: items.length, page, page_size: pageSize };
  }

  function analytics(days = 7) {
    const windowDays = Math.min(90, Math.max(1, Number(days || 7)));
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - windowDays + 1);
    const operations = read(operationPath).filter((item) => new Date(item.timestamp) >= start);
    const interactions = read(interactionPath).filter((item) => new Date(item.timestamp) >= start);
    const successful = interactions.filter((item) => item.status === "success");
    const qualityValues = interactions.map((item) => Number(item.quality?.overall || 0));
    const durations = interactions.map((item) => Number(item.duration_ms || 0));
    const daily = [];
    for (let offset = 0; offset < windowDays; offset += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + offset);
      const key = date.toISOString().slice(0, 10);
      const dayInteractions = interactions.filter((item) => item.timestamp.slice(0, 10) === key);
      const dayOperations = operations.filter((item) => item.timestamp.slice(0, 10) === key);
      daily.push({
        date: key,
        operations: dayOperations.length,
        interactions: dayInteractions.length,
        chats: dayInteractions.filter((item) => item.type === "chat").length,
        searches: dayInteractions.filter((item) => item.type === "search").length,
        average_quality: Math.round(average(dayInteractions.map((item) => Number(item.quality?.overall || 0)))),
      });
    }
    const countBy = (items, key) => Object.entries(items.reduce((result, item) => {
      const value = item[key] || "unknown";
      result[value] = (result[value] || 0) + 1;
      return result;
    }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const queryCounts = new Map();
    interactions.forEach((item) => {
      const query = cleanText(item.question, 100).trim();
      if (query) queryCounts.set(query, (queryCounts.get(query) || 0) + 1);
    });
    return {
      period_days: windowDays,
      metrics: {
        operation_count: operations.length,
        interaction_count: interactions.length,
        chat_count: interactions.filter((item) => item.type === "chat").length,
        search_count: interactions.filter((item) => item.type === "search").length,
        success_rate: interactions.length ? Math.round(successful.length / interactions.length * 100) : 0,
        average_quality: Math.round(average(qualityValues)),
        p95_duration_ms: Math.round(percentile(durations, 0.95)),
        low_quality_count: qualityValues.filter((value) => value < 60).length,
      },
      daily,
      action_distribution: countBy(operations, "action").slice(0, 10),
      interaction_distribution: countBy(interactions, "type"),
      status_distribution: countBy(interactions, "status"),
      quality_distribution: [
        { name: "excellent", count: qualityValues.filter((value) => value >= 85).length },
        { name: "good", count: qualityValues.filter((value) => value >= 70 && value < 85).length },
        { name: "watch", count: qualityValues.filter((value) => value >= 60 && value < 70).length },
        { name: "risk", count: qualityValues.filter((value) => value < 60).length },
      ],
      top_queries: [...queryCounts.entries()].map(([query, count]) => ({ query, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      recent_operations: operations.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, 8),
      recent_interactions: interactions.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, 8),
    };
  }

  ensure();
  return {
    operation,
    interaction,
    listOperations: (filters) => list(operationPath, filters),
    listInteractions: (filters) => list(interactionPath, filters),
    analytics,
    calculateQuality,
  };
}

module.exports = { createAuditStore, calculateQuality };
