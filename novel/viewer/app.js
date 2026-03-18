const DATASET_FILES = [
  { key: "characters", path: "../config/characters.json" },
  { key: "plotlines", path: "../config/plotlines.json" },
  { key: "maps", path: "../config/maps.json" },
  { key: "monsters", path: "../config/monsters.json" },
  { key: "skills", path: "../config/skills.json" },
  { key: "equipments", path: "../config/equipments.json" },
  { key: "factions", path: "../config/factions.json" },
  { key: "timeline", path: "../config/timeline.json" }
];

const state = {
  datasets: new Map(),
  activeKey: "characters",
  search: "",
  tag: "",
  selectedId: "",
  showRaw: false
};

const els = {
  categoryTabs: document.getElementById("categoryTabs"),
  searchInput: document.getElementById("searchInput"),
  tagSelect: document.getElementById("tagSelect"),
  datasetTitle: document.getElementById("datasetTitle"),
  datasetDesc: document.getElementById("datasetDesc"),
  datasetCount: document.getElementById("datasetCount"),
  cardsContainer: document.getElementById("cardsContainer"),
  detailPanel: document.getElementById("detailPanel"),
  rawPanel: document.getElementById("rawPanel"),
  toggleRawBtn: document.getElementById("toggleRawBtn")
};

init().catch((err) => {
  els.datasetTitle.textContent = "加载失败";
  els.datasetDesc.textContent = String(err);
  els.datasetCount.textContent = "请检查是否通过 HTTP 服务访问页面。";
});

async function init() {
  const requests = DATASET_FILES.map(async (item) => {
    const res = await fetch(item.path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`读取失败: ${item.path}`);
    }
    const json = await res.json();
    state.datasets.set(item.key, json);
  });

  await Promise.all(requests);
  renderTabs();
  bindEvents();
  switchDataset(state.activeKey);
}

function bindEvents() {
  els.searchInput.addEventListener("input", (e) => {
    state.search = e.target.value.trim().toLowerCase();
    syncSelectionWithFilteredItems();
    renderCards();
    renderDetail();
  });

  els.tagSelect.addEventListener("change", (e) => {
    state.tag = e.target.value;
    syncSelectionWithFilteredItems();
    renderCards();
    renderDetail();
  });

  els.toggleRawBtn.addEventListener("click", () => {
    state.showRaw = !state.showRaw;
    els.rawPanel.classList.toggle("hidden", !state.showRaw);
    els.toggleRawBtn.textContent = state.showRaw ? "隐藏原始 JSON" : "显示原始 JSON";
    renderRawPanel();
  });
}

function renderTabs() {
  els.categoryTabs.innerHTML = "";
  for (const { key } of DATASET_FILES) {
    const ds = state.datasets.get(key);
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.type = "button";
    btn.textContent = ds?.displayName || key;
    btn.addEventListener("click", () => switchDataset(key));
    els.categoryTabs.appendChild(btn);
  }
  updateActiveTab();
}

function updateActiveTab() {
  const buttons = els.categoryTabs.querySelectorAll(".tab-btn");
  buttons.forEach((btn, index) => {
    const key = DATASET_FILES[index].key;
    btn.classList.toggle("active", key === state.activeKey);
  });
}

function switchDataset(key) {
  state.activeKey = key;
  state.search = "";
  state.tag = "";
  state.selectedId = "";
  els.searchInput.value = "";
  els.tagSelect.value = "";
  updateActiveTab();
  renderDatasetMeta();
  renderTagOptions();
  syncSelectionWithFilteredItems();
  renderCards();
  renderDetail();
  renderRawPanel();
}

function currentDataset() {
  return state.datasets.get(state.activeKey) || { items: [] };
}

function getFilteredItems() {
  const ds = currentDataset();
  const items = Array.isArray(ds.items) ? ds.items : [];
  return items.filter((item) => {
    const searchOk = !state.search || serialize(item).includes(state.search);
    const tags = extractTags(item);
    const tagOk = !state.tag || tags.includes(state.tag);
    return searchOk && tagOk;
  });
}

function serialize(item) {
  return JSON.stringify(item).toLowerCase();
}

function extractTags(item) {
  const tagSet = new Set();

  if (Array.isArray(item.tags)) {
    item.tags.forEach((t) => tagSet.add(String(t)));
  }

  const scalarKeys = [
    "role",
    "faction",
    "stage",
    "rank",
    "rarity",
    "type",
    "state",
    "chapter",
    "chapterRange",
    "threatLevel",
    "status",
    "zoneType"
  ];

  scalarKeys.forEach((k) => {
    if (item[k] && typeof item[k] === "string") {
      tagSet.add(item[k]);
    }
  });

  return [...tagSet];
}

function renderDatasetMeta() {
  const ds = currentDataset();
  els.datasetTitle.textContent = ds.displayName || state.activeKey;
  els.datasetDesc.textContent = ds.description || "";
}

function renderTagOptions() {
  const ds = currentDataset();
  const items = Array.isArray(ds.items) ? ds.items : [];
  const allTags = new Set();

  items.forEach((item) => {
    extractTags(item).forEach((tag) => allTags.add(tag));
  });

  els.tagSelect.innerHTML = '<option value="">全部标签</option>';
  [...allTags]
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
    .forEach((tag) => {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag;
      els.tagSelect.appendChild(option);
    });
}

function syncSelectionWithFilteredItems() {
  const filtered = getFilteredItems();
  if (!filtered.length) {
    state.selectedId = "";
    return;
  }
  const stillExists = filtered.some((it) => it.id === state.selectedId);
  if (!stillExists) {
    state.selectedId = filtered[0].id || "";
  }
}

function renderCards() {
  const ds = currentDataset();
  const items = Array.isArray(ds.items) ? ds.items : [];
  const filtered = getFilteredItems();
  els.cardsContainer.innerHTML = "";
  els.datasetCount.textContent = `共 ${items.length} 条，当前匹配 ${filtered.length} 条`;

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "没有匹配结果，尝试清空搜索或切换标签。";
    els.cardsContainer.appendChild(empty);
    return;
  }

  filtered.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    if (item.id === state.selectedId) {
      card.classList.add("active");
    }
    card.addEventListener("click", () => {
      state.selectedId = item.id;
      renderCards();
      renderDetail();
      renderRawPanel();
    });

    const title = document.createElement("h3");
    title.textContent = getItemTitle(ds, item);

    const summary = document.createElement("p");
    summary.textContent = getItemSummary(item);

    const chips = document.createElement("div");
    chips.className = "chips";
    extractTags(item)
      .slice(0, 4)
      .forEach((tag) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = tag;
        chips.appendChild(chip);
      });

    card.appendChild(title);
    card.appendChild(summary);
    card.appendChild(chips);
    els.cardsContainer.appendChild(card);
  });
}

function getItemTitle(dataset, item) {
  const key = dataset.titleKey;
  if (key && item[key]) return String(item[key]);
  return String(item.name || item.title || item.id || "未命名");
}

function getItemSummary(item) {
  return String(
    item.summary ||
      item.objective ||
      item.impact ||
      item.description ||
      item.risk ||
      "暂无摘要"
  );
}

function renderDetail() {
  const ds = currentDataset();
  const filtered = getFilteredItems();
  const item = filtered.find((it) => it.id === state.selectedId);
  els.detailPanel.innerHTML = "";

  if (!item) {
    els.detailPanel.innerHTML = '<p class="muted">点击左侧卡片查看详情</p>';
    return;
  }

  const keys = Object.keys(item);
  keys.forEach((key) => {
    const row = document.createElement("div");
    row.className = "detail-row";

    const title = document.createElement("strong");
    title.textContent = humanizeKey(key);
    row.appendChild(title);
    row.appendChild(formatValue(item[key]));
    els.detailPanel.appendChild(row);
  });

  const foot = document.createElement("p");
  foot.className = "muted";
  foot.textContent = `数据源：${ds.displayName}`;
  els.detailPanel.appendChild(foot);
}

function renderRawPanel() {
  if (!state.showRaw) {
    return;
  }
  const filtered = getFilteredItems();
  const item = filtered.find((it) => it.id === state.selectedId);
  const source = item || currentDataset();
  els.rawPanel.textContent = JSON.stringify(source, null, 2);
}

function formatValue(value) {
  if (Array.isArray(value)) {
    const ul = document.createElement("ul");
    value.forEach((entry) => {
      const li = document.createElement("li");
      if (isObject(entry)) {
        li.textContent = JSON.stringify(entry, null, 0);
      } else {
        li.textContent = String(entry);
      }
      ul.appendChild(li);
    });
    return ul;
  }

  if (isObject(value)) {
    const box = document.createElement("div");
    Object.entries(value).forEach(([k, v]) => {
      const row = document.createElement("p");
      row.style.margin = "0 0 6px";
      row.innerHTML = `<span style="color:#a5b4fc">${escapeHtml(k)}</span>: ${escapeHtml(
        formatInline(v)
      )}`;
      box.appendChild(row);
    });
    return box;
  }

  const p = document.createElement("p");
  p.textContent = String(value);
  p.style.margin = "0";
  return p;
}

function formatInline(v) {
  if (Array.isArray(v)) return v.join(" / ");
  if (isObject(v)) return JSON.stringify(v);
  return String(v);
}

function humanizeKey(key) {
  const dict = {
    id: "ID",
    name: "名称",
    title: "标题",
    role: "角色定位",
    faction: "所属势力",
    stage: "阶段",
    status: "状态",
    summary: "摘要",
    tags: "标签",
    abilities: "能力",
    relationships: "关系",
    milestones: "成长里程碑",
    firstAppearance: "首次登场",
    chapterRange: "章节范围",
    objective: "目标",
    conflicts: "冲突",
    keyEvents: "关键事件",
    reward: "收益",
    risk: "风险",
    zoneType: "区域类型",
    threatLevel: "危险等级",
    controlFaction: "控制势力",
    resources: "资源",
    hazards: "危险",
    connectedTo: "连接区域",
    class: "类别",
    rank: "评级",
    habitat: "栖息地",
    weaknesses: "弱点",
    drops: "掉落",
    countermeasures: "应对建议",
    threatScore: "威胁分",
    owner: "持有者",
    type: "类型",
    tier: "阶级",
    activation: "触发方式",
    cost: "代价",
    cooldown: "冷却/限制",
    upgrades: "升级方向",
    stats: "属性",
    modules: "模块",
    upgradePath: "升级路径",
    chapter: "章节",
    dayIndex: "时间定位",
    impact: "影响",
    goals: "目标",
    leader: "首领",
    relations: "关系图"
  };
  return dict[key] || key;
}

function isObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
