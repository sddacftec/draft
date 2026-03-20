const CONFIG_SOURCES = [
  { key: "characters", path: "../config/characters.json" },
  { key: "plotlines", path: "../config/plotlines.json" },
  { key: "maps", path: "../config/maps.json" },
  { key: "monsters", path: "../config/monsters.json" },
  { key: "skills", path: "../config/skills.json" },
  { key: "equipments", path: "../config/equipments.json" },
  { key: "factions", path: "../config/factions.json" },
  { key: "timeline", path: "../config/timeline.json" }
];

const CHAPTER_INDEX_PATH = "../chapters/index.json";
const CHAPTER_TAB_KEY = "chapters";
const STORAGE_DATASET_PREFIX = "blacktide-dataset-";
const STORAGE_CHAPTER_PREFIX = "blacktide-chapter-";

const state = {
  datasets: new Map(),
  originalDatasets: new Map(),
  chapters: {
    meta: null,
    items: [],
    contents: new Map(),
    originalContents: new Map()
  },
  activeKey: "characters",
  mode: "config",
  search: "",
  tag: "",
  selectedId: "",
  showRaw: false,
  previewModalOpen: false
};

const els = {
  categoryTabs: document.getElementById("categoryTabs"),
  searchInput: document.getElementById("searchInput"),
  tagSelect: document.getElementById("tagSelect"),
  datasetTitle: document.getElementById("datasetTitle"),
  datasetDesc: document.getElementById("datasetDesc"),
  datasetCount: document.getElementById("datasetCount"),
  cardsContainer: document.getElementById("cardsContainer"),
  detailTitle: document.getElementById("detailTitle"),
  detailPanel: document.getElementById("detailPanel"),
  previewSection: document.getElementById("previewSection"),
  previewPanel: document.getElementById("previewPanel"),
  previewModal: document.getElementById("previewModal"),
  previewModalContent: document.getElementById("previewModalContent"),
  closePreviewModalBtn: document.getElementById("closePreviewModalBtn"),
  editorTitle: document.getElementById("editorTitle"),
  editorHint: document.getElementById("editorHint"),
  editorTextarea: document.getElementById("editorTextarea"),
  editorButtons: document.getElementById("editorButtons"),
  rawPanel: document.getElementById("rawPanel"),
  toggleRawBtn: document.getElementById("toggleRawBtn")
};

init().catch((err) => {
  els.datasetTitle.textContent = "加载失败";
  els.datasetDesc.textContent = String(err);
  els.datasetCount.textContent = "请检查是否通过 HTTP 服务访问页面。";
});

async function init() {
  await loadConfigDatasets();
  await loadChapterData();
  renderTabs();
  bindEvents();
  switchTab(state.activeKey);
}

async function loadConfigDatasets() {
  const requests = CONFIG_SOURCES.map(async (item) => {
    const res = await fetch(item.path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`读取失败: ${item.path}`);
    }
    const json = await res.json();
    state.originalDatasets.set(item.key, deepClone(json));

    const draft = storageGet(STORAGE_DATASET_PREFIX + item.key);
    state.datasets.set(item.key, draft ? JSON.parse(draft) : json);
  });
  await Promise.all(requests);
}

async function loadChapterData() {
  const res = await fetch(CHAPTER_INDEX_PATH, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`读取失败: ${CHAPTER_INDEX_PATH}`);
  }
  const meta = await res.json();
  const items = Array.isArray(meta.items) ? [...meta.items] : [];
  items.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  await Promise.all(
    items.map(async (item) => {
      const chapterPath = `../chapters/${item.file}`;
      const chapterRes = await fetch(chapterPath, { cache: "no-store" });
      if (!chapterRes.ok) {
        throw new Error(`读取失败: ${chapterPath}`);
      }
      const originalText = await chapterRes.text();
      state.chapters.originalContents.set(item.id, originalText);

      const storedText = storageGet(STORAGE_CHAPTER_PREFIX + item.id);
      const currentText = storedText ?? originalText;
      state.chapters.contents.set(item.id, currentText);

      if (!item.summary || !item.summary.trim()) {
        item.summary = extractExcerpt(currentText);
      }
    })
  );

  state.chapters.meta = {
    category: meta.category || CHAPTER_TAB_KEY,
    displayName: meta.displayName || "章节",
    description:
      meta.description || "章节阅读与编辑模块，支持本地草稿自动保存与导出。",
    items
  };
  state.chapters.items = items;
}

function bindEvents() {
  els.searchInput.addEventListener("input", (e) => {
    state.search = e.target.value.trim().toLowerCase();
    syncSelectionWithFilteredItems();
    renderCards();
    renderDetail();
    renderEditor();
    renderRawPanel();
  });

  els.tagSelect.addEventListener("change", (e) => {
    state.tag = e.target.value;
    syncSelectionWithFilteredItems();
    renderCards();
    renderDetail();
    renderEditor();
    renderRawPanel();
  });

  els.toggleRawBtn.addEventListener("click", () => {
    state.showRaw = !state.showRaw;
    els.rawPanel.classList.toggle("hidden", !state.showRaw);
    els.toggleRawBtn.textContent = state.showRaw ? "隐藏原始 JSON" : "显示原始 JSON";
    renderRawPanel();
  });

  els.editorTextarea.addEventListener("input", () => {
    if (state.mode !== "chapters" || !state.selectedId) {
      return;
    }
    const text = els.editorTextarea.value;
    setChapterContent(state.selectedId, text, true);
    renderChapterPreview(text);
    renderRawPanel();
    renderCards();
    showEditorMessage("章节草稿已自动保存到浏览器。");
  });

  els.closePreviewModalBtn.addEventListener("click", () => {
    closePreviewModal();
  });

  els.previewModal.addEventListener("click", (e) => {
    if (e.target === els.previewModal) {
      closePreviewModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.previewModalOpen) {
      closePreviewModal();
    }
  });
}

function renderTabs() {
  els.categoryTabs.innerHTML = "";

  for (const { key } of CONFIG_SOURCES) {
    const ds = state.datasets.get(key);
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.type = "button";
    btn.dataset.key = key;
    btn.textContent = ds?.displayName || key;
    btn.addEventListener("click", () => switchTab(key));
    els.categoryTabs.appendChild(btn);
  }

  const chapterBtn = document.createElement("button");
  chapterBtn.className = "tab-btn";
  chapterBtn.type = "button";
  chapterBtn.dataset.key = CHAPTER_TAB_KEY;
  chapterBtn.textContent = state.chapters.meta?.displayName || "章节";
  chapterBtn.addEventListener("click", () => switchTab(CHAPTER_TAB_KEY));
  els.categoryTabs.appendChild(chapterBtn);

  updateActiveTab();
}

function switchTab(key) {
  state.activeKey = key;
  state.mode = key === CHAPTER_TAB_KEY ? "chapters" : "config";
  if (state.mode !== "chapters") {
    closePreviewModal();
  }
  state.search = "";
  state.tag = "";
  state.selectedId = "";
  els.searchInput.value = "";
  els.tagSelect.value = "";
  els.searchInput.placeholder =
    state.mode === "chapters"
      ? "搜索章节标题、摘要、正文..."
      : "搜索名称、摘要、标签、关系...";
  updateActiveTab();
  renderTagOptions();
  syncSelectionWithFilteredItems();
  renderDatasetMeta();
  renderCards();
  renderDetail();
  renderEditor();
  renderRawPanel();
}

function updateActiveTab() {
  const buttons = els.categoryTabs.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.key === state.activeKey);
  });
}

function currentDataset() {
  return state.datasets.get(state.activeKey) || { items: [] };
}

function activeItems() {
  if (state.mode === "chapters") {
    return state.chapters.items;
  }
  const ds = currentDataset();
  return Array.isArray(ds.items) ? ds.items : [];
}

function getFilteredItems() {
  const items = activeItems();
  return items.filter((item) => {
    const searchOk = !state.search || searchTarget(item).includes(state.search);
    const tagOk = !state.tag || extractTags(item).includes(state.tag);
    return searchOk && tagOk;
  });
}

function searchTarget(item) {
  if (state.mode === "chapters") {
    const content = getChapterContent(item.id);
    return `${JSON.stringify(item)}\n${content}`.toLowerCase();
  }
  return JSON.stringify(item).toLowerCase();
}

function renderDatasetMeta() {
  if (state.mode === "chapters") {
    const meta = state.chapters.meta || {};
    els.datasetTitle.textContent = meta.displayName || "章节";
    els.datasetDesc.textContent =
      meta.description || "章节阅读与编辑模块（自动草稿 + 导出）。";
    return;
  }

  const ds = currentDataset();
  els.datasetTitle.textContent = ds.displayName || state.activeKey;
  els.datasetDesc.textContent = ds.description || "";
}

function renderTagOptions() {
  const tags = new Set();
  activeItems().forEach((item) => {
    extractTags(item).forEach((tag) => tags.add(tag));
  });

  els.tagSelect.innerHTML = '<option value="">全部标签</option>';
  [...tags]
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
  const items = activeItems();
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
      renderEditor();
      renderRawPanel();
    });

    const title = document.createElement("h3");
    title.textContent = getItemTitle(item);

    const summary = document.createElement("p");
    summary.textContent = getItemSummary(item);

    const chips = document.createElement("div");
    chips.className = "chips";
    const tags = extractTags(item);
    if (state.mode === "chapters") {
      tags.unshift(`字数${countCharacters(getChapterContent(item.id))}`);
    }
    tags.slice(0, 4).forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = tag;
      chips.appendChild(chip);
    });

    card.appendChild(title);
    card.appendChild(summary);
    card.appendChild(chips);

    if (state.mode === "chapters") {
      const actions = document.createElement("div");
      actions.className = "card-actions";

      const fullscreenBtn = document.createElement("button");
      fullscreenBtn.type = "button";
      fullscreenBtn.className = "card-action-btn";
      fullscreenBtn.textContent = "全屏阅读";
      fullscreenBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.selectedId = item.id;
        renderCards();
        renderDetail();
        renderEditor();
        renderRawPanel();
        openPreviewModal(getChapterContent(item.id));
      });

      actions.appendChild(fullscreenBtn);
      card.appendChild(actions);
    }

    els.cardsContainer.appendChild(card);
  });
}

function getItemTitle(item) {
  if (state.mode === "chapters") {
    return String(item.title || item.id || "未命名章节");
  }
  const ds = currentDataset();
  const key = ds.titleKey;
  if (key && item[key]) return String(item[key]);
  return String(item.name || item.title || item.id || "未命名");
}

function getItemSummary(item) {
  if (state.mode === "chapters") {
    return item.summary || extractExcerpt(getChapterContent(item.id));
  }
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
  els.detailPanel.innerHTML = "";
  els.previewSection.classList.toggle("hidden", state.mode !== "chapters");

  const item = getSelectedItem();
  if (!item) {
    els.detailTitle.textContent = "详情";
    els.detailPanel.innerHTML = '<p class="muted">点击左侧卡片查看详情</p>';
    els.previewPanel.innerHTML = "";
    closePreviewModal();
    return;
  }

  if (state.mode === "chapters") {
    els.detailTitle.textContent = "章节详情";
    renderChapterDetail(item);
    renderChapterPreview(getChapterContent(item.id));
    return;
  }

  els.detailTitle.textContent = "配置详情";
  Object.keys(item).forEach((key) => {
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
  foot.textContent = `数据源：${currentDataset().displayName}`;
  els.detailPanel.appendChild(foot);
}

function renderChapterDetail(item) {
  const text = getChapterContent(item.id);
  const originalText = state.chapters.originalContents.get(item.id) || "";
  const hasDraft = text !== originalText;

  const rows = [
    { key: "标题", value: item.title },
    { key: "文件", value: item.file },
    { key: "章节序号", value: item.order },
    { key: "字数", value: countCharacters(text) },
    { key: "草稿状态", value: hasDraft ? "已修改（本地草稿）" : "原始内容" },
    { key: "摘要", value: item.summary || extractExcerpt(text) }
  ];

  rows.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "detail-row";

    const title = document.createElement("strong");
    title.textContent = entry.key;
    row.appendChild(title);

    const p = document.createElement("p");
    p.textContent = String(entry.value);
    p.style.margin = "0";
    row.appendChild(p);
    els.detailPanel.appendChild(row);
  });
}

function renderChapterPreview(markdownText) {
  const html = markdownToHtml(markdownText);
  els.previewPanel.innerHTML = html;
  els.previewModalContent.innerHTML = html;
}

function renderEditor() {
  els.editorButtons.innerHTML = "";
  const item = getSelectedItem();

  if (!item) {
    els.editorTitle.textContent = "编辑器";
    els.editorHint.textContent = "请选择一个条目后开始编辑。";
    els.editorTextarea.value = "";
    els.editorTextarea.disabled = true;
    return;
  }

  els.editorTextarea.disabled = false;

  if (state.mode === "chapters") {
    renderChapterEditor(item);
    return;
  }
  renderConfigEditor(item);
}

function renderConfigEditor(item) {
  els.editorTitle.textContent = "配置条目编辑器";
  els.editorHint.textContent =
    "修改 JSON 后点击“应用条目修改”。修改结果会保存在浏览器草稿中，可导出当前分类 JSON。";
  els.editorTextarea.value = JSON.stringify(item, null, 2);

  els.editorButtons.appendChild(
    makeButton("应用条目修改", "primary", () => applyConfigEdit(item.id))
  );
  els.editorButtons.appendChild(
    makeButton("重置编辑器", "", () => {
      const fresh = getSelectedItem();
      els.editorTextarea.value = fresh ? JSON.stringify(fresh, null, 2) : "";
      showEditorMessage("已重置为当前条目数据。");
    })
  );
  els.editorButtons.appendChild(makeButton("新增条目", "", addConfigItem));
  els.editorButtons.appendChild(
    makeButton("删除当前条目", "danger", deleteSelectedConfigItem)
  );
  els.editorButtons.appendChild(makeButton("下载当前分类 JSON", "", downloadCurrentDataset));
  els.editorButtons.appendChild(
    makeButton("恢复分类初始数据", "danger", resetCurrentDataset)
  );
}

function renderChapterEditor(item) {
  els.editorTitle.textContent = "章节阅读与修改";
  els.editorHint.textContent =
    "章节编辑会自动保存到浏览器（localStorage）。可单章导出 .md，或导出全部章节草稿。";
  els.editorTextarea.value = getChapterContent(item.id);

  els.editorButtons.appendChild(
    makeButton("下载当前章节 .md", "primary", () => downloadCurrentChapter(item))
  );
  els.editorButtons.appendChild(
    makeButton("恢复本章原文", "danger", () => resetChapterToOriginal(item.id))
  );
  els.editorButtons.appendChild(
    makeButton("下载全部章节草稿", "", downloadAllChaptersDraft)
  );
  els.editorButtons.appendChild(
    makeButton("清空全部章节草稿", "danger", clearAllChapterDrafts)
  );
}

function applyConfigEdit(selectedId) {
  const ds = currentDataset();
  const items = Array.isArray(ds.items) ? ds.items : [];
  const index = items.findIndex((it) => it.id === selectedId);
  if (index < 0) {
    showEditorMessage("未找到当前条目，无法应用。", true);
    return;
  }

  let edited;
  try {
    edited = JSON.parse(els.editorTextarea.value);
  } catch (err) {
    showEditorMessage(`JSON 解析失败：${err.message}`, true);
    return;
  }

  if (!isObject(edited)) {
    showEditorMessage("条目必须是 JSON 对象。", true);
    return;
  }
  if (!edited.id) {
    edited.id = selectedId;
  }
  if (edited.id !== selectedId && items.some((it) => it.id === edited.id)) {
    showEditorMessage("ID 已存在，请使用唯一 ID。", true);
    return;
  }

  items[index] = edited;
  state.selectedId = edited.id;
  persistDataset(state.activeKey);
  renderTagOptions();
  syncSelectionWithFilteredItems();
  renderCards();
  renderDetail();
  renderEditor();
  renderRawPanel();
  showEditorMessage("配置条目已应用并保存到浏览器草稿。");
}

function addConfigItem() {
  const ds = currentDataset();
  if (!Array.isArray(ds.items)) {
    ds.items = [];
  }
  const titleKey = ds.titleKey || "name";
  const id = `new_${Date.now()}`;
  const item = {
    id,
    [titleKey]: "新条目",
    summary: "请补充摘要",
    tags: ["待补充"]
  };
  ds.items.push(item);
  state.selectedId = id;
  persistDataset(state.activeKey);
  renderTagOptions();
  renderCards();
  renderDetail();
  renderEditor();
  renderRawPanel();
  showEditorMessage("已新增条目。");
}

function deleteSelectedConfigItem() {
  const ds = currentDataset();
  if (!Array.isArray(ds.items) || !state.selectedId) return;
  const yes = window.confirm(`确定删除条目 ${state.selectedId} 吗？`);
  if (!yes) return;

  ds.items = ds.items.filter((it) => it.id !== state.selectedId);
  state.datasets.set(state.activeKey, ds);
  persistDataset(state.activeKey);
  syncSelectionWithFilteredItems();
  renderTagOptions();
  renderCards();
  renderDetail();
  renderEditor();
  renderRawPanel();
  showEditorMessage("条目已删除。");
}

function downloadCurrentDataset() {
  const ds = currentDataset();
  downloadText(
    `${state.activeKey}.json`,
    `${JSON.stringify(ds, null, 2)}\n`,
    "application/json;charset=utf-8"
  );
  showEditorMessage("已下载当前分类 JSON。");
}

function resetCurrentDataset() {
  const yes = window.confirm("确定恢复当前分类到初始数据吗？浏览器草稿会被清空。");
  if (!yes) return;
  const original = state.originalDatasets.get(state.activeKey);
  if (!original) return;

  state.datasets.set(state.activeKey, deepClone(original));
  storageRemove(STORAGE_DATASET_PREFIX + state.activeKey);
  syncSelectionWithFilteredItems();
  renderTagOptions();
  renderCards();
  renderDetail();
  renderEditor();
  renderRawPanel();
  showEditorMessage("已恢复分类初始数据。");
}

function downloadCurrentChapter(item) {
  const text = getChapterContent(item.id);
  downloadText(item.file || `${item.id}.md`, text, "text/markdown;charset=utf-8");
  showEditorMessage("已下载当前章节。");
}

function resetChapterToOriginal(chapterId) {
  const yes = window.confirm("确定恢复本章到原文吗？本地草稿将被清空。");
  if (!yes) return;
  const original = state.chapters.originalContents.get(chapterId);
  if (original == null) return;
  setChapterContent(chapterId, original, false);
  storageRemove(STORAGE_CHAPTER_PREFIX + chapterId);
  renderCards();
  renderDetail();
  renderEditor();
  renderRawPanel();
  showEditorMessage("本章已恢复为原文。");
}

function downloadAllChaptersDraft() {
  const payload = state.chapters.items.map((item) => ({
    id: item.id,
    file: item.file,
    title: item.title,
    content: getChapterContent(item.id)
  }));
  downloadText(
    "chapters-draft-export.json",
    `${JSON.stringify(payload, null, 2)}\n`,
    "application/json;charset=utf-8"
  );
  showEditorMessage("已导出全部章节草稿。");
}

function clearAllChapterDrafts() {
  const yes = window.confirm("确定清空全部章节草稿并恢复原文吗？");
  if (!yes) return;
  state.chapters.items.forEach((item) => {
    const original = state.chapters.originalContents.get(item.id) || "";
    state.chapters.contents.set(item.id, original);
    storageRemove(STORAGE_CHAPTER_PREFIX + item.id);
  });
  renderCards();
  renderDetail();
  renderEditor();
  renderRawPanel();
  showEditorMessage("全部章节草稿已清空。");
}

function renderRawPanel() {
  if (!state.showRaw) return;
  const item = getSelectedItem();
  if (state.mode === "chapters") {
    if (!item) {
      els.rawPanel.textContent = JSON.stringify(state.chapters.meta, null, 2);
      return;
    }
    els.rawPanel.textContent = JSON.stringify(
      {
        chapter: item,
        content: getChapterContent(item.id)
      },
      null,
      2
    );
    return;
  }

  const source = item || currentDataset();
  els.rawPanel.textContent = JSON.stringify(source, null, 2);
}

function openPreviewModal(markdownText) {
  renderChapterPreview(markdownText);
  state.previewModalOpen = true;
  els.previewModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closePreviewModal() {
  state.previewModalOpen = false;
  els.previewModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function getSelectedItem() {
  const filtered = getFilteredItems();
  return filtered.find((it) => it.id === state.selectedId) || null;
}

function extractTags(item) {
  const tags = new Set();

  if (Array.isArray(item.tags)) {
    item.tags.forEach((t) => tags.add(String(t)));
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
    "zoneType",
    "class",
    "file"
  ];

  scalarKeys.forEach((k) => {
    if (typeof item[k] === "string" && item[k]) {
      tags.add(item[k]);
    }
  });

  if (state.mode === "chapters" && item.order != null) {
    tags.add(`第${item.order}章`);
  }

  return [...tags];
}

function getChapterContent(chapterId) {
  return state.chapters.contents.get(chapterId) || "";
}

function setChapterContent(chapterId, text, persist) {
  state.chapters.contents.set(chapterId, text);
  if (!persist) return;

  const original = state.chapters.originalContents.get(chapterId) || "";
  if (text === original) {
    storageRemove(STORAGE_CHAPTER_PREFIX + chapterId);
  } else {
    storageSet(STORAGE_CHAPTER_PREFIX + chapterId, text);
  }
}

function persistDataset(datasetKey) {
  const ds = state.datasets.get(datasetKey);
  if (!ds) return;
  storageSet(STORAGE_DATASET_PREFIX + datasetKey, JSON.stringify(ds));
}

function makeButton(text, cls, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  if (cls) btn.classList.add(cls);
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  return btn;
}

function formatValue(value) {
  if (Array.isArray(value)) {
    const ul = document.createElement("ul");
    value.forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = isObject(entry) ? JSON.stringify(entry) : String(entry);
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
    relations: "关系图",
    file: "文件名",
    order: "排序"
  };
  return dict[key] || key;
}

function markdownToHtml(md) {
  const lines = md.replaceAll("\r\n", "\n").split("\n");
  let html = "";
  let inCode = false;
  let inList = false;

  const closeListIfNeeded = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine ?? "";

    if (line.startsWith("```")) {
      closeListIfNeeded();
      if (!inCode) {
        inCode = true;
        html += "<pre><code>";
      } else {
        inCode = false;
        html += "</code></pre>";
      }
      continue;
    }

    if (inCode) {
      html += `${escapeHtml(line)}\n`;
      continue;
    }

    if (!line.trim()) {
      closeListIfNeeded();
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      closeListIfNeeded();
      const level = line.match(/^#+/)[0].length;
      const content = applyInline(line.replace(/^#{1,6}\s+/, ""));
      html += `<h${level}>${content}</h${level}>`;
      continue;
    }

    if (/^>\s?/.test(line)) {
      closeListIfNeeded();
      html += `<blockquote>${applyInline(line.replace(/^>\s?/, ""))}</blockquote>`;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        inList = true;
        html += "<ul>";
      }
      html += `<li>${applyInline(line.replace(/^[-*]\s+/, ""))}</li>`;
      continue;
    }

    closeListIfNeeded();
    html += `<p>${applyInline(line)}</p>`;
  }

  closeListIfNeeded();
  if (inCode) {
    html += "</code></pre>";
  }
  return html;
}

function applyInline(text) {
  let safe = escapeHtml(text);
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
  safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
  return safe;
}

function extractExcerpt(text) {
  const lines = text.split(/\r?\n/);
  const first = lines.find((line) => line.trim() && !line.startsWith("#")) || "";
  const oneLine = first.replace(/\s+/g, " ").trim();
  if (!oneLine) return "暂无摘要";
  return oneLine.length > 68 ? `${oneLine.slice(0, 68)}...` : oneLine;
}

function countCharacters(text) {
  return text.replace(/\s/g, "").length;
}

function downloadText(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showEditorMessage(message, isError = false) {
  els.editorHint.textContent = message;
  els.editorHint.style.color = isError ? "#fb7185" : "#93c5fd";
  window.clearTimeout(showEditorMessage.timer);
  showEditorMessage.timer = window.setTimeout(() => {
    els.editorHint.style.color = "";
    if (state.mode === "chapters") {
      els.editorHint.textContent =
        "章节编辑会自动保存到浏览器（localStorage）。可单章导出 .md，或导出全部章节草稿。";
    } else {
      els.editorHint.textContent =
        "修改 JSON 后点击“应用条目修改”。修改结果会保存在浏览器草稿中，可导出当前分类 JSON。";
    }
  }, 1800);
}

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

function formatInline(v) {
  if (Array.isArray(v)) return v.join(" / ");
  if (isObject(v)) return JSON.stringify(v);
  return String(v);
}

function isObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function storageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function storageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
