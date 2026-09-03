// 生词收藏页：列出点过的词所在的句子（一句只要有词被点过就收进来，最近点的排前面），
// 句子里被点过的词常态显示品牌绿。数据源就是 state.reviewQueue 里 kind === "word"
// 且带着 sentence 字段的条目——main.js / dialogue.js / category.js 点词查词时
// 已经把这份数据存进去了，这里只是换个角度把它按句子摊出来。

const el = {
  count: document.getElementById("vocab-count"),
  list: document.getElementById("vocab-list"),
  zhToggleBtn: document.getElementById("zh-toggle-btn"),
  wordPopup: document.getElementById("word-popup")
};

const ZH_HIDE_KEY = "eng-rpg-hide-zh";
let hideZh = localStorage.getItem(ZH_HIDE_KEY) !== "0";

function applyZhVisibility() {
  document.body.classList.toggle("hide-zh", hideZh);
  el.zhToggleBtn.textContent = hideZh ? "显示中文" : "隐藏中文";
  el.zhToggleBtn.setAttribute("aria-pressed", String(!hideZh));
}

el.zhToggleBtn.addEventListener("click", () => {
  hideZh = !hideZh;
  localStorage.setItem(ZH_HIDE_KEY, hideZh ? "1" : "0");
  applyZhVisibility();
});

applyZhVisibility();

const SAVE_KEY = "eng-rpg-london-day1";

function freshGameState() {
  const skills = {};
  for (const key of Object.keys(GAME_CONTENT.skillMeta)) skills[key] = 0;
  return {
    sceneIndex: 0,
    nodeId: GAME_CONTENT.scenes[0].startNode,
    skills,
    learnedVocab: [],
    reviewQueue: [],
    finished: false,
    lastActiveAt: Date.now()
  };
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshGameState();
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.skills) return freshGameState();
    return parsed;
  } catch (e) {
    return freshGameState();
  }
}

const gameState = loadGameState();

const knownWords = new Set(
  gameState.reviewQueue.filter((r) => r.kind === "word").map((r) => r.en.toLowerCase())
);

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function wrapWordsHTML(text) {
  return escapeHtml(text).replace(/[A-Za-zÀ-ÿ']+/g, (word) => {
    const cls = knownWords.has(word.toLowerCase()) ? "word word-known" : "word";
    return `<span class="${cls}" data-word="${word.toLowerCase()}">${word}</span>`;
  });
}

const WORD_POPUP_MS = 2500;
let wordPopupTimer = null;

function showWordPopup(wordEl) {
  const word = wordEl.dataset.word;
  const meaning = typeof WORD_DICT !== "undefined" ? WORD_DICT[word] : null;
  if (!meaning) return;

  el.wordPopup.textContent = `${wordEl.textContent} ${meaning}`;
  el.wordPopup.classList.remove("hidden");

  const rect = wordEl.getBoundingClientRect();
  const popRect = el.wordPopup.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - popRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));
  const CLEARANCE = 36;
  let top = rect.top - popRect.height - CLEARANCE;
  if (top < 8) top = rect.bottom + CLEARANCE;
  el.wordPopup.style.left = left + "px";
  el.wordPopup.style.top = top + "px";

  document.querySelectorAll(".word.word-active").forEach((w) => w.classList.remove("word-active"));
  wordEl.classList.add("word-active");

  clearTimeout(wordPopupTimer);
  wordPopupTimer = setTimeout(hideWordPopup, WORD_POPUP_MS);

  if (typeof WORD_AUDIO_MANIFEST !== "undefined") {
    playAudio(word, null, WORD_AUDIO_MANIFEST);
  }
}

function hideWordPopup() {
  clearTimeout(wordPopupTimer);
  el.wordPopup.classList.add("hidden");
  document.querySelectorAll(".word.word-active").forEach((w) => w.classList.remove("word-active"));
}

el.list.addEventListener("click", (e) => {
  const wordEl = e.target.closest(".word");
  if (wordEl) showWordPopup(wordEl);
});

let currentAudio = null;

function playAudio(text, btnEl, manifest) {
  const activeManifest = manifest || (typeof AUDIO_MANIFEST !== "undefined" ? AUDIO_MANIFEST : null);
  const src = activeManifest ? activeManifest[text] : null;
  if (!src) return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  const audio = new Audio(src);
  currentAudio = audio;
  if (btnEl) btnEl.classList.add("playing");
  const done = () => {
    if (btnEl) btnEl.classList.remove("playing");
    if (currentAudio === audio) currentAudio = null;
  };
  audio.addEventListener("ended", done, { once: true });
  audio.addEventListener("error", done, { once: true });
  audio.play().catch(done);
}

// 按句子去重：一句里可能好几个词都被点过，只收一行；最近点的排在最前面，
// 所以整个 reviewQueue 倒着扫，第一次遇到某个句子就是"最近一次点它"。
function collectCollectedSentences() {
  const seen = new Set();
  const rows = [];
  const words = gameState.reviewQueue.filter((r) => r.kind === "word" && r.sentence);
  for (let i = words.length - 1; i >= 0; i--) {
    const { sentence, sentenceZh } = words[i];
    if (seen.has(sentence)) continue;
    seen.add(sentence);
    rows.push({ en: sentence, zh: sentenceZh });
  }
  return rows;
}

function renderList() {
  const sentences = collectCollectedSentences();
  el.count.textContent = `共 ${sentences.length} 句`;
  if (sentences.length === 0) {
    el.list.innerHTML = `<p class="category-empty">还没有收藏的词——在故事里点一下英文单词，查过的词就会收进这里。</p>`;
    return;
  }
  const frag = document.createDocumentFragment();
  sentences.forEach(({ en, zh }) => {
    const row = document.createElement("div");
    row.className = "category-row";
    row.innerHTML = `
      <button class="category-play-btn" type="button" aria-label="播放">▶</button>
      <div class="category-text">
        <p class="category-en">${wrapWordsHTML(en)}</p>
        <p class="category-zh zh-inline">${escapeHtml(zh || "")}</p>
      </div>
    `;
    row.querySelector(".category-play-btn").addEventListener("click", (e) => {
      playAudio(en, e.currentTarget);
    });
    frag.appendChild(row);
  });
  el.list.appendChild(frag);
}

renderList();
