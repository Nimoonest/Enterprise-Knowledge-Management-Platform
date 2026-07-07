const modes = {
  guide: {
    appId: "45fa5cf6-79d2-11f1-8c78-56920ea5d652",
    appName: "AI导购模拟",
    title: "AI 导购模拟",
    subtitle: "连接 MaxKB 应用，根据发质、场景与需求推荐产品组合。",
    placeholder: "例如：我头发容易出油，发尾又干，用哪款比较合适？",
    prompts: [
      "我头发容易出油，发尾又干，用哪款比较合适？",
      "烫染后头发受损毛躁，适合什么护理？",
      "头皮敏感还能每天洗吗？",
    ],
  },
  chatbot: {
    appId: "45fd80ca-79d2-11f1-8c78-56920ea5d652",
    appName: "AI Chatbot模拟",
    title: "AI Chatbot 模拟",
    subtitle: "连接 MaxKB 应用，面向 FAQ、产品说明和风险提示进行客服问答。",
    placeholder: "例如：这款洗发水适合每天使用吗？",
    prompts: [
      "这款洗发水适合每天使用吗？",
      "潘婷强韧修护洗发水的主要功效是什么？",
      "头皮敏感的人可以用吗？",
    ],
  },
  geo: {
    appId: "460029d8-79d2-11f1-8c78-56920ea5d652",
    appName: "GEO内容检验",
    title: "GEO 内容检验",
    subtitle: "连接 MaxKB 应用，输出结构化摘要并检查 AI 搜索展示可读性。",
    placeholder: "例如：请用 JSON 总结产品名称、功效、适用人群和风险提示",
    prompts: [
      "请用 JSON 总结产品名称、功效、适用人群和风险提示",
      "检查强韧修护洗发水是否适合 AI 搜索摘要",
      "输出产品核心字段和内容完整性评分",
    ],
  },
};

const sessions = {
  guide: { chatId: null, clientId: crypto.randomUUID() },
  chatbot: { chatId: null, clientId: crypto.randomUUID() },
  geo: { chatId: null, clientId: crypto.randomUUID() },
};

let currentMode = "guide";
let pending = false;

const modeCards = document.querySelectorAll(".mode-card");
const panelTitle = document.querySelector("#panelTitle");
const panelSubtitle = document.querySelector("#panelSubtitle");
const quickPrompts = document.querySelector("#quickPrompts");
const conversation = document.querySelector("#conversation");
const composer = document.querySelector("#composer");
const questionInput = document.querySelector("#questionInput");
const traceList = document.querySelector("#traceList");
const resetButton = document.querySelector("#resetButton");
const qualityScore = document.querySelector("#qualityScore");
const qualityBar = document.querySelector("#qualityBar");

function setMode(mode) {
  currentMode = mode;
  const data = modes[mode];

  modeCards.forEach((card) => card.classList.toggle("active", card.dataset.mode === mode));
  panelTitle.textContent = data.title;
  panelSubtitle.textContent = data.subtitle;
  questionInput.placeholder = data.placeholder;
  quickPrompts.innerHTML = "";

  data.prompts.forEach((prompt) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => {
      questionInput.value = prompt;
      runChat(prompt);
    });
    quickPrompts.appendChild(button);
  });

  resetConversation();
}

function resetConversation() {
  const data = modes[currentMode];
  sessions[currentMode] = { chatId: null, clientId: crypto.randomUUID() };
  conversation.innerHTML = "";
  addMessage("assistant", `你好，我是${data.title}，会直接调用 MaxKB 应用并基于潘婷测试知识库回答。`);
  renderTrace([], 0);
}

function addMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = "message " + role;
  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "user" ? "用户" : "AI";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  wrapper.append(label, bubble);
  conversation.appendChild(wrapper);
  conversation.scrollTop = conversation.scrollHeight;
  return bubble;
}

function renderTrace(items, score) {
  traceList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "trace-item";
    empty.innerHTML = `
      <div class="trace-title">
        <span>等待提问</span>
        <span class="trace-score">--</span>
      </div>
      <div class="trace-body">发送问题后，这里会显示 MaxKB 真实返回的知识库命中段落。</div>
    `;
    traceList.appendChild(empty);
  }

  items.forEach((item) => {
    const trace = document.createElement("div");
    trace.className = "trace-item";
    const similarity = Number(item.similarity ?? item.comprehensive_score ?? 0);
    trace.innerHTML = `
      <div class="trace-title">
        <span>${escapeHtml(item.title || "未命名段落")}</span>
        <span class="trace-score">${similarity ? similarity.toFixed(2) : "--"}</span>
      </div>
      <div class="trace-body">${escapeHtml(item.content || "").slice(0, 220)}</div>
    `;
    traceList.appendChild(trace);
  });

  qualityScore.textContent = score ? String(score) : "--";
  qualityBar.style.width = `${score || 0}%`;
}

async function runChat(question) {
  if (pending) return;
  pending = true;

  const data = modes[currentMode];
  const session = sessions[currentMode];
  addMessage("user", question);
  const loadingBubble = addMessage("assistant", "正在调用 MaxKB 应用...");
  setComposerState(false);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: data.appId,
        app_name: data.appName,
        message: question,
        chat_id: session.chatId,
        client_id: session.clientId,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "MaxKB 调用失败");
    }

    session.chatId = result.chat_id;
    session.clientId = result.client_id || session.clientId;
    loadingBubble.textContent = result.answer || "没有返回内容。";
    renderTrace(result.traces || [], result.quality_score || 0);
  } catch (error) {
    loadingBubble.textContent = `调用失败：${error.message}`;
    renderTrace([], 0);
  } finally {
    pending = false;
    setComposerState(true);
  }
}

function setComposerState(enabled) {
  questionInput.disabled = !enabled;
  composer.querySelector("button").disabled = !enabled;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

modeCards.forEach((card) => {
  card.addEventListener("click", () => setMode(card.dataset.mode));
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;
  questionInput.value = "";
  runChat(question);
});

resetButton.addEventListener("click", resetConversation);

setMode("guide");


