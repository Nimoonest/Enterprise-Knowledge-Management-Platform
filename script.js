const modes = {
  library: {
    type: "insight",
    title: "知识库",
    subtitle: "查看潘婷测试知识库的资产结构、段落状态、问题映射和应用绑定情况。",
    prompts: ["全部知识", "只看待补强", "只看已绑定应用"],
  },
  coverage: {
    type: "insight",
    title: "知识覆盖",
    subtitle: "按业务意图、知识域、实体字段和风险边界检查潘婷测试知识库的覆盖缺口。",
    prompts: ["全部覆盖", "只看缺口", "业务视角"],
  },
  forbidden: {
    type: "insight",
    title: "违禁词管理",
    subtitle: "管理潘婷知识库回答中的医学化、绝对化、竞品攻击和无依据承诺风险词。",
    prompts: ["全部词库", "只看高风险", "待复核样本"],
  },
  guide: {
    type: "chat",
    appId: "45fa5cf6-79d2-11f1-8c78-56920ea5d652",
    appName: "AI导购模拟",
    title: "AI 导购模拟",
    subtitle: "连接 MaxKB 应用，根据发质、场景与需求推荐产品组合。",
    placeholder: "例如：我头发容易出油，发尾又干，用哪款比较合适？",
    prompts: [
      "我头发容易出油，发尾又干，用哪款比较合适？",
      "烫染后头发受损毛躁，适合什么护理？",
      "头皮敏感还能每天洗吗？",
      "我头屑比较多，适合哪款产品？",
    ],
  },
  chatbot: {
    type: "chat",
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
    type: "chat",
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
  employee: {
    type: "chat",
    local: true,
    appName: "企业知识查询",
    title: "企业知识查询",
    subtitle: "面向新员工和跨项目协作，快速查询企业产品、项目接口文档、源码仓库、负责团队和协作规范。",
    placeholder: "例如：本公司有什么产品？导购项目接口文档在哪？源码仓库怎么找？",
    prompts: [
      "本公司有什么产品？",
      "导购项目的接口文档在哪里？",
      "我想查看知识库前端源码，应该找哪个仓库？",
      "新员工应该先了解哪些企业信息？",
    ],
  },  metrics: {
    type: "insight",
    title: "效果度量",
    subtitle: "把 AI 导购、AI Chatbot 和 GEO 内容检验的运行表现沉淀为可汇报、可排查、可优化的效果看板。",
    prompts: ["总体表现", "应用对比", "风险与成本"],
  },
  lineage: {
    type: "insight",
    title: "知识溯源",
    subtitle: "展示用户问题从应用入口、检索配置、命中段落到最终回答的证据链路，便于审计和复核。",
    prompts: ["全部链路", "只看风险", "头屑样本"],
  },  map: {
    type: "insight",
    title: "知识地图",
    subtitle: "把潘婷测试知识库按业务目标、知识域和覆盖度展开，适合向业务方说明知识资产结构。",
    prompts: ["查看业务入口", "查看知识域覆盖", "查看待补强区域"],
  },
  graph: {
    type: "insight",
    title: "知识图谱",
    subtitle: "把品牌、产品、场景、规则、FAQ 与风险边界串成实体关系网络，适合解释 RAG 召回路径。",
    prompts: ["聚焦产品关系", "聚焦场景规则", "聚焦风险边界"],
  },
  inspection: {
    type: "insight",
    title: "质量巡检",
    subtitle: "参考 RAG 评估常用指标，巡检回答相关性、事实一致性、检索质量和安全边界。",
    prompts: ["全部指标", "只看风险", "应用视角"],
  },
  recall: {
    type: "insight",
    title: "召回测试",
    subtitle: "用预设问题集检查知识库命中率、Top 分和风险样本，适合演示 RAG 检索质量。",
    prompts: ["全部样本", "只看风险", "只看高分"],
  },
};


const libraryAssets = [
  {
    id: "products",
    title: "产品矩阵",
    category: "商品知识",
    paragraphs: 5,
    questions: 3,
    embeddings: 5,
    status: "已索引",
    coverage: 96,
    apps: ["AI导购模拟", "AI Chatbot模拟", "GEO内容检验"],
    items: ["强韧修护洗发水", "清爽控油洗发水", "去屑舒缓洗发水", "滋养顺滑护发素", "深层修护发膜"],
    summary: "覆盖核心 SKU、功效、适用人群和搭配关系，是导购和客服回答的主干知识。",
    sourceFile: "./sources/product-matrix.md",
    sourcePreview: "包含强韧修护洗发水、清爽控油洗发水、去屑舒缓洗发水、滋养顺滑护发素、深层修护发膜的功效、适用人群和搭配建议。",
  },
  {
    id: "rules",
    title: "导购规则",
    category: "场景知识",
    paragraphs: 4,
    questions: 3,
    embeddings: 4,
    status: "已索引",
    coverage: 90,
    apps: ["AI导购模拟"],
    items: ["出油但发尾干", "干枯毛躁受损", "头皮敏感", "头屑较多"],
    summary: "把用户发质和场景诉求映射到产品组合，决定导购回答是否像业务专家。",
    sourceFile: "./sources/guide-rules.md",
    sourcePreview: "覆盖出油但发尾干、干枯毛躁受损、头皮敏感、头屑较多四类导购场景及推荐组合。",
  },
  {
    id: "faq",
    title: "FAQ 问答",
    category: "客服知识",
    paragraphs: 6,
    questions: 6,
    embeddings: 6,
    status: "已索引",
    coverage: 88,
    apps: ["AI Chatbot模拟", "AI导购模拟"],
    items: ["是否每天使用", "主要功效", "敏感头皮", "出油发尾干", "烫染受损", "头屑较多"],
    summary: "覆盖常见问答与用户顾虑，适合验证客服回答准确性和一致性。",
    sourceFile: "./sources/faq.md",
    sourcePreview: "包含每日使用、主要功效、敏感头皮、出油发尾干、烫染受损、头屑较多等高频 FAQ。",
  },
  {
    id: "geo",
    title: "GEO 字段",
    category: "AI 搜索资产",
    paragraphs: 6,
    questions: 0,
    embeddings: 6,
    status: "已索引",
    coverage: 90,
    apps: ["GEO内容检验"],
    items: ["产品名称", "品类", "功效", "适用人群", "使用建议", "风险提示", "AI 搜索摘要建议"],
    summary: "用于结构化摘要和 AI 搜索可读性检查，已补充强韧修护、清爽控油和去屑舒缓洗发水的 SKU 字段。",
    sourceFile: "./sources/geo-fields.md",
    sourcePreview: "定义产品名称、品类、功效、适用人群、使用建议、风险提示和 AI 搜索摘要建议。",
  },
  {
    id: "boundaries",
    title: "内容边界",
    category: "合规规则",
    paragraphs: 4,
    questions: 0,
    embeddings: 4,
    status: "已索引",
    coverage: 92,
    apps: ["AI Chatbot模拟", "GEO内容检验"],
    items: ["不夸大功效", "不替代医疗建议", "无知识库内容时不编造", "头屑护理边界"],
    summary: "控制回答边界，避免医疗化、绝对化和无依据生成。",
    sourceFile: "./sources/content-boundaries.md",
    sourcePreview: "包含不夸大功效、不替代医疗建议、无知识库内容时不编造和头屑护理边界规则。"
  },
];
const knowledgeMap = [
  {
    id: "products",
    title: "产品矩阵",
    owner: "商品知识",
    coverage: 96,
    count: 4,
    status: "完整",
    color: "orange",
    items: ["强韧修护洗发水", "清爽控油洗发水", "去屑舒缓洗发水", "滋养顺滑护发素", "深层修护发膜"],
    business: ["AI导购模拟", "AI Chatbot模拟", "GEO内容检验"],
    gap: "可继续补充规格、容量、价格带和渠道信息。",
  },
  {
    id: "rules",
    title: "导购规则",
    owner: "场景知识",
    coverage: 90,
    count: 3,
    status: "可用",
    color: "green",
    items: ["出油但发尾干", "干枯毛躁受损", "头皮敏感", "头屑较多"],
    business: ["AI导购模拟"],
    gap: "建议补充季节、使用频率和多人群组合规则。",
  },
  {
    id: "faq",
    title: "FAQ 问答",
    owner: "客服知识",
    coverage: 88,
    count: 5,
    status: "可用",
    color: "blue",
    items: ["是否每天使用", "主要功效", "敏感头皮", "出油发尾干", "烫染受损", "头屑较多"],
    business: ["AI Chatbot模拟", "AI导购模拟"],
    gap: "可补充售后、购买渠道、适用年龄和搭配禁忌。",
  },
  {
    id: "geo",
    title: "GEO 字段",
    owner: "AI 搜索资产",
    coverage: 90,
    count: 7,
    status: "已索引",
    color: "purple",
    items: ["产品名称", "品类", "功效", "适用人群", "使用建议", "风险提示", "AI 搜索摘要建议"],
    business: ["GEO内容检验"],
    gap: "建议按每个 SKU 补齐结构化字段和搜索摘要版本。",
  },
  {
    id: "boundaries",
    title: "内容边界",
    owner: "合规规则",
    coverage: 92,
    count: 3,
    status: "完整",
    color: "teal",
    items: ["不夸大功效", "不替代医疗建议", "无知识库内容时不编造", "头屑护理边界"],
    business: ["AI Chatbot模拟", "GEO内容检验"],
    gap: "可增加品牌禁词、竞品对比边界和医学风险分级。",
  },
  {
    id: "recall",
    title: "召回测试关键词",
    owner: "检索评估",
    coverage: 76,
    count: 8,
    status: "待补强",
    color: "slate",
    items: ["出油", "发尾干", "烫染", "毛躁", "敏感", "发膜", "控油", "修护"],
    business: ["召回测试", "知识溯源"],
    gap: "建议加入长尾口语、错别字和复合诉求样本。",
  },
];


const coverageAreas = [
  { id: "sku", dimension: "SKU 产品知识", owner: "商品知识", coverage: 96, required: 4, covered: 4, status: "完整", priority: "高", business: ["AI导购模拟", "AI Chatbot模拟", "GEO内容检验"], signals: ["产品名称", "核心功效", "适用人群", "使用建议", "风险提示"], gaps: ["规格容量", "价格带", "购买渠道"], summary: "核心 SKU 均已覆盖，可支撑导购、客服和 GEO 摘要；下一步补商品规格和渠道信息。" },
  { id: "intent", dimension: "用户意图覆盖", owner: "场景知识", coverage: 86, required: 7, covered: 6, status: "可用", priority: "高", business: ["AI导购模拟", "召回测试"], signals: ["出油发尾干", "烫染受损", "头皮敏感", "每天使用", "功效咨询", "GEO 摘要"], gaps: ["季节性出油", "细软塌发", "多人群组合诉求"], summary: "高频导购和客服意图已可演示，长尾复合诉求仍需扩充问法和段落映射。" },
  { id: "faqCoverage", dimension: "FAQ 问题映射", owner: "客服知识", coverage: 88, required: 8, covered: 7, status: "可用", priority: "中", business: ["AI Chatbot模拟"], signals: ["每天使用", "主要功效", "敏感头皮", "出油发尾干", "烫染受损"], gaps: ["售后问题", "购买渠道", "适用年龄"], summary: "核心 FAQ 已覆盖，适合客服演示；商业服务类问题仍应提示知识库暂未收录。" },
  { id: "geoCoverage", dimension: "GEO 结构化字段", owner: "AI 搜索资产", coverage: 90, required: 7, covered: 7, status: "已索引", priority: "中", business: ["GEO内容检验"], signals: ["产品名称", "品类", "功效", "适用人群", "使用建议", "风险提示", "AI 搜索摘要"], gaps: ["每个 SKU 的摘要版本", "字段一致性校验"], summary: "结构化字段框架完整，可继续扩展到每个 SKU 的摘要模板和字段一致性检查。" },
  { id: "safetyCoverage", dimension: "合规与边界覆盖", owner: "内容边界", coverage: 92, required: 5, covered: 5, status: "完整", priority: "高", business: ["AI Chatbot模拟", "质量巡检", "违禁词管理"], signals: ["不夸大功效", "不替代医疗建议", "无知识不编造", "违禁词", "未知问题拒答"], gaps: ["竞品对比边界", "特殊人群风险分级"], summary: "基础安全边界已覆盖，可支撑医疗化、绝对化和无依据回答的拦截展示。" },
];

const inspectionChecks = [
  { id: "faithfulness", metric: "Faithfulness", label: "事实一致性", app: "AI Chatbot模拟", score: 92, threshold: 85, status: "通过", source: "Ragas / DeepEval", sample: "头皮敏感的人可以用吗？", finding: "回答使用了 FAQ 和内容边界中的局部测试、停止使用和咨询专业人士，没有添加知识库外承诺。", evidence: ["FAQ-头皮敏感能否使用", "内容边界-不替代医疗建议"], action: "继续保留风险提示模板。" },
  { id: "answerRelevancy", metric: "Response Relevancy", label: "回答相关性", app: "AI导购模拟", score: 89, threshold: 82, status: "通过", source: "Ragas", sample: "我头发容易出油，发尾又干，用哪款比较合适？", finding: "回答聚焦清爽控油洗发水和发尾护理组合，符合用户复合发质诉求。", evidence: ["导购规则-出油发尾干", "产品矩阵-清爽控油洗发水"], action: "补充季节性和细软塌发长尾意图。" },
  { id: "contextPrecision", metric: "Context Precision", label: "检索精确率", app: "召回测试", score: 84, threshold: 82, status: "通过", source: "Ragas / DeepEval", sample: "请用 JSON 总结产品名称、功效、适用人群和风险提示", finding: "Top 命中集中在 GEO 字段和内容边界，干扰段落较少。", evidence: ["GEO字段-产品名称", "GEO字段-风险提示", "内容边界-不夸大功效"], action: "按 SKU 增加 GEO 字段段落，减少泛化召回。" },
  { id: "contextRecall", metric: "Context Recall", label: "检索召回率", app: "召回测试", score: 78, threshold: 82, status: "关注", source: "Ragas / DeepEval", sample: "烫染后头发受损毛躁，适合什么护理？", finding: "强韧修护和发膜能被召回，但护发素搭配有时排名偏后。", evidence: ["导购规则-干枯毛躁受损", "产品矩阵-深层修护发膜"], action: "增加烫染、干枯、打结与护发素的映射样本。" },
  { id: "safety", metric: "Safety Boundary", label: "安全边界", app: "违禁词管理", score: 94, threshold: 90, status: "通过", source: "规则巡检", sample: "脱发严重是不是洗这个就能治好？", finding: "医学化问题会命中内容边界和违禁词管理规则，回答应拒绝治疗承诺。", evidence: ["内容边界-不可回答", "医学功效违禁词"], action: "继续补充医疗化长尾表达。" },
];
const forbiddenGroups = [
  {
    id: "medical",
    category: "医学功效",
    level: "高风险",
    status: "启用",
    owner: "内容边界",
    hitCount: 6,
    reviewCount: 2,
    action: "拦截并替换为风险提示",
    words: ["治疗脱发", "治愈头皮病", "根治头屑", "替代医生", "药效修复"],
    examples: ["脱发严重是不是洗这个就能治好？", "头皮病用潘婷能治愈吗？"],
    rule: "洗护产品不能承诺疾病治疗、诊断或医生替代，应引导用户咨询专业人士。",
  },
  {
    id: "absolute",
    category: "绝对化承诺",
    level: "高风险",
    status: "启用",
    owner: "品牌合规",
    hitCount: 4,
    reviewCount: 1,
    action: "改写为体验型表达",
    words: ["永久修复", "100%有效", "立刻见效", "彻底解决", "保证不出油"],
    examples: ["这款是不是能永久修复受损发质？"],
    rule: "避免绝对效果和保证式表达，统一改为护理体验、帮助改善、建议搭配等话术。",
  },
  {
    id: "competitor",
    category: "竞品攻击",
    level: "中风险",
    status: "启用",
    owner: "品牌合规",
    hitCount: 2,
    reviewCount: 0,
    action: "回避贬损并回到自身卖点",
    words: ["比某品牌强太多", "竞品没用", "其他品牌伤头皮", "吊打竞品"],
    examples: ["潘婷是不是比其他品牌都好？"],
    rule: "不贬低竞品，不做无依据横向比较，只说明潘婷已收录产品的适用场景。",
  },
  {
    id: "unsupported",
    category: "无依据信息",
    level: "中风险",
    status: "待复核",
    owner: "知识库",
    hitCount: 3,
    reviewCount: 3,
    action: "提示知识库暂未收录",
    words: ["具体价格", "全成分浓度", "线下门店库存", "孕妇专用", "儿童专用"],
    examples: ["这款具体多少钱？", "孕妇能不能用这款？"],
    rule: "知识库未覆盖价格、库存、特殊人群和成分浓度时，不编造答案。",
  },
];

const forbiddenSamples = [
  {
    id: "sample-medical",
    text: "脱发严重是不是洗潘婷强韧修护就能治好？",
    module: "AI Chatbot模拟",
    status: "拦截",
    hits: ["脱发", "治好"],
    action: "触发医学功效规则，建议改为咨询专业人士并说明知识库仅覆盖日常护理体验。",
  },
  {
    id: "sample-absolute",
    text: "清爽控油洗发水能保证一天都不出油吗？",
    module: "AI导购模拟",
    status: "改写",
    hits: ["保证", "不出油"],
    action: "触发绝对化承诺规则，改为帮助减少油腻感和保持清爽体验。",
  },
  {
    id: "sample-unknown",
    text: "潘婷这款线下门店现在多少钱？",
    module: "AI Chatbot模拟",
    status: "待复核",
    hits: ["线下门店", "多少钱"],
    action: "触发无依据信息规则，提示知识库暂未收录价格和渠道库存。",
  },
];
const employeeKnowledge = [
  {
    id: "company-products",
    title: "企业产品地图",
    type: "企业信息",
    keywords: ["公司", "本公司", "产品", "有什么产品", "业务", "平台"],
    content: "当前 Demo 中公司产品可按两层理解：一是潘婷品牌知识库应用，覆盖 AI 导购模拟、AI Chatbot 模拟、GEO 内容检验；二是企业知识管理平台能力，覆盖知识库、知识覆盖、召回测试、质量巡检、违禁词管理、知识地图、知识图谱、效果度量和知识溯源。",
    source: "./sources/company-handbook.md",
  },
  {
    id: "project-api-guide",
    title: "项目接口文档入口",
    type: "项目文档",
    keywords: ["接口", "api", "接口文档", "项目接口", "调用", "后端"],
    content: "前端统一请求本地代理 /api/chat。Node server.js 接收请求后调用 WSL Docker 容器内的 Python 脚本 /tmp/maxkb_call_app.py，再由脚本访问 MaxKB 应用。新增项目接口时建议先在项目 README 或 sources/api-index.md 登记接口路径、负责人、鉴权方式、请求示例和返回字段。",
    source: "./server.js",
  },
  {
    id: "source-repository",
    title: "源码与仓库入口",
    type: "源码入口",
    keywords: ["源码", "代码", "仓库", "github", "前端源码", "repo"],
    content: "当前前端 Demo 源码在 D:\\maxkb-demo-frontend，GitHub 仓库为 git@github.com:Nimoonest/Enterprise-Knowledge-Management-Platform.git。核心文件包括 index.html、styles.css、script.js、server.js 和 maxkb_call_app.py。",
    source: "git@github.com:Nimoonest/Enterprise-Knowledge-Management-Platform.git",
  },
  {
    id: "new-hire-path",
    title: "新员工熟悉路径",
    type: "入职指引",
    keywords: ["新员工", "入职", "熟悉", "了解", "培训", "上手"],
    content: "新员工建议按顺序了解：企业知识管理平台目标、潘婷测试知识库内容、三个业务应用入口、知识库源文件、召回测试样本、质量巡检规则、知识溯源链路和 GitHub 提交流程。需要跨项目协作时，优先查询项目接口文档、源码仓库、负责人和最近更新时间。",
    source: "./sources/company-handbook.md",
  },
  {
    id: "maxkb-operations",
    title: "MaxKB 本地服务信息",
    type: "运维信息",
    keywords: ["maxkb", "服务", "本地", "docker", "登录", "地址", "容器"],
    content: "MaxKB 本地地址为 http://localhost:8080，容器名 maxkb，运行在 WSL Ubuntu-22.04 Docker Engine 中。常用检查命令包括 docker ps、docker logs -f maxkb 和 docker restart maxkb。前端访问地址为 http://localhost:5178。",
    source: "./sources/ops-runbook.md",
  },
  {
    id: "collaboration-rule",
    title: "跨项目协作查询规范",
    type: "协作规范",
    keywords: ["跨项目", "其他项目", "负责人", "协作", "规范", "文档"],
    content: "跨项目查询建议至少返回四类信息：项目用途、接口文档入口、源码仓库入口、联系人或负责人。若知识库没有收录某个项目的接口或源码，应明确提示未收录，并建议补充到项目索引，而不是编造路径。",
    source: "./sources/project-index.md",
  },
];
const effectMetrics = [
  {
    id: "guide",
    app: "AI导购模拟",
    owner: "电商导购触点",
    sessions: 128,
    answerRate: 94,
    hitRate: 92,
    helpfulRate: 88,
    avgScore: 91,
    latency: 4.8,
    costLevel: "低",
    riskIncidents: 2,
    trend: [84, 87, 89, 91],
    signals: ["复合发质识别", "产品组合推荐", "风险提示覆盖"],
    issues: ["头屑+出油复合场景样本偏少", "缺少导购点击转化埋点"],
    actions: ["补充头屑与控油组合问法", "增加推荐采纳率和点击率字段", "把高频问题加入召回测试集"],
  },
  {
    id: "chatbot",
    app: "AI Chatbot模拟",
    owner: "客服问答触点",
    sessions: 96,
    answerRate: 91,
    hitRate: 89,
    helpfulRate: 84,
    avgScore: 87,
    latency: 5.2,
    costLevel: "中",
    riskIncidents: 5,
    trend: [80, 82, 85, 87],
    signals: ["FAQ 覆盖", "边界提示", "无依据拒答"],
    issues: ["价格、库存、特殊人群问题仍需明确拒答", "敏感头皮问法需要更多测试样本"],
    actions: ["把违禁词命中样本加入巡检", "补充客服兜底话术", "复核低分 FAQ 的段落标题"],
  },
  {
    id: "geo",
    app: "GEO内容检验",
    owner: "AI 搜索内容治理",
    sessions: 54,
    answerRate: 96,
    hitRate: 94,
    helpfulRate: 86,
    avgScore: 90,
    latency: 6.1,
    costLevel: "中",
    riskIncidents: 1,
    trend: [83, 86, 88, 90],
    signals: ["结构化字段完整", "摘要可读性", "风险边界保留"],
    issues: ["GEO 字段可加入品牌调性字段", "部分摘要还缺少使用建议"],
    actions: ["扩展 GEO 字段模板", "增加 JSON 合法性自动校验", "沉淀 AI 搜索摘要标准样例"],
  },
];

const lineageCases = [
  {
    id: "oil-dry",
    query: "我头发容易出油，发尾又干，用哪款比较合适？",
    app: "AI导购模拟",
    auditStatus: "已溯源",
    topScore: 0.94,
    risk: "无",
    answer: "建议发根选择清爽控油洗发水，发尾搭配滋养顺滑护发素或少量发膜。",
    route: ["用户问题", "AI导购模拟", "blend 检索 top_n=5", "命中导购规则与产品矩阵", "生成组合推荐"],
    evidence: [
      { title: "导购规则-出油发尾干", type: "场景知识", source: "./sources/guide-rules.md", score: 0.94, used: true, content: "发根容易出油但发尾干时，建议发根使用清爽控油洗发水，发尾搭配护发素或少量发膜。" },
      { title: "产品矩阵-清爽控油洗发水", type: "商品知识", source: "./sources/product-matrix.md", score: 0.89, used: true, content: "适合发根出油、需要清爽蓬松的人群，避免整头使用过度滋润型产品。" },
      { title: "FAQ-出油发尾干推荐", type: "FAQ", source: "./sources/faq.md", score: 0.84, used: true, content: "出油但发尾干时可组合控油洗发水和发尾护理产品。" },
    ],
  },
  {
    id: "dandruff",
    query: "我头屑比较多，适合哪款产品？",
    app: "AI导购模拟",
    auditStatus: "新增知识已命中",
    topScore: 0.92,
    risk: "头屑护理边界",
    answer: "可优先推荐潘婷去屑舒缓洗发水，并提示持续严重头屑或头皮不适需咨询专业人士。",
    route: ["用户问题", "AI导购模拟", "命中头屑知识", "叠加内容边界", "生成带风险提示的推荐"],
    evidence: [
      { title: "产品矩阵-去屑舒缓洗发水", type: "商品知识", source: "./sources/product-matrix.md", score: 0.92, used: true, content: "适合有头屑困扰、希望清洁头皮并获得舒缓护理体验的人群。" },
      { title: "导购规则-头屑较多", type: "场景知识", source: "./sources/guide-rules.md", score: 0.88, used: true, content: "头屑较多时优先推荐去屑舒缓洗发水，避免承诺治疗效果。" },
      { title: "内容边界-头屑护理", type: "合规规则", source: "./sources/boundary.md", score: 0.8, used: true, content: "头屑护理不应替代皮肤科诊断，严重或持续不适时建议咨询专业人士。" },
    ],
  },
  {
    id: "sensitive",
    query: "头皮敏感的人可以每天用吗？",
    app: "AI Chatbot模拟",
    auditStatus: "风险命中",
    topScore: 0.86,
    risk: "敏感头皮",
    answer: "建议先少量试用，若出现明显不适应停止使用；严重不适时咨询专业人士。",
    route: ["用户问题", "AI Chatbot模拟", "FAQ 命中", "合规边界命中", "生成谨慎回答"],
    evidence: [
      { title: "FAQ-头皮敏感能否使用", type: "FAQ", source: "./sources/faq.md", score: 0.86, used: true, content: "头皮敏感人群建议先少量试用，观察是否有不适。" },
      { title: "内容边界-不替代医疗建议", type: "合规规则", source: "./sources/boundary.md", score: 0.79, used: true, content: "产品建议不能替代医疗诊断或治疗建议。" },
      { title: "违禁词管理-医学化功效", type: "风险词库", source: "./sources/forbidden-words.md", score: 0.71, used: false, content: "避免使用治疗、根治、药效等医学化承诺。" },
    ],
  },
  {
    id: "geo-json",
    query: "请用 JSON 总结产品名称、功效、适用人群和风险提示",
    app: "GEO内容检验",
    auditStatus: "结构化可追溯",
    topScore: 0.88,
    risk: "摘要夸大风险",
    answer: "输出产品名称、品类、功效、适用人群、使用建议与风险提示等字段。",
    route: ["用户问题", "GEO内容检验", "GEO 字段检索", "内容边界复核", "生成结构化摘要"],
    evidence: [
      { title: "GEO字段-产品名称", type: "GEO 字段", source: "./sources/geo-fields.md", score: 0.88, used: true, content: "结构化内容应包含产品名称、品类、功效、适用人群和使用建议。" },
      { title: "GEO字段-风险提示", type: "GEO 字段", source: "./sources/geo-fields.md", score: 0.81, used: true, content: "摘要中应保留风险提示，避免夸大功效。" },
      { title: "内容边界-不夸大功效", type: "合规规则", source: "./sources/boundary.md", score: 0.74, used: true, content: "不承诺医学治疗或绝对效果。" },
    ],
  },
  {
    id: "medical-overclaim",
    query: "脱发严重是不是洗这个就能治好？",
    app: "AI Chatbot模拟",
    auditStatus: "风险命中",
    topScore: 0.83,
    risk: "医疗越界",
    answer: "知识库仅覆盖日常洗护体验，不能承诺治疗脱发；严重情况建议咨询专业人士。",
    route: ["用户问题", "AI Chatbot模拟", "医疗越界识别", "内容边界命中", "拒绝夸大承诺"],
    evidence: [
      { title: "内容边界-不替代医疗建议", type: "合规规则", source: "./sources/boundary.md", score: 0.83, used: true, content: "涉及严重脱发、疾病或持续不适，应建议咨询专业人士。" },
      { title: "内容边界-不夸大功效", type: "合规规则", source: "./sources/boundary.md", score: 0.77, used: true, content: "不得宣称洗护产品可治疗疾病或保证效果。" },
      { title: "FAQ-产品主要功效", type: "FAQ", source: "./sources/faq.md", score: 0.51, used: false, content: "产品知识覆盖日常清洁、控油、顺滑和修护护理体验。" },
    ],
  },
];
const recallTests = [
  {
    id: "oil-dry",
    query: "我头发容易出油，发尾又干，用哪款比较合适？",
    intent: "复合发质导购",
    expected: ["导购规则-出油发尾干", "产品矩阵-清爽控油洗发水", "FAQ-出油发尾干推荐"],
    hits: [
      { title: "导购规则-出油发尾干", score: 0.94, type: "场景知识", content: "建议发根使用清爽控油洗发水，发尾搭配滋养顺滑护发素或少量发膜。" },
      { title: "产品矩阵-清爽控油洗发水", score: 0.89, type: "商品知识", content: "适合发根出油、需要清爽蓬松的人群，避免过度滋润导致塌发。" },
      { title: "FAQ-出油发尾干推荐", score: 0.84, type: "FAQ", content: "出油但发尾干时可组合控油洗发水和发尾护理产品。" },
    ],
  },
  {
    id: "damaged",
    query: "烫染后头发受损毛躁，适合什么护理？",
    intent: "受损修护",
    expected: ["导购规则-干枯毛躁受损", "产品矩阵-强韧修护洗发水", "产品矩阵-深层修护发膜"],
    hits: [
      { title: "导购规则-干枯毛躁受损", score: 0.91, type: "场景知识", content: "干枯毛躁或烫染受损发质，优先选择修护型洗发水并搭配发膜。" },
      { title: "产品矩阵-深层修护发膜", score: 0.87, type: "商品知识", content: "用于加强护理，帮助改善干枯毛躁的护理体验。" },
      { title: "产品矩阵-强韧修护洗发水", score: 0.82, type: "商品知识", content: "适合脆弱、受损、烫染后的发质进行日常清洁护理。" },
    ],
  },
  {
    id: "sensitive",
    query: "头皮敏感的人可以每天用吗？",
    intent: "敏感风险边界",
    expected: ["FAQ-头皮敏感能否使用", "内容边界-不替代医疗建议", "导购规则-头皮敏感"],
    hits: [
      { title: "FAQ-头皮敏感能否使用", score: 0.86, type: "FAQ", content: "头皮敏感人群建议先少量试用，若有明显不适应停止使用。" },
      { title: "内容边界-不替代医疗建议", score: 0.79, type: "合规规则", content: "产品建议不能替代医疗诊断或治疗建议。" },
      { title: "导购规则-头皮敏感", score: 0.72, type: "场景知识", content: "敏感场景回答需要加入风险提示和温和建议。" },
    ],
  },
  {
    id: "geo-json",
    query: "请用 JSON 总结产品名称、功效、适用人群和风险提示",
    intent: "GEO 结构化提取",
    expected: ["GEO字段-产品名称", "GEO字段-功效", "GEO字段-风险提示"],
    hits: [
      { title: "GEO字段-产品名称", score: 0.88, type: "GEO 字段", content: "结构化内容应包含产品名称、品类、功效、适用人群和使用建议。" },
      { title: "GEO字段-风险提示", score: 0.81, type: "GEO 字段", content: "摘要中应保留风险提示，避免夸大功效。" },
      { title: "内容边界-不夸大功效", score: 0.74, type: "合规规则", content: "不能承诺医学治疗或绝对效果。" },
    ],
  },
  {
    id: "unknown-medical",
    query: "脱发严重是不是洗这个就能治好？",
    intent: "未知/医疗越界",
    expected: ["内容边界-不替代医疗建议", "内容边界-不夸大功效"],
    hits: [
      { title: "内容边界-不替代医疗建议", score: 0.83, type: "合规规则", content: "如涉及严重脱发、皮肤疾病或持续不适，应建议咨询专业人士。" },
      { title: "内容边界-不夸大功效", score: 0.77, type: "合规规则", content: "不得宣称洗护产品可治疗疾病或保证效果。" },
      { title: "FAQ-产品主要功效", score: 0.51, type: "FAQ", content: "产品知识只覆盖日常清洁、控油、顺滑和修护护理体验。" },
    ],
  },
];
const graphNodes = [
  { id: "brand", label: "潘婷", type: "品牌", x: 50, y: 45, size: "large", detail: "品牌中心节点，连接产品矩阵、业务应用和内容边界。" },
  { id: "kb", label: "潘婷测试知识库", type: "知识库", x: 50, y: 18, size: "medium", detail: "25 个段落、12 个问题、15 个问题映射、25 条 embedding 索引。" },
  { id: "repair", label: "强韧修护洗发水", type: "产品", x: 20, y: 30, size: "medium", detail: "适合受损、脆弱、烫染后护理场景。" },
  { id: "oil", label: "清爽控油洗发水", type: "产品", x: 22, y: 62, size: "medium", detail: "适合发根容易出油、需要清爽蓬松的用户。" },
  { id: "conditioner", label: "滋养顺滑护发素", type: "产品", x: 50, y: 76, size: "medium", detail: "适合发尾干、毛躁、需要顺滑护理的搭配场景。" },
  { id: "mask", label: "深层修护发膜", type: "产品", x: 78, y: 62, size: "medium", detail: "用于加强护理，适合干枯毛躁和受损发质。" },
  { id: "oilyDry", label: "出油但发尾干", type: "场景", x: 33, y: 47, size: "small", detail: "导购规则：发根控油，发尾搭配护发素或少量发膜。" },
  { id: "damaged", label: "烫染受损", type: "场景", x: 68, y: 38, size: "small", detail: "导购规则：优先修护类洗发水，搭配发膜加强护理。" },
  { id: "sensitive", label: "头皮敏感", type: "风险", x: 75, y: 23, size: "small", detail: "回答时需要提示个体差异，严重不适建议咨询专业人士。" },
  { id: "guideApp", label: "AI导购模拟", type: "应用", x: 35, y: 88, size: "small", detail: "把场景诉求转成产品组合和使用建议。" },
  { id: "chatApp", label: "AI Chatbot模拟", type: "应用", x: 62, y: 88, size: "small", detail: "面向 FAQ、产品说明和风险提示回答。" },
  { id: "geoApp", label: "GEO内容检验", type: "应用", x: 86, y: 82, size: "small", detail: "生成结构化摘要，检查 AI 搜索可读性。" },
  { id: "boundary", label: "内容边界", type: "合规", x: 86, y: 44, size: "small", detail: "不夸大功效、不替代医疗建议、无依据不编造。" },
];

const graphEdges = [
  ["kb", "brand", "承载"],
  ["brand", "repair", "包含"],
  ["brand", "oil", "包含"],
  ["brand", "conditioner", "包含"],
  ["brand", "mask", "包含"],
  ["oil", "oilyDry", "命中"],
  ["conditioner", "oilyDry", "搭配"],
  ["repair", "damaged", "适配"],
  ["mask", "damaged", "加强护理"],
  ["sensitive", "boundary", "受约束"],
  ["oilyDry", "guideApp", "驱动"],
  ["damaged", "guideApp", "驱动"],
  ["repair", "chatApp", "问答"],
  ["boundary", "chatApp", "约束"],
  ["brand", "geoApp", "摘要"],
  ["boundary", "geoApp", "校验"],
];

const sessions = {
  guide: { chatId: null, clientId: crypto.randomUUID() },
  chatbot: { chatId: null, clientId: crypto.randomUUID() },
  geo: { chatId: null, clientId: crypto.randomUUID() },
  employee: { chatId: null, clientId: crypto.randomUUID() },
};

let currentMode = "guide";
let pending = false;
let selectedGraphNode = "brand";
let selectedRecallId = recallTests[0].id;
let selectedLibraryId = libraryAssets[0].id;
let selectedCoverageId = coverageAreas[0].id;
let selectedForbiddenId = forbiddenGroups[0].id;
let selectedInspectionId = inspectionChecks[0].id;
let selectedMetricId = effectMetrics[0].id;
let selectedLineageId = lineageCases[0].id;

const modeGrid = document.querySelector("#modeGrid");
const mainPanel = document.querySelector("#mainPanel");
const tracePanel = document.querySelector("#tracePanel");
const modeCards = document.querySelectorAll(".mode-card");
const navItems = document.querySelectorAll(".nav-item");
const pageTitle = document.querySelector("#pageTitle");
const panelTitle = document.querySelector("#panelTitle");
const panelSubtitle = document.querySelector("#panelSubtitle");
const quickPrompts = document.querySelector("#quickPrompts");
const conversation = document.querySelector("#conversation");
const insightWorkspace = document.querySelector("#insightWorkspace");
const composer = document.querySelector("#composer");
const questionInput = document.querySelector("#questionInput");
const traceList = document.querySelector("#traceList");
const resetButton = document.querySelector("#resetButton");
const qualityScore = document.querySelector("#qualityScore");
const qualityBar = document.querySelector("#qualityBar");

function setMode(mode) {
  currentMode = mode;
  const data = modes[mode];
  const isInsight = data.type === "insight";
  const isKnowledgeSimulation = ["guide", "chatbot", "geo", "employee"].includes(mode);

  modeGrid.hidden = !isKnowledgeSimulation;
  mainPanel.classList.toggle("single-module", isInsight);
  tracePanel.hidden = isInsight;
  modeCards.forEach((card) => card.classList.toggle("active", card.dataset.mode === mode));
  navItems.forEach((item) => item.classList.toggle("active", item.textContent.trim() === navLabelForMode(mode)));
  pageTitle.textContent = data.title;
  panelTitle.textContent = data.title;
  panelSubtitle.textContent = data.subtitle;
  quickPrompts.innerHTML = "";

  data.prompts.forEach((prompt, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => handleQuickPrompt(prompt, index));
    quickPrompts.appendChild(button);
  });

  conversation.hidden = isInsight;
  insightWorkspace.hidden = !isInsight;
  composer.hidden = isInsight;

  if (isInsight) {
    renderInsight(mode);
    return;
  }

  questionInput.placeholder = data.placeholder;
  resetConversation();
}

function navLabelForMode(mode) {
  return {
    library: "知识库",
    coverage: "知识覆盖",
    forbidden: "违禁词管理",
    guide: "知识模拟",
    chatbot: "知识模拟",
    geo: "知识模拟",
    employee: "知识模拟",
    metrics: "效果度量",
    lineage: "知识溯源",
    map: "知识地图",
    graph: "知识图谱",
    inspection: "质量巡检",
    recall: "召回测试",
  }[mode];
}

function handleQuickPrompt(prompt, index) {
  if (modes[currentMode].type === "chat") {
    questionInput.value = prompt;
    runChat(prompt);
    return;
  }

  if (currentMode === "library") {
    renderLibrary(index);
    return;
  }

  if (currentMode === "coverage") {
    renderCoverage(index);
    return;
  }

  if (currentMode === "forbidden") {
    renderForbiddenManagement(index);
    return;
  }

  if (currentMode === "metrics") {
    renderEffectMetrics(index);
    return;
  }

  if (currentMode === "lineage") {
    renderLineage(index);
    return;
  }
  if (currentMode === "map") {
    renderKnowledgeMap(index);
    return;
  }

  if (currentMode === "recall") {
    renderRecallTest(index);
    return;
  }

  if (currentMode === "inspection") {
    renderInspection(index);
    return;
  }

  renderKnowledgeGraph(index);
}
function resetConversation() {
  const data = modes[currentMode];
  sessions[currentMode] = { chatId: null, clientId: crypto.randomUUID() };
  conversation.innerHTML = "";
  addMessage("assistant", data.local ? `你好，我是${data.title}，可以帮新员工查询企业产品、项目接口、源码仓库和协作规范。` : `你好，我是${data.title}，会直接调用 MaxKB 应用并基于潘婷测试知识库回答。`);
  renderTrace([], 0);
}

function renderInsight(mode) {
  if (mode === "library") {
    renderLibrary(0);
    return;
  }

  if (mode === "coverage") {
    renderCoverage(0);
    return;
  }

  if (mode === "forbidden") {
    renderForbiddenManagement(0);
    return;
  }

  if (mode === "metrics") {
    renderEffectMetrics(0);
    return;
  }

  if (mode === "lineage") {
    renderLineage(0);
    return;
  }
  if (mode === "map") {
    renderKnowledgeMap(0);
    return;
  }

  if (mode === "recall") {
    renderRecallTest(0);
    return;
  }

  if (mode === "inspection") {
    renderInspection(0);
    return;
  }

  renderKnowledgeGraph(0);
}
function renderLibrary(filterIndex = 0) {
  const visibleAssets = libraryAssets.filter((item) => {
    if (filterIndex === 1) return item.status !== "已索引" || item.coverage < 90;
    if (filterIndex === 2) return item.apps.length > 1;
    return true;
  });
  const assets = visibleAssets.length ? visibleAssets : libraryAssets;
  if (!assets.some((item) => item.id === selectedLibraryId)) {
    selectedLibraryId = assets[0].id;
  }
  const selected = assets.find((item) => item.id === selectedLibraryId) || assets[0];
  const totals = libraryAssets.reduce(
    (sum, item) => ({
      paragraphs: sum.paragraphs + item.paragraphs,
      questions: sum.questions + item.questions,
      embeddings: sum.embeddings + item.embeddings,
    }),
    { paragraphs: 0, questions: 0, embeddings: 0 },
  );
  const averageCoverage = Math.round(libraryAssets.reduce((sum, item) => sum + item.coverage, 0) / libraryAssets.length);

  insightWorkspace.innerHTML = `
    <div class="library-summary">
      ${renderMetric("知识段落", 25, "已完成 embedding 索引")}
      ${renderMetric("问题映射", 15, "覆盖高频用户问法")}
      ${renderMetric("索引条目", 25, "可用于 MaxKB 检索")}
      ${renderMetric("平均覆盖", `${averageCoverage}%`, "知识资产健康度")}
    </div>
    <div class="library-layout">
      <div class="library-assets">
        <div class="library-assets-head">
          <span>知识域</span>
          <span>段落</span>
          <span>问题</span>
          <span>索引</span>
          <span>状态</span>
        </div>
        ${assets.map(renderLibraryRow).join("")}
      </div>
      <aside class="library-detail">
        <span class="detail-type">${escapeHtml(selected.category)}</span>
        <h3>${escapeHtml(selected.title)}</h3>
        <p>${escapeHtml(selected.summary)}</p>
        <div class="library-health">
          <span>覆盖度</span>
          <strong>${selected.coverage}%</strong>
          <div class="coverage-bar"><span style="width: ${selected.coverage}%"></span></div>
        </div>
        <div class="source-box">
          <div>
            <h4>知识源文件</h4>
            <p>${escapeHtml(selected.sourcePreview)}</p>
          </div>
          <a href="${escapeHtml(selected.sourceFile)}" target="_blank" rel="noreferrer">查看源文件</a>
        </div>
        <div class="library-section">
          <h4>知识项</h4>
          <div class="tag-list">${selected.items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
        </div>
        <div class="library-section">
          <h4>绑定应用</h4>
          <div class="app-chip-list">${selected.apps.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
        </div>
      </aside>
    </div>
  `;

  insightWorkspace.querySelectorAll(".library-row").forEach((button) => {
    button.addEventListener("click", () => {
      selectedLibraryId = button.dataset.asset;
      renderLibrary(filterIndex);
    });
  });

  renderTrace(
    assets.map((item) => ({
      title: item.title,
      similarity: item.coverage / 100,
      content: `${item.category}：${item.paragraphs} 段、${item.questions} 个问题映射、${item.embeddings} 条索引。${item.summary}`,
    })),
    averageCoverage,
  );
}
function renderLibraryRow(item) {
  return `
    <button class="library-row ${item.id === selectedLibraryId ? "selected" : ""}" data-asset="${item.id}" type="button">
      <span><strong>${escapeHtml(item.title)}</strong><em>${escapeHtml(item.category)}</em></span>
      <span>${item.paragraphs}</span>
      <span>${item.questions}</span>
      <span>${item.embeddings}</span>
      <b class="${item.status === "已索引" ? "ready" : "todo"}">${escapeHtml(item.status)}</b>
    </button>
  `;
}
function renderEffectMetrics(viewIndex = 0) {
  const sortedMetrics = viewIndex === 1
    ? [...effectMetrics].sort((a, b) => b.sessions - a.sessions)
    : effectMetrics;
  const visibleMetrics = sortedMetrics.filter((item) => {
    if (viewIndex === 2) return item.riskIncidents > 1 || item.costLevel !== "低";
    return true;
  });
  const metrics = visibleMetrics.length ? visibleMetrics : effectMetrics;
  if (!metrics.some((item) => item.id === selectedMetricId)) {
    selectedMetricId = metrics[0].id;
  }
  const selected = metrics.find((item) => item.id === selectedMetricId) || metrics[0];
  const totalSessions = metrics.reduce((sum, item) => sum + item.sessions, 0);
  const avgAnswerRate = Math.round(metrics.reduce((sum, item) => sum + item.answerRate, 0) / metrics.length);
  const avgScore = Math.round(metrics.reduce((sum, item) => sum + item.avgScore, 0) / metrics.length);
  const riskTotal = metrics.reduce((sum, item) => sum + item.riskIncidents, 0);

  insightWorkspace.innerHTML = `
    <section class="metrics-summary">
      ${renderMetric("总会话", `${totalSessions}`, "当前演示样本")}
      ${renderMetric("有效回答率", `${avgAnswerRate}%`, "有依据且可用")}
      ${renderMetric("平均质量分", `${avgScore}`, "质量巡检口径")}
      ${renderMetric("风险拦截", `${riskTotal}`, "需复核样本")}
    </section>

    <section class="metrics-layout">
      <div class="panel-card metrics-table">
        <div class="metrics-table-head">
          <span>应用</span><span>会话</span><span>知识命中</span><span>质量分</span><span>耗时</span><span>风险</span>
        </div>
        ${metrics.map(renderMetricRow).join("")}
      </div>

      <aside class="panel-card metric-detail">
        <span class="eyebrow">${escapeHtml(selected.owner)}</span>
        <h3>${escapeHtml(selected.app)}</h3>
        <p>${escapeHtml(selected.signals.join(" / "))}</p>
        <div class="metric-detail-grid">
          <div><span>有帮助率</span><strong>${selected.helpfulRate}%</strong></div>
          <div><span>Token/成本</span><strong>${escapeHtml(selected.costLevel)}</strong></div>
          <div><span>平均耗时</span><strong>${selected.latency}s</strong></div>
          <div><span>风险样本</span><strong>${selected.riskIncidents}</strong></div>
        </div>
        <div class="trend-bars" aria-label="趋势">
          ${selected.trend.map((value) => `<span style="height:${value}%"><em>${value}</em></span>`).join("")}
        </div>
        <h4>当前问题</h4>
        <ul>${selected.issues.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        <h4>优化动作</h4>
        <ul>${selected.actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </aside>
    </section>

    <section class="metric-rubric">
      <div><strong>业务效果</strong><span>会话量、有帮助率、推荐采纳率</span></div>
      <div><strong>回答质量</strong><span>相关性、完整性、事实一致性</span></div>
      <div><strong>检索质量</strong><span>知识命中率、Top 分、缺口样本</span></div>
      <div><strong>成本性能</strong><span>响应耗时、Token 消耗、失败率</span></div>
      <div><strong>安全合规</strong><span>风险拦截、违禁词、医疗边界</span></div>
    </section>
  `;

  insightWorkspace.querySelectorAll("[data-metric-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMetricId = button.dataset.metricId;
      renderEffectMetrics(viewIndex);
    });
  });
}

function renderMetricRow(item) {
  return `
    <button class="metric-row ${item.id === selectedMetricId ? "active" : ""}" data-metric-id="${escapeHtml(item.id)}">
      <span><strong>${escapeHtml(item.app)}</strong><em>${escapeHtml(item.owner)}</em></span>
      <span>${item.sessions}</span>
      <span>${item.hitRate}%</span>
      <strong>${item.avgScore}</strong>
      <span>${item.latency}s</span>
      <span class="risk-pill ${item.riskIncidents > 2 ? "high" : ""}">${item.riskIncidents}</span>
    </button>
  `;
}

function renderLineage(filterIndex = 0) {
  const visibleCases = lineageCases.filter((item) => {
    if (filterIndex === 1) return item.risk !== "无" || item.auditStatus.includes("风险");
    if (filterIndex === 2) return item.id === "dandruff";
    return true;
  });
  const cases = visibleCases.length ? visibleCases : lineageCases;
  if (!cases.some((item) => item.id === selectedLineageId)) {
    selectedLineageId = cases[0].id;
  }
  const selected = cases.find((item) => item.id === selectedLineageId) || cases[0];
  const evidenceCount = selected.evidence.length;
  const usedCount = selected.evidence.filter((item) => item.used).length;
  const riskCount = cases.filter((item) => item.risk !== "无" || item.auditStatus.includes("风险")).length;
  const avgScore = Math.round((cases.reduce((sum, item) => sum + item.topScore, 0) / cases.length) * 100);

  insightWorkspace.innerHTML = `
    <section class="lineage-summary">
      ${renderMetric("溯源样本", `${cases.length}`, "可审计问题")}
      ${renderMetric("平均 Top 分", `${avgScore}`, "召回置信度")}
      ${renderMetric("当前证据", `${usedCount}/${evidenceCount}`, "用于回答")}
      ${renderMetric("风险链路", `${riskCount}`, "需人工复核")}
    </section>

    <section class="lineage-layout">
      <div class="panel-card lineage-case-list">
        ${cases.map(renderLineageRow).join("")}
      </div>

      <article class="panel-card lineage-detail">
        <div class="lineage-heading">
          <span class="eyebrow">${escapeHtml(selected.app)}</span>
          <span class="status-pill">${escapeHtml(selected.auditStatus)}</span>
        </div>
        <h3>${escapeHtml(selected.query)}</h3>
        <p>${escapeHtml(selected.answer)}</p>
        <div class="source-route">
          ${selected.route.map((step, index) => `<span>${index + 1}. ${escapeHtml(step)}</span>`).join("")}
        </div>
        <h4>命中证据</h4>
        <div class="evidence-grid">
          ${selected.evidence.map(renderEvidenceCard).join("")}
        </div>
      </article>
    </section>

    <section class="source-map-strip">
      <div><strong>产品矩阵</strong><span>./sources/product-matrix.md</span></div>
      <div><strong>导购规则</strong><span>./sources/guide-rules.md</span></div>
      <div><strong>FAQ</strong><span>./sources/faq.md</span></div>
      <div><strong>GEO 字段</strong><span>./sources/geo-fields.md</span></div>
      <div><strong>内容边界</strong><span>./sources/boundary.md</span></div>
    </section>
  `;

  insightWorkspace.querySelectorAll("[data-lineage-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedLineageId = button.dataset.lineageId;
      renderLineage(filterIndex);
    });
  });
}

function renderLineageRow(item) {
  return `
    <button class="lineage-row ${item.id === selectedLineageId ? "active" : ""}" data-lineage-id="${escapeHtml(item.id)}">
      <span><strong>${escapeHtml(item.query)}</strong><em>${escapeHtml(item.app)}</em></span>
      <span>${Math.round(item.topScore * 100)}</span>
      <span class="status-pill ${item.risk !== "无" ? "warn" : ""}">${escapeHtml(item.auditStatus)}</span>
    </button>
  `;
}

function renderEvidenceCard(item) {
  return `
    <div class="evidence-card ${item.used ? "used" : ""}">
      <div class="evidence-title">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${item.score.toFixed(2)}</span>
      </div>
      <div class="evidence-meta">
        <span>${escapeHtml(item.type)}</span>
        <span>${item.used ? "用于回答" : "仅作参考"}</span>
      </div>
      <p>${escapeHtml(item.content)}</p>
      <code>${escapeHtml(item.source)}</code>
    </div>
  `;
}
function renderKnowledgeMap(viewIndex = 0) {
  const sortedDomains = [...knowledgeMap].sort((a, b) => {
    if (viewIndex === 2) return a.coverage - b.coverage;
    return b.coverage - a.coverage;
  });
  const weakestDomain = [...knowledgeMap].sort((a, b) => a.coverage - b.coverage)[0];
  const average = Math.round(knowledgeMap.reduce((sum, item) => sum + item.coverage, 0) / knowledgeMap.length);
  const totalItems = knowledgeMap.reduce((sum, item) => sum + item.count, 0);

  insightWorkspace.innerHTML = `
    <div class="map-summary">
      ${renderMetric("知识域", knowledgeMap.length, "个核心模块")}
      ${renderMetric("知识项", totalItems, "条结构化资产")}
      ${renderMetric("平均覆盖", `${average}%`, "可演示水平")}
      ${renderMetric("低覆盖域", weakestDomain.title, weakestDomain.gap)}
    </div>
    <div class="knowledge-map-layout">
      <div class="domain-lane">
        ${sortedDomains.map(renderDomainCard).join("")}
      </div>
      <div class="business-map">
        <h3>业务入口覆盖</h3>
        ${renderBusinessRows()}
      </div>
    </div>
  `;

  renderTrace(
    sortedDomains.map((item) => ({
      title: item.title,
      similarity: item.coverage / 100,
      content: `${item.owner}，${item.count} 个知识项。${item.gap}`,
    })),
    average,
  );
}

function renderMetric(label, value, note) {
  return `
    <div class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <em>${escapeHtml(note)}</em>
    </div>
  `;
}

function renderDomainCard(item) {
  return `
    <article class="domain-card ${item.color}">
      <div class="domain-head">
        <div>
          <span class="domain-owner">${escapeHtml(item.owner)}</span>
          <h3>${escapeHtml(item.title)}</h3>
        </div>
        <span class="domain-status">${escapeHtml(item.status)}</span>
      </div>
      <div class="coverage-row">
        <span>覆盖度</span>
        <strong>${item.coverage}%</strong>
      </div>
      <div class="coverage-bar"><span style="width: ${item.coverage}%"></span></div>
      <div class="tag-list">
        ${item.items.map((entry) => `<span>${escapeHtml(entry)}</span>`).join("")}
      </div>
      <p>${escapeHtml(item.gap)}</p>
    </article>
  `;
}

function renderBusinessRows() {
  const rows = ["AI导购模拟", "AI Chatbot模拟", "GEO内容检验", "召回测试", "知识溯源"];
  return rows
    .map((row) => {
      const domains = knowledgeMap.filter((item) => item.business.includes(row));
      return `
        <div class="business-row">
          <span>${escapeHtml(row)}</span>
          <div>${domains.map((item) => `<strong class="${item.color}">${escapeHtml(item.title)}</strong>`).join("")}</div>
        </div>
      `;
    })
    .join("");
}




function renderCoverage(filterIndex = 0) {
  const visibleAreas = coverageAreas.filter((area) => {
    if (filterIndex === 1) return area.coverage < 90 || area.gaps.length > 1;
    if (filterIndex === 2) return area.priority === "高";
    return true;
  });
  const areas = visibleAreas.length ? visibleAreas : coverageAreas;
  if (!areas.some((area) => area.id === selectedCoverageId)) selectedCoverageId = areas[0].id;
  const selected = areas.find((area) => area.id === selectedCoverageId) || areas[0];
  const average = Math.round(coverageAreas.reduce((sum, area) => sum + area.coverage, 0) / coverageAreas.length);
  const requiredTotal = coverageAreas.reduce((sum, area) => sum + area.required, 0);
  const coveredTotal = coverageAreas.reduce((sum, area) => sum + area.covered, 0);
  const gapTotal = coverageAreas.reduce((sum, area) => sum + area.gaps.length, 0);

  insightWorkspace.innerHTML = `
    <div class="coverage-summary">
      ${renderMetric("覆盖维度", coverageAreas.length, "产品、意图、FAQ、GEO、边界")}
      ${renderMetric("覆盖项", `${coveredTotal}/${requiredTotal}`, "已完成核心资产")}
      ${renderMetric("平均覆盖", `${average}%`, "知识资产覆盖水平")}
      ${renderMetric("缺口项", gapTotal, "建议后续补强")}
    </div>
    <div class="coverage-layout">
      <div class="coverage-board">${areas.map(renderCoverageCard).join("")}</div>
      <aside class="coverage-detail">
        <span class="detail-type">${escapeHtml(selected.owner)}</span>
        <h3>${escapeHtml(selected.dimension)}</h3>
        <p>${escapeHtml(selected.summary)}</p>
        <div class="coverage-score-block"><span>覆盖率</span><strong>${selected.coverage}%</strong><div class="coverage-bar"><span style="width: ${selected.coverage}%"></span></div></div>
        <div class="library-section"><h4>已覆盖信号</h4><div class="tag-list">${selected.signals.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div>
        <div class="library-section"><h4>待补缺口</h4><div class="coverage-gap-list">${selected.gaps.map((gap) => `<span>${escapeHtml(gap)}</span>`).join("")}</div></div>
        <div class="library-section"><h4>业务入口</h4><div class="app-chip-list">${selected.business.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div>
      </aside>
    </div>
  `;
  insightWorkspace.querySelectorAll(".coverage-card").forEach((button) => button.addEventListener("click", () => { selectedCoverageId = button.dataset.coverage; renderCoverage(filterIndex); }));
  renderTrace(areas.map((area) => ({ title: area.dimension, similarity: area.coverage / 100, content: `${area.owner}：${area.covered}/${area.required} 项覆盖。缺口：${area.gaps.join("、")}` })), average);
}

function renderCoverageCard(area) {
  return `
    <button class="coverage-card ${area.id === selectedCoverageId ? "selected" : ""}" data-coverage="${area.id}" type="button">
      <div class="coverage-card-head"><span>${escapeHtml(area.owner)}</span><b class="${area.coverage >= 90 ? "pass" : area.coverage >= 82 ? "watch" : "risk"}">${escapeHtml(area.status)}</b></div>
      <h3>${escapeHtml(area.dimension)}</h3>
      <div class="coverage-row"><span>${area.covered}/${area.required} 项</span><strong>${area.coverage}%</strong></div>
      <div class="coverage-bar"><span style="width: ${area.coverage}%"></span></div>
      <p>${escapeHtml(area.summary)}</p>
    </button>
  `;
}

function renderInspection(filterIndex = 0) {
  const visibleChecks = inspectionChecks.filter((check) => {
    if (filterIndex === 1) return check.status !== "通过" || check.score < check.threshold;
    if (filterIndex === 2) return ["AI导购模拟", "AI Chatbot模拟", "GEO内容检验"].includes(check.app);
    return true;
  });
  const checks = visibleChecks.length ? visibleChecks : inspectionChecks;
  if (!checks.some((check) => check.id === selectedInspectionId)) selectedInspectionId = checks[0].id;
  const selected = checks.find((check) => check.id === selectedInspectionId) || checks[0];
  const average = Math.round(inspectionChecks.reduce((sum, check) => sum + check.score, 0) / inspectionChecks.length);
  const passCount = inspectionChecks.filter((check) => check.status === "通过").length;
  const lowest = [...inspectionChecks].sort((a, b) => a.score - b.score)[0];

  insightWorkspace.innerHTML = `
    <div class="inspection-summary">
      ${renderMetric("巡检指标", inspectionChecks.length, "RAG 质量与安全")}
      ${renderMetric("通过指标", `${passCount}/${inspectionChecks.length}`, "达到阈值")}
      ${renderMetric("平均得分", `${average}%`, "模拟评估得分")}
      ${renderMetric("最低项", lowest.label, `${lowest.score}% / 阈值 ${lowest.threshold}%`)}
    </div>
    <div class="inspection-layout">
      <div class="inspection-table"><div class="inspection-table-head"><span>指标</span><span>应用</span><span>得分</span><span>阈值</span><span>状态</span></div>${checks.map(renderInspectionRow).join("")}</div>
      <aside class="inspection-detail">
        <span class="detail-type">${escapeHtml(selected.source)}</span>
        <h3>${escapeHtml(selected.label)}</h3>
        <p>${escapeHtml(selected.finding)}</p>
        <div class="inspection-score-line"><strong>${selected.score}%</strong><span>${escapeHtml(selected.metric)} / 阈值 ${selected.threshold}%</span></div>
        <div class="library-section"><h4>巡检样本</h4><div class="inspection-sample">${escapeHtml(selected.sample)}</div></div>
        <div class="library-section"><h4>证据段落</h4><div class="expected-list">${selected.evidence.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div>
        <div class="library-section"><h4>建议动作</h4><p>${escapeHtml(selected.action)}</p></div>
      </aside>
    </div>
  `;
  insightWorkspace.querySelectorAll(".inspection-row").forEach((button) => button.addEventListener("click", () => { selectedInspectionId = button.dataset.inspection; renderInspection(filterIndex); }));
  renderTrace(checks.map((check) => ({ title: check.label, similarity: check.score / 100, content: `${check.metric}：${check.finding}` })), average);
}

function renderInspectionRow(check) {
  return `
    <button class="inspection-row ${check.id === selectedInspectionId ? "selected" : ""}" data-inspection="${check.id}" type="button">
      <span><strong>${escapeHtml(check.label)}</strong><em>${escapeHtml(check.metric)}</em></span>
      <span>${escapeHtml(check.app)}</span>
      <strong>${check.score}%</strong>
      <span>${check.threshold}%</span>
      <em class="${check.status === "通过" ? "pass" : "watch"}">${escapeHtml(check.status)}</em>
    </button>
  `;
}
function renderForbiddenManagement(filterIndex = 0) {
  const visibleGroups = forbiddenGroups.filter((group) => {
    if (filterIndex === 1) return group.level === "高风险";
    if (filterIndex === 2) return group.reviewCount > 0 || group.status === "待复核";
    return true;
  });
  const groups = visibleGroups.length ? visibleGroups : forbiddenGroups;
  if (!groups.some((group) => group.id === selectedForbiddenId)) {
    selectedForbiddenId = groups[0].id;
  }
  const selected = groups.find((group) => group.id === selectedForbiddenId) || groups[0];
  const totalWords = forbiddenGroups.reduce((sum, group) => sum + group.words.length, 0);
  const highRisk = forbiddenGroups.filter((group) => group.level === "高风险").length;
  const reviewTotal = forbiddenGroups.reduce((sum, group) => sum + group.reviewCount, 0);
  const activeRate = Math.round((forbiddenGroups.filter((group) => group.status === "启用").length / forbiddenGroups.length) * 100);
  const sampleRows = forbiddenSamples.filter((sample) => filterIndex !== 2 || sample.status === "待复核");

  insightWorkspace.innerHTML = `
    <div class="forbidden-summary">
      ${renderMetric("规则分组", forbiddenGroups.length, "覆盖品牌合规和知识边界")}
      ${renderMetric("违禁词", totalWords, "已纳入演示词库")}
      ${renderMetric("高风险组", highRisk, "医学化与绝对化优先拦截")}
      ${renderMetric("待复核", reviewTotal, "需运营确认的命中样本")}
    </div>
    <div class="forbidden-layout">
      <div class="forbidden-table">
        <div class="forbidden-table-head">
          <span>规则分组</span>
          <span>风险</span>
          <span>词数</span>
          <span>命中</span>
          <span>状态</span>
        </div>
        ${groups.map(renderForbiddenRow).join("")}
      </div>
      <aside class="forbidden-detail">
        <span class="detail-type">${escapeHtml(selected.owner)}</span>
        <h3>${escapeHtml(selected.category)}</h3>
        <p>${escapeHtml(selected.rule)}</p>
        <div class="forbidden-action">
          <span>处理策略</span>
          <strong>${escapeHtml(selected.action)}</strong>
        </div>
        <div class="library-section">
          <h4>词库</h4>
          <div class="forbidden-word-list">${selected.words.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}</div>
        </div>
        <div class="library-section">
          <h4>触发样例</h4>
          <div class="forbidden-example-list">${selected.examples.map((example) => `<p>${escapeHtml(example)}</p>`).join("")}</div>
        </div>
      </aside>
    </div>
    <div class="forbidden-samples">
      <div class="forbidden-samples-head">
        <h3>样本文案检测</h3>
        <span>${activeRate}% 规则启用</span>
      </div>
      <div class="sample-grid">${sampleRows.map(renderForbiddenSample).join("")}</div>
    </div>
  `;

  insightWorkspace.querySelectorAll(".forbidden-row").forEach((button) => {
    button.addEventListener("click", () => {
      selectedForbiddenId = button.dataset.forbidden;
      renderForbiddenManagement(filterIndex);
    });
  });

  renderTrace(
    groups.map((group) => ({
      title: group.category,
      similarity: group.level === "高风险" ? 0.96 : 0.86,
      content: `${group.owner}：${group.words.join("、")}。${group.action}`,
    })),
    activeRate,
  );
}

function renderForbiddenRow(group) {
  return `
    <button class="forbidden-row ${group.id === selectedForbiddenId ? "selected" : ""}" data-forbidden="${group.id}" type="button">
      <span><strong>${escapeHtml(group.category)}</strong><em>${escapeHtml(group.owner)}</em></span>
      <b class="${group.level === "高风险" ? "risk" : "watch"}">${escapeHtml(group.level)}</b>
      <span>${group.words.length}</span>
      <span>${group.hitCount}</span>
      <em class="${group.status === "启用" ? "pass" : "watch"}">${escapeHtml(group.status)}</em>
    </button>
  `;
}

function renderForbiddenSample(sample) {
  return `
    <article class="sample-card">
      <div class="sample-card-head">
        <span>${escapeHtml(sample.module)}</span>
        <strong class="${sample.status === "拦截" ? "risk" : sample.status === "待复核" ? "watch" : "pass"}">${escapeHtml(sample.status)}</strong>
      </div>
      <p>${escapeHtml(sample.text)}</p>
      <div class="forbidden-word-list small">${sample.hits.map((hit) => `<span>${escapeHtml(hit)}</span>`).join("")}</div>
      <em>${escapeHtml(sample.action)}</em>
    </article>
  `;
}
function renderRecallTest(filterIndex = 0) {
  const enriched = recallTests.map(scoreRecallTest);
  const filtered = enriched.filter((item) => {
    if (filterIndex === 1) return item.status !== "通过";
    if (filterIndex === 2) return item.topScore >= 0.86;
    return true;
  });
  const visibleTests = filtered.length ? filtered : enriched;
  if (!visibleTests.some((item) => item.id === selectedRecallId)) {
    selectedRecallId = visibleTests[0].id;
  }
  const selected = visibleTests.find((item) => item.id === selectedRecallId) || visibleTests[0];
  const passCount = enriched.filter((item) => item.status === "通过").length;
  const averageTopScore = Math.round((enriched.reduce((sum, item) => sum + item.topScore, 0) / enriched.length) * 100);
  const hitRate = Math.round((enriched.reduce((sum, item) => sum + item.expectedHitRate, 0) / enriched.length) * 100);

  insightWorkspace.innerHTML = `
    <div class="recall-summary">
      ${renderMetric("测试样本", enriched.length, "覆盖导购、FAQ、GEO、边界")}
      ${renderMetric("通过样本", `${passCount}/${enriched.length}`, "Top 命中满足预期")}
      ${renderMetric("平均 Top 分", `${averageTopScore}%`, "模拟综合相似度")}
      ${renderMetric("预期命中率", `${hitRate}%`, "命中 expected 段落比例")}
    </div>
    <div class="recall-layout">
      <div class="recall-table">
        <div class="recall-table-head">
          <span>测试问题</span>
          <span>意图</span>
          <span>Top 分</span>
          <span>状态</span>
        </div>
        ${visibleTests.map(renderRecallRow).join("")}
      </div>
      <aside class="recall-detail">
        <span class="detail-type">${escapeHtml(selected.intent)}</span>
        <h3>${escapeHtml(selected.query)}</h3>
        <div class="recall-score-line">
          <strong>${Math.round(selected.topScore * 100)}%</strong>
          <span>${escapeHtml(selected.statusText)}</span>
        </div>
        <div class="expected-list">
          ${selected.expected.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="hit-list">
          ${selected.hits.map(renderRecallHit).join("")}
        </div>
      </aside>
    </div>
  `;

  insightWorkspace.querySelectorAll(".recall-row").forEach((button) => {
    button.addEventListener("click", () => {
      selectedRecallId = button.dataset.recall;
      renderRecallTest(filterIndex);
    });
  });

  renderTrace(
    selected.hits.map((hit) => ({
      title: hit.title,
      similarity: hit.score,
      content: `${hit.type}：${hit.content}`,
    })),
    Math.round(selected.topScore * 100),
  );
}

function scoreRecallTest(test) {
  const topScore = Math.max(...test.hits.map((hit) => hit.score));
  const expectedHitCount = test.expected.filter((expected) => test.hits.some((hit) => hit.title === expected)).length;
  const expectedHitRate = expectedHitCount / test.expected.length;
  const status = topScore >= 0.82 && expectedHitRate >= 0.6 ? "通过" : topScore >= 0.72 ? "关注" : "风险";
  const statusText = status === "通过" ? "召回稳定" : status === "关注" ? "需要复核命中段落" : "建议补充知识或改写问题映射";
  return { ...test, topScore, expectedHitRate, status, statusText };
}

function renderRecallRow(item) {
  return `
    <button class="recall-row ${item.id === selectedRecallId ? "selected" : ""}" data-recall="${item.id}" type="button">
      <span>${escapeHtml(item.query)}</span>
      <span>${escapeHtml(item.intent)}</span>
      <strong>${Math.round(item.topScore * 100)}%</strong>
      <em class="${item.status === "通过" ? "pass" : item.status === "关注" ? "watch" : "risk"}">${escapeHtml(item.status)}</em>
    </button>
  `;
}

function renderRecallHit(hit, index) {
  return `
    <article class="hit-card">
      <div class="hit-card-head">
        <span>Top ${index + 1}</span>
        <strong>${Math.round(hit.score * 100)}%</strong>
      </div>
      <h4>${escapeHtml(hit.title)}</h4>
      <p>${escapeHtml(hit.content)}</p>
      <em>${escapeHtml(hit.type)}</em>
    </article>
  `;
}
function renderKnowledgeGraph(focusIndex = 0) {
  const focusGroups = ["产品", "场景", "合规"];
  const focusType = focusGroups[focusIndex] || "产品";
  const selected = graphNodes.find((node) => node.id === selectedGraphNode) || graphNodes[0];
  const edgeLines = graphEdges.map(([from, to, label]) => renderEdge(from, to, label, focusType)).join("");
  const nodeButtons = graphNodes.map((node) => renderGraphNode(node, focusType)).join("");

  insightWorkspace.innerHTML = `
    <div class="graph-shell">
      <div class="graph-canvas" aria-label="知识图谱网络">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${edgeLines}
        </svg>
        ${nodeButtons}
      </div>
      <aside class="node-detail">
        <span class="detail-type">${escapeHtml(selected.type)}</span>
        <h3>${escapeHtml(selected.label)}</h3>
        <p>${escapeHtml(selected.detail)}</p>
        <div class="relation-list">
          ${renderRelations(selected.id)}
        </div>
      </aside>
    </div>
  `;

  insightWorkspace.querySelectorAll(".graph-node").forEach((button) => {
    button.addEventListener("click", () => {
      selectedGraphNode = button.dataset.node;
      renderKnowledgeGraph(focusIndex);
    });
  });

  renderTrace(
    graphEdges
      .filter(([from, to]) => from === selected.id || to === selected.id)
      .map(([from, to, label]) => ({
        title: label,
        similarity: 0.92,
        content: `${nodeLabel(from)} -> ${nodeLabel(to)}`,
      })),
    94,
  );
}

function renderEdge(fromId, toId, label, focusType) {
  const from = graphNodes.find((node) => node.id === fromId);
  const to = graphNodes.find((node) => node.id === toId);
  const isFocus = from.type === focusType || to.type === focusType;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  return `
    <line class="graph-edge ${isFocus ? "focus" : ""}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>
    <text class="edge-label" x="${midX}" y="${midY}">${escapeHtml(label)}</text>
  `;
}

function renderGraphNode(node, focusType) {
  const isSelected = node.id === selectedGraphNode;
  const isFocus = node.type === focusType || node.type === "品牌" || node.type === "知识库";
  return `
    <button class="graph-node ${node.size} ${isSelected ? "selected" : ""} ${isFocus ? "focus" : "muted"}" data-node="${node.id}" style="left: ${node.x}%; top: ${node.y}%" type="button">
      <span>${escapeHtml(node.label)}</span>
      <em>${escapeHtml(node.type)}</em>
    </button>
  `;
}

function renderRelations(nodeId) {
  const rows = graphEdges.filter(([from, to]) => from === nodeId || to === nodeId);
  if (!rows.length) return "<span>暂无直接关系</span>";
  return rows
    .map(([from, to, label]) => `<div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(nodeLabel(from))} -> ${escapeHtml(nodeLabel(to))}</span></div>`)
    .join("");
}

function nodeLabel(id) {
  return graphNodes.find((node) => node.id === id)?.label || id;
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

function answerEmployeeKnowledge(question) {
  const normalized = question.toLowerCase();
  const scored = employeeKnowledge
    .map((item) => {
      const score = item.keywords.reduce((sum, keyword) => {
        const key = keyword.toLowerCase();
        return sum + (normalized.includes(key) || question.includes(keyword) ? 1 : 0);
      }, 0);
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);
  const hits = scored.filter((item) => item.score > 0).slice(0, 3);
  const selected = hits.length ? hits : employeeKnowledge.slice(0, 3);
  const lead = hits.length
    ? "根据企业知识索引，可以这样理解："
    : "当前没有命中非常精确的企业知识条目，先给你一份通用企业信息索引：";
  const answer = [
    lead,
    ...selected.map((item, index) => `${index + 1}. ${item.title}：${item.content}`),
    "\n后续如果接入真实企业知识库，可以把项目 README、接口 OpenAPI、代码仓库索引、负责人信息和权限说明导入 MaxKB，并把本模块切换为企业内部 RAG 应用。",
  ].join("\n");

  return {
    answer,
    quality_score: hits.length ? 91 : 76,
    traces: selected.map((item) => ({
      title: item.title,
      content: item.content,
      similarity: item.score ? Math.min(0.98, 0.72 + item.score * 0.08) : 0.55,
      source: item.source,
    })),
  };
}
async function runChat(question) {
  if (pending) return;
  pending = true;

  const data = modes[currentMode];
  const session = sessions[currentMode];
  addMessage("user", question);
  const loadingBubble = addMessage("assistant", data.local ? "正在查询企业知识索引..." : "正在调用 MaxKB 应用...");
  setComposerState(false);

  if (data.local) {
    try {
      const result = answerEmployeeKnowledge(question);
      loadingBubble.textContent = result.answer;
      renderTrace(result.traces || [], result.quality_score || 0);
    } finally {
      pending = false;
      setComposerState(true);
    }
    return;
  }

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

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    if (item.dataset.navMode) setMode(item.dataset.navMode);
  });
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;
  questionInput.value = "";
  runChat(question);
});

resetButton.addEventListener("click", () => setMode(currentMode));

setMode("library");
