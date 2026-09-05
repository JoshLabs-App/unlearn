// 学习地图页：把 CHAPTER_INDEX 里的 94 章按 A1→A2→B1→B2 分段列成一条纵向列表，
// 每段前面插一张等级横幅。等级换算跟 main.js 的 computeLevelProgress 用同一套
// 规则（累计词汇暴露量 → CEFR 门槛，见那边注释），这里独立算一份而不是复用
// main.js，因为这页不跑游戏引擎，没必要把整个 main.js 一起加载进来。

const SAVE_KEY = "eng-rpg-london-day1";

function tokenizeWords(text) {
  if (!text) return [];
  return text.toLowerCase().match(/[a-z]+'?[a-z]*/g) || [];
}

// 跟 main.js computeVocabExposure 同一套口径：只算玩家实际会读到的文字
// （NPC 台词 + 场景里出现过的选项），不算 vocabBank。
function computeVocabExposure(upToSceneIndex) {
  const seen = new Set();
  for (let i = 0; i <= upToSceneIndex && i < GAME_CONTENT.scenes.length; i++) {
    for (const node of Object.values(GAME_CONTENT.scenes[i].nodes)) {
      tokenizeWords(node.npcLine.en).forEach((w) => seen.add(w));
      for (const c of node.choices) tokenizeWords(c.text).forEach((w) => seen.add(w));
    }
  }
  return seen.size;
}

const CEFR_VOCAB_THRESHOLDS = [
  { level: "A1", words: 500 },
  { level: "A2", words: 1100 },
  { level: "B1", words: 2250 },
  { level: "B2", words: 4000 }
];

function levelForWordCount(wordCount) {
  for (const tier of CEFR_VOCAB_THRESHOLDS) {
    if (wordCount < tier.words) return tier.level;
  }
  return CEFR_VOCAB_THRESHOLDS[CEFR_VOCAB_THRESHOLDS.length - 1].level;
}

function hexToRgba(hex, alpha) {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 跟 main.js 里 SCENE_PALETTE 的配色是同一组（绿/蓝/品红/金），这里固定分给
// A1/A2/B1/B2 四段，让"地图"的配色跟游戏内场景卡的换色风格保持一致。
const LEVEL_STYLE = {
  A1: { bg: "#eef6ee", tint: "#3e8f4f", deep: "#296b38", name: "入门起步", desc: "从打招呼开始，认识多伦多的第一天" },
  A2: { bg: "#eaf2fa", tint: "#3a7fb0", deep: "#2c6489", name: "稳步积累", desc: "融入社区生活，词汇量稳步增长" },
  B1: { bg: "#f8eef4", tint: "#a8477a", deep: "#7e3660", name: "中级进阶", desc: "工作、成家，故事进入下一阶段" },
  B2: { bg: "#fbf3e2", tint: "#d9a63a", deep: "#a97c1f", name: "高级通关", desc: "十年落地生根，故事迎来尾声" }
};

function loadProgressSceneIndex() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.sceneIndex !== "number") return 0;
    return parsed.sceneIndex;
  } catch (e) {
    return 0;
  }
}

const el = {
  legend: document.getElementById("roadmap-legend"),
  summary: document.getElementById("roadmap-summary"),
  track: document.getElementById("roadmap-track")
};

const progressSceneIndex = loadProgressSceneIndex();
const totalScenes = GAME_CONTENT.scenes.length;

// 给每章算出：起止 sceneIndex、这章开头时的累计词汇量对应的 CEFR 等级、
// 以及相对当前存档进度是"已完成/进行中/未解锁"。
const chapters = CHAPTER_INDEX.map((entry, i) => {
  const next = CHAPTER_INDEX[i + 1];
  const endSceneIndex = (next ? next.sceneIndex : totalScenes) - 1;
  const wordCount = computeVocabExposure(entry.sceneIndex);
  const level = levelForWordCount(wordCount);
  let status = "locked";
  if (progressSceneIndex > endSceneIndex) status = "done";
  else if (progressSceneIndex >= entry.sceneIndex) status = "current";
  return { ...entry, endSceneIndex, level, status };
});

const doneCount = chapters.filter((c) => c.status === "done").length;
const currentChapter = chapters.find((c) => c.status === "current");
const currentLevel = currentChapter ? currentChapter.level : chapters[0].level;

el.summary.textContent = currentChapter
  ? `已完成 ${doneCount} / ${chapters.length} 章 · 当前第 ${currentChapter.chapter} 章 · ${currentLevel} 阶段`
  : `已完成 ${doneCount} / ${chapters.length} 章 · 已通关全部等级`;

// 图例：四个等级各一个色点，点这个色点不需要交互，纯说明配色对应关系。
el.legend.innerHTML = Object.entries(LEVEL_STYLE)
  .map(
    ([level, style]) => `
      <span class="roadmap-legend-item">
        <span class="roadmap-legend-dot" style="background:${style.tint}"></span>
        ${level} · ${style.name}
      </span>`
  )
  .join("");

// 每段前面插一张等级横幅（图标徽标 + 名称 + 一句话简介 + 章节范围），
// 章节范围直接从 chapters 里按 level 分组取首尾章号，不用另外维护一份。
const rangeByLevel = {};
chapters.forEach((c) => {
  const r = (rangeByLevel[c.level] = rangeByLevel[c.level] || { min: c.chapter, max: c.chapter });
  r.min = Math.min(r.min, c.chapter);
  r.max = Math.max(r.max, c.chapter);
});

const rowsHtml = [];
let prevLevel = null;

chapters.forEach((chapter) => {
  const style = LEVEL_STYLE[chapter.level];

  if (chapter.level !== prevLevel) {
    const range = rangeByLevel[chapter.level];
    rowsHtml.push(`
      <div class="roadmap-banner" style="background:${style.bg}; border-color:${style.tint}33;">
        <span class="roadmap-banner-badge" style="background:${style.tint};">${chapter.level}</span>
        <span class="roadmap-banner-text">
          <span class="roadmap-banner-name" style="color:${style.deep};">${style.name}</span>
          <span class="roadmap-banner-desc" style="color:${style.deep};">${style.desc}</span>
          <span class="roadmap-banner-range" style="color:${style.deep};">第 ${range.min}–${range.max} 章</span>
        </span>
      </div>
    `);
    prevLevel = chapter.level;
  }

  const isLocked = chapter.status === "locked";
  const isCurrent = chapter.status === "current";
  const isDone = chapter.status === "done";

  const puckTop = isLocked
    ? `background:#efe7db; color:#a89c8c;`
    : `background:${style.tint}; color:#fff; ${
        isCurrent
          ? `--pulse-color:${hexToRgba(style.tint, 0.22)}; animation: roadmap-pulse-a2 1.8s ease-in-out infinite, roadmap-pulse-press 1.8s ease-in-out infinite;`
          : ""
      }`;
  const puckBase = isLocked ? "#d8cabb" : style.deep;
  const puckContent = isLocked ? "🔒" : isDone ? "✓" : chapter.chapter;

  const tag = isLocked ? "div" : "a";
  const href = isLocked ? "" : ` href="index.html"`;

  rowsHtml.push(`
    <${tag} class="roadmap-row roadmap-row--${chapter.status}"${href}>
      <span class="roadmap-row-puck">
        <span class="roadmap-row-puck-base" style="background:${puckBase};"></span>
        <span class="roadmap-row-puck-top" style="${puckTop}">${puckContent}</span>
      </span>
      <span class="roadmap-row-text">
        ${isCurrent ? `<span class="roadmap-row-tag" style="background:${style.bg}; color:${style.deep};">当前</span>` : ""}
        ${chapter.kind === "side" ? `<span class="roadmap-row-tag" style="background:#f1ede6; color:#8a7f72;">番外</span>` : ""}
        <span class="roadmap-row-num">第 ${chapter.chapter} 章</span>
        <span class="roadmap-row-title">${chapter.title}</span>
      </span>
    </${tag}>
  `);
});

el.track.innerHTML = rowsHtml.join("");

// 打开地图直接定位到"当前在哪一章"，不用从第一章手动往下翻 94 章去找。
const currentRow = el.track.querySelector(".roadmap-row--current");
if (currentRow) {
  requestAnimationFrame(() => {
    currentRow.scrollIntoView({ block: "center" });
  });
}
