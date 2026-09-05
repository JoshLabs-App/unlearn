// 分类词表页：从 URL ?skill=xxx 读取"角色成长"里点的是哪个分类，把该分类下
// 全部场景的正确答案例句摊平列出来。点词查词/词发音复用跟 dialogue.js 一样的机制，
// 每句自己配一个播放按钮放整句配音。

const params = new URLSearchParams(location.search);
const skillKey = params.get("skill");
const meta = GAME_CONTENT.skillMeta[skillKey];

const el = {
  phoneShell: document.querySelector(".phone-shell"),
  title: document.getElementById("category-title"),
  subtitle: document.getElementById("category-subtitle"),
  count: document.getElementById("category-count"),
  list: document.getElementById("category-list"),
  zhToggleBtn: document.getElementById("zh-toggle-btn"),
  wordPopup: document.getElementById("word-popup")
};

if (meta) {
  document.title = `${meta.labelEn} · ${meta.label} · A Decade Apart`;
  el.title.innerHTML = `${meta.icon} ${meta.labelEn} <span class="zh-inline">${meta.label}</span>`;
  el.subtitle.textContent = "A Decade Apart";
} else {
  el.title.textContent = "没找到这个分类";
  el.subtitle.textContent = "";
}

// 跟主游戏页共用同一个"隐藏中文"开关（localStorage 里同一个 key），默认隐藏。
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

// 跟主游戏页共用同一份存档：这里查过的词也存进 reviewQueue，之后回主游戏玩，
// 闪回复习照样会抽到这些词。
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

let gameState = loadGameState();

function saveGameState() {
  gameState.lastActiveAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
}

const knownWords = new Set(
  gameState.reviewQueue.filter((r) => r.kind === "word").map((r) => r.en.toLowerCase())
);

function queueWordForReview(word, meaning, sentenceEn, sentenceZh) {
  const existing = gameState.reviewQueue.find((r) => r.en === word && r.kind === "word");
  if (existing) {
    if (sentenceEn && !existing.sentence) {
      existing.sentence = sentenceEn;
      existing.sentenceZh = sentenceZh;
      saveGameState();
    }
    return;
  }
  gameState.reviewQueue.push({
    en: word,
    zh: meaning,
    kind: "word",
    sentence: sentenceEn || null,
    sentenceZh: sentenceZh || null,
    streak: 0,
    status: "active",
    queuedAtScene: gameState.sceneIndex
  });
  knownWords.add(word.toLowerCase());
  saveGameState();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 这份列表没有单独标注"这句的目标词是哪个"，只能靠一份常见虚词/功能词表反过来过滤：
// 不在表里的词才当作这句里"值得学"的内容词，用品牌绿高亮；虚词还是能点查词，只是不上色。
const STOPWORDS = new Set([
  "a", "an", "the", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs", "myself",
  "yourself", "himself", "herself", "itself", "ourselves", "themselves",
  "this", "that", "these", "those", "here", "there",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "doing", "done",
  "have", "has", "had", "having",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  "and", "or", "but", "so", "if", "because", "as", "than", "since", "while", "although",
  "that's", "it's", "i'm", "you're", "we're", "they're", "he's", "she's", "let's", "i've", "you've",
  "we've", "they've", "i'd", "you'd", "he'd", "she'd", "we'd", "they'd", "i'll", "you'll", "he'll",
  "she'll", "we'll", "they'll",
  "don't", "doesn't", "didn't", "won't", "can't", "couldn't", "wouldn't", "shouldn't",
  "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't",
  "to", "of", "in", "on", "at", "by", "for", "with", "about", "against", "between", "into", "through",
  "during", "before", "after", "above", "below", "from", "up", "down", "out", "off", "over", "under",
  "again", "further", "once",
  "not", "no", "yes", "nor", "only", "just", "very", "too", "also", "really", "quite", "much", "many",
  "more", "most", "some", "such", "own", "same", "other", "another",
  "please", "thank", "thanks", "okay", "ok", "sure", "right", "now", "well", "still", "already", "yet",
  "finally", "actually",
  "what", "which", "who", "whom", "whose", "when", "where", "why", "how",
  "all", "any", "both", "each", "few", "less", "little",
  "one", "two", "three", "first", "second", "last", "next",
  "let", "lets", "get", "gets", "got", "go", "goes", "going", "gone", "went",
  "want", "wants", "wanted", "like", "likes", "liked",
  "know", "knows", "knew", "known",
  "think", "thinks", "thought",
  "see", "sees", "saw", "seen",
  "say", "says", "said", "tell", "tells", "told",
  "come", "comes", "came", "make", "makes", "made",
  "take", "takes", "took", "taken", "give", "gives", "gave", "given",
  "put", "puts", "look", "looks", "looked", "find", "finds", "found",
  "today", "tomorrow", "tonight", "true", "great", "good", "nice", "fine",
  "hello", "hi", "hey", "bye"
]);

function isContentWord(word) {
  const w = word.toLowerCase();
  return w.length > 1 && !STOPWORDS.has(w);
}

function wrapWordsHTML(text, sentenceZh) {
  const sentenceAttr = encodeURIComponent(text);
  const zhAttr = encodeURIComponent(sentenceZh || "");
  return escapeHtml(text).replace(/[A-Za-zÀ-ÿ']+/g, (word) => {
    const classes = ["word"];
    if (isContentWord(word)) classes.push("word-content");
    if (knownWords.has(word.toLowerCase())) classes.push("word-known");
    return `<span class="${classes.join(" ")}" data-word="${word.toLowerCase()}" data-sentence="${sentenceAttr}" data-sentence-zh="${zhAttr}">${word}</span>`;
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

  // .word-popup 的定位基准是 .phone-shell（见 style.css 里的 transform 注释），
  // 坐标要相对 shellRect 算，不能直接用 window.innerWidth。
  const shellRect = el.phoneShell.getBoundingClientRect();
  const rect = wordEl.getBoundingClientRect();
  const popRect = el.wordPopup.getBoundingClientRect();
  let left = rect.left - shellRect.left + rect.width / 2 - popRect.width / 2;
  left = Math.max(8, Math.min(left, shellRect.width - popRect.width - 8));
  const CLEARANCE = 36;
  let top = rect.top - shellRect.top - popRect.height - CLEARANCE;
  if (top < 8) top = rect.bottom - shellRect.top + CLEARANCE;
  el.wordPopup.style.left = left + "px";
  el.wordPopup.style.top = top + "px";

  document.querySelectorAll(".word.word-active").forEach((w) => w.classList.remove("word-active"));
  wordEl.classList.add("word-active");
  document.querySelectorAll(`.word[data-word="${word}"]`).forEach((w) => w.classList.add("word-known"));

  clearTimeout(wordPopupTimer);
  wordPopupTimer = setTimeout(hideWordPopup, WORD_POPUP_MS);

  if (typeof WORD_AUDIO_MANIFEST !== "undefined") {
    playAudio(word, null, WORD_AUDIO_MANIFEST);
  }

  const sentenceEn = decodeURIComponent(wordEl.dataset.sentence || "");
  const sentenceZh = decodeURIComponent(wordEl.dataset.sentenceZh || "");
  queueWordForReview(word, meaning, sentenceEn, sentenceZh);
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

function collectCategorySentences(key) {
  const seen = new Set();
  const sentences = [];
  for (const scene of GAME_CONTENT.scenes) {
    for (const node of Object.values(scene.nodes)) {
      if (node.skill !== key) continue;
      const correct = node.choices.find((c) => c.correct);
      if (!correct || !correct.text || seen.has(correct.text)) continue;
      seen.add(correct.text);
      sentences.push({ en: correct.text, zh: correct.zh || node.npcLine.zh });
    }
  }
  return sentences;
}

function renderList() {
  if (!meta) {
    el.list.innerHTML = `<p class="category-empty">这个分类不存在，<a href="index.html">返回首页</a>看看吧。</p>`;
    return;
  }
  const sentences = collectCategorySentences(skillKey);
  el.count.textContent = `共 ${sentences.length} 句`;
  if (sentences.length === 0) {
    el.list.innerHTML = `<p class="category-empty">这个分类暂时还没有例句</p>`;
    return;
  }
  const frag = document.createDocumentFragment();
  sentences.forEach(({ en, zh }) => {
    const row = document.createElement("div");
    row.className = "category-row";
    row.innerHTML = `
      <button class="category-play-btn" type="button" aria-label="播放">▶</button>
      <div class="category-text">
        <p class="category-en">${wrapWordsHTML(en, zh)}</p>
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
