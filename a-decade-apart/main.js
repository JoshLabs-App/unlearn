// 游戏引擎：状态机 + 渲染 + 回忆闪回复习逻辑

const SAVE_KEY = "eng-rpg-london-day1";

const el = {
  phoneShell: document.querySelector(".phone-shell"),
  scenePanel: document.querySelector(".scene-panel"),
  sceneTitle: document.getElementById("scene-title"),
  sceneSubtitle: document.getElementById("scene-subtitle"),
  avatar: document.getElementById("avatar"),
  npcEn: document.getElementById("npc-en"),
  npcListenHint: document.getElementById("npc-listen-hint"),
  npcZh: document.getElementById("npc-zh"),
  choices: document.getElementById("choices"),
  hint: document.getElementById("hint"),
  skillPanel: document.getElementById("skill-panel"),
  xpTotal: document.getElementById("xp-total"),
  vocabCount: document.getElementById("vocab-count"),
  flashbackOverlay: document.getElementById("flashback-overlay"),
  flashbackLabel: document.getElementById("flashback-label"),
  flashbackZh: document.getElementById("flashback-zh"),
  flashbackChoices: document.getElementById("flashback-choices"),
  flashbackBuild: document.getElementById("flashback-build"),
  flashbackAnswer: document.getElementById("flashback-answer"),
  flashbackWordbank: document.getElementById("flashback-wordbank"),
  flashbackFeedback: document.getElementById("flashback-feedback"),
  flashbackProgress: document.getElementById("flashback-progress"),
  flashbackIcon: document.getElementById("flashback-icon"),
  flashbackKnowBtn: document.getElementById("flashback-know-btn"),
  sceneProgressFill: document.getElementById("scene-progress-fill"),
  sceneProgressLabel: document.getElementById("scene-progress-label"),
  sceneCard: document.getElementById("scene-card"),
  hudLevelPill: document.getElementById("hud-level-pill"),
  levelBarMask: document.getElementById("level-bar-mask"),
  levelLabel: document.getElementById("level-label"),
  endScreen: document.getElementById("end-screen"),
  endSummary: document.getElementById("end-summary"),
  gameScreen: document.getElementById("game-screen"),
  resetBtn: document.getElementById("reset-btn"),
  restartBtn: document.getElementById("restart-btn"),
  zhToggleBtn: document.getElementById("zh-toggle-btn"),
  blindListenBtn: document.getElementById("blind-listen-toggle-btn"),
  wordPopup: document.getElementById("word-popup"),
  transitionOverlay: document.getElementById("transition-overlay"),
  transitionChapterCard: document.getElementById("transition-chapter-card"),
  transitionChapterNum: document.getElementById("transition-chapter-num"),
  transitionChapterTitle: document.getElementById("transition-chapter-title"),
  transitionEn: document.getElementById("transition-en"),
  transitionZh: document.getElementById("transition-zh"),
  transitionContinueBtn: document.getElementById("transition-continue-btn"),
  historyBanner: document.getElementById("history-banner"),
  historyPrevBtn: document.getElementById("history-prev-btn"),
  historyNextBtn: document.getElementById("history-next-btn"),
  streakBadge: document.getElementById("streak-badge"),
  streakBanner: document.getElementById("streak-banner"),
  heartsDisplay: document.getElementById("hearts-display"),
  dailyGoalCard: document.getElementById("daily-goal-card"),
  dailyGoalFill: document.getElementById("daily-goal-fill"),
  dailyGoalCount: document.getElementById("daily-goal-count"),
  leaderboardSelfXp: document.getElementById("leaderboard-self-xp"),
  leaderboardList: document.getElementById("leaderboard-list"),
  leaderboardEmpty: document.getElementById("leaderboard-empty"),
  userBadge: document.getElementById("user-badge"),
  accountMenuEmail: document.getElementById("account-menu-email"),
  accountLoginBtn: document.getElementById("account-login-btn"),
  accountLoggedOutItem: document.getElementById("account-logged-out-item"),
  accountLoggedInItem: document.getElementById("account-logged-in-item"),
  authOverlay: document.getElementById("auth-overlay"),
  authCloseBtn: document.getElementById("auth-close-btn"),
  authEmailStep: document.getElementById("auth-email-step"),
  authEmailInput: document.getElementById("auth-email-input"),
  authSendLinkBtn: document.getElementById("auth-send-link-btn"),
  authEmailSentStep: document.getElementById("auth-email-sent-step"),
  authSentEmail: document.getElementById("auth-sent-email"),
  authRetryEmailBtn: document.getElementById("auth-retry-email-btn"),
  authGoogleBtn: document.getElementById("auth-google-btn"),
  authAppleBtn: document.getElementById("auth-apple-btn"),
  authError: document.getElementById("auth-error"),
  authSignOutBtn: document.getElementById("auth-sign-out-btn"),
  characterEditBtn: document.getElementById("character-edit-btn"),
  characterOverlay: document.getElementById("character-overlay"),
  characterCloseBtn: document.getElementById("character-close-btn"),
  characterNameInput: document.getElementById("character-name-input"),
  avatarPicker: document.getElementById("avatar-picker"),
  avatarUploadInput: document.getElementById("avatar-upload-input"),
  avatarUploadPreview: document.getElementById("avatar-upload-preview"),
  characterSaveBtn: document.getElementById("character-save-btn"),
  userBadgeAvatar: document.getElementById("user-badge-avatar"),
  userBadgeLabel: document.getElementById("user-badge-label"),
  achievementsBtn: document.getElementById("achievements-btn"),
  achievementsOverlay: document.getElementById("achievements-overlay"),
  achievementsCloseBtn: document.getElementById("achievements-close-btn"),
  achievementsGrid: document.getElementById("achievements-grid")
};

// 每个技能能拿到的经验值上限，从内容里所有场景动态算出——
// 加新场景/新技能只需要改 content 文件，这里不用再手动同步数字。
function computeSkillMax() {
  const max = {};
  for (const key of Object.keys(GAME_CONTENT.skillMeta)) max[key] = 0;
  for (const scene of GAME_CONTENT.scenes) {
    for (const node of Object.values(scene.nodes)) {
      const correct = node.choices.find((c) => c.correct);
      if (correct && correct.xp) {
        max[node.skill] = (max[node.skill] || 0) + correct.xp;
      }
    }
  }
  return max;
}

const SKILL_MAX = computeSkillMax();

// 词汇量进度：按 skills/joshlabs-dev/references/projects/unlearn-english.md 里研究出来的
// CEFR 词族数门槛来算，不是"第几章=第几级"的粗映射。累计到当前场景为止玩家实际读到过
// 的不同词形数量（NPC 台词+两个选项都算，跟 scripts/validate-curriculum.mjs 同一套统计
// 口径），实时对照门槛换算成"当前在哪个级别、这一级走了多少百分比"。
// 门槛改了要同步 style.css 里 .level-bar 渐变的百分比断点（12.5% / 27.5% / 56.25%），
// 两边写死对应 500/1100/2250/4000 这四个数字，不是动态算的。B2 门槛(4000)是研究阶段
// 就定的数字，用来把渐变条延伸出B1，还没有真正写到B2的内容。
const CEFR_VOCAB_THRESHOLDS = [
  { level: "A1", words: 500 },
  { level: "A2", words: 1100 },
  { level: "B1", words: 2250 },
  { level: "B2", words: 4000 }
];

// 场景配色：按 sceneIndex 循环取一组柔和背景+强调色，让"换场景"有视觉提示
// （对齐手机 app lib/theme.ts 的 scenePalette，颜色照抄那边），而不是从头到尾
// 同一块米色卡片。见 renderSceneContent() 里怎么把它套到 .scene-card / .avatar /
// 顶部 HUD 的等级胶囊上。
const SCENE_PALETTE = [
  { bg: "#eef6ee", tint: "#3e8f4f" },
  { bg: "#eaf2fa", tint: "#3a7fb0" },
  { bg: "#f8eef4", tint: "#a8477a" },
  { bg: "#fbf3e2", tint: "#d9a63a" },
  { bg: "#f0eefa", tint: "#6a5acd" },
  { bg: "#fbeee4", tint: "#c06a3a" }
];

// 按本地时区拼"今天是几号"——不能用 toISOString()，那是 UTC，会在时区边界
// （比如晚上八九点后，UTC 已经跨到第二天）把"今天"算错，连续打卡就会莫名其妙断掉。
function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tokenizeWords(text) {
  if (!text) return [];
  return text.toLowerCase().match(/[a-z]+'?[a-z]*/g) || [];
}

// —— 词元归并（与 apps/mobile/lib/game/lemma.ts、scripts/lemma.mjs 逻辑相同，改一处同步三处）——
const LEMMA_IRREGULAR = {
  am: "be", is: "be", are: "be", was: "be", were: "be", been: "be", being: "be",
  has: "have", had: "have", having: "have", does: "do", did: "do", done: "do", doing: "do",
  went: "go", gone: "go", goes: "go", going: "go", came: "come", comes: "come", coming: "come",
  got: "get", gotten: "get", gets: "get", getting: "get", made: "make", makes: "make", making: "make",
  took: "take", taken: "take", takes: "take", taking: "take", saw: "see", seen: "see", sees: "see", seeing: "see",
  said: "say", says: "say", saying: "say", knew: "know", known: "know", knows: "know", knowing: "know",
  thought: "think", thinks: "think", thinking: "think", told: "tell", tells: "tell", telling: "tell",
  gave: "give", given: "give", gives: "give", giving: "give", found: "find", finds: "find", finding: "find",
  felt: "feel", feels: "feel", feeling: "feel", kept: "keep", keeps: "keep", keeping: "keep",
  left: "leave", leaves: "leave", leaving: "leave", met: "meet", meets: "meet", meeting: "meet",
  ran: "run", runs: "run", running: "run", paid: "pay", pays: "pay", paying: "pay",
  bought: "buy", buys: "buy", buying: "buy", brought: "bring", brings: "bring", bringing: "bring",
  sold: "sell", sells: "sell", selling: "sell", built: "build", builds: "build", building: "build",
  won: "win", wins: "win", winning: "win", lost: "lose", loses: "lose", losing: "lose",
  held: "hold", holds: "hold", holding: "hold", began: "begin", begun: "begin", begins: "begin", beginning: "begin",
  spoke: "speak", spoken: "speak", speaks: "speak", speaking: "speak", forgot: "forget", forgotten: "forget", forgets: "forget",
  wrote: "write", written: "write", writes: "write", writing: "write", heard: "hear", hears: "hear", hearing: "hear",
  ate: "eat", eaten: "eat", eats: "eat", eating: "eat", drank: "drink", drunk: "drink", drinks: "drink", drinking: "drink",
  slept: "sleep", sleeps: "sleep", sleeping: "sleep", woke: "wake", woken: "wake", wakes: "wake", waking: "wake",
  stood: "stand", stands: "stand", standing: "stand", sat: "sit", sits: "sit", sitting: "sit",
  children: "child", men: "man", women: "woman", feet: "foot", teeth: "tooth", mice: "mouse", people: "person",
  better: "good", best: "good", worse: "bad", worst: "bad", more: "many", most: "many", less: "little", least: "little",
  "i'm": "i", "i've": "i", "i'll": "i", "i'd": "i", "you're": "you", "you've": "you", "you'll": "you", "you'd": "you",
  "we're": "we", "we've": "we", "we'll": "we", "we'd": "we", "they're": "they", "they've": "they", "they'll": "they", "they'd": "they",
  "he's": "he", "he'll": "he", "he'd": "he", "she's": "she", "she'll": "she", "she'd": "she", "it's": "it", "it'll": "it", "it'd": "it",
  "that's": "that", "there's": "there", "here's": "here", "what's": "what", "who's": "who", "where's": "where", "how's": "how", "let's": "let",
  "don't": "do", "doesn't": "do", "didn't": "do", "can't": "can", cannot: "can", "couldn't": "could", "won't": "will", "wouldn't": "would",
  "isn't": "be", "aren't": "be", "wasn't": "be", "weren't": "be", "haven't": "have", "hasn't": "have", "hadn't": "have",
  "shouldn't": "should", "mustn't": "must", "needn't": "need",
};
const LEMMA_NO_STRIP = new Set(["tired", "excited", "interested", "bored", "worried", "scared", "pleased", "relieved", "exhausted", "thrilled", "amazed", "confused", "embarrassed", "disappointed", "annoyed", "satisfied", "delighted", "married", "engaged", "retired", "used", "supposed", "need", "seed", "feed", "speed", "bed", "red", "shed", "wed", "indeed", "tied", "died", "lied"]);
const LEMMA_STOP = new Set(["the", "a", "an", "and", "or", "but", "so", "of", "to", "in", "on", "at", "by", "for", "with", "from", "as", "is", "be", "am", "are", "was", "were", "it", "its", "this", "that", "these", "those", "i", "me", "my", "you", "your", "we", "us", "our", "they", "them", "their", "he", "him", "his", "she", "her", "do", "does", "did", "have", "has", "had", "not", "no", "yes", "if", "then", "than", "too", "very", "just", "here", "there", "up", "down", "out", "off", "over", "s", "t", "ll", "ve", "re", "d", "m", "let", "oh", "ok", "okay", "hi", "hey", "wow", "ah", "um", "hmm"]);
function lemmatize(word, vocab) {
  const w = word.toLowerCase();
  if (LEMMA_IRREGULAR[w]) return LEMMA_IRREGULAR[w];
  if (LEMMA_NO_STRIP.has(w)) return w;
  const base = w.replace(/'(s|re|ve|ll|d|m)$/, "");
  if (base !== w) return lemmatize(base, vocab);
  if (w.length <= 3) return w;
  const has = (c) => (vocab ? vocab.has(c) : true);
  const cands = [];
  const dbl = (st) => (/([^aeiou])\1$/.test(st) ? [st.slice(0, -1)] : []);
  if (w.endsWith("ies") && w.length > 4) cands.push(w.slice(0, -3) + "y");
  if (w.endsWith("ied") && w.length > 4) cands.push(w.slice(0, -3) + "y");
  if (w.endsWith("ing") && w.length > 5) { const st = w.slice(0, -3); cands.push(st + "e", st, ...dbl(st)); }
  if (w.endsWith("ed") && w.length >= 4) { const st = w.slice(0, -2); cands.push(st + "e", st, ...dbl(st)); }
  if (w.endsWith("iest") && w.length > 5) cands.push(w.slice(0, -4) + "y");
  if (w.endsWith("est") && w.length > 5) { const st = w.slice(0, -3); cands.push(st, st + "e", ...dbl(st)); }
  if (w.endsWith("ier") && w.length > 4) cands.push(w.slice(0, -3) + "y");
  if (w.endsWith("er") && w.length > 4) { const st = w.slice(0, -2); cands.push(st, st + "e", ...dbl(st)); }
  if (w.endsWith("es") && /(sh|ch|ss|x|z|o)es$/.test(w)) cands.push(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) cands.push(w.slice(0, -1));
  if (w.endsWith("ly") && w.length > 5) { cands.push(w.slice(0, -2)); if (w.endsWith("ily")) cands.push(w.slice(0, -3) + "y"); }
  for (const c of cands) if (c.length >= 2 && has(c)) return c;
  return w;
}
function isStopword(lemma) { return LEMMA_STOP.has(lemma) || lemma.length < 2; }

// —— 诚实计数（设计精华第 7 条）："接触过"和"掌握了"分开数，等级按"掌握"算 ——
// 只统计 NPC 句 + 正确选项，不算错误选项；按词元不按词形，去停用词。
// "掌握" = 出现 ≥ MASTERY_EXPOSURES 次，且玩家产出过（主线里亲口选过 / 闪回最终确认答对过）。
// 与 apps/mobile/lib/game/progress.ts 的 computeVocabStats 逻辑相同。
const MASTERY_EXPOSURES = 5;
let corpusVocabCache = null;
function corpusVocab() {
  if (corpusVocabCache) return corpusVocabCache;
  const vocab = new Set();
  for (const scene of GAME_CONTENT.scenes) {
    for (const node of Object.values(scene.nodes)) {
      tokenizeWords(node.npcLine.en).forEach((w) => vocab.add(w));
      for (const c of node.choices) tokenizeWords(c.text).forEach((w) => vocab.add(w));
    }
  }
  corpusVocabCache = vocab;
  return vocab;
}
function exposureCounts(upToSceneIndex) {
  const vocab = corpusVocab();
  const count = new Map();
  for (let i = 0; i <= upToSceneIndex && i < GAME_CONTENT.scenes.length; i++) {
    for (const node of Object.values(GAME_CONTENT.scenes[i].nodes)) {
      const right = node.choices.find((c) => c.correct);
      const lines = right ? [node.npcLine.en, right.text] : [node.npcLine.en];
      for (const line of lines) {
        for (const w of tokenizeWords(line)) {
          const lm = lemmatize(w, vocab);
          if (isStopword(lm)) continue;
          count.set(lm, (count.get(lm) || 0) + 1);
        }
      }
    }
  }
  return count;
}
function computeVocabStats(upToSceneIndex) {
  const vocab = corpusVocab();
  const count = exposureCounts(upToSceneIndex);
  const produced = new Set();
  for (const v of state.learnedVocab) for (const w of tokenizeWords(v.en)) produced.add(lemmatize(w, vocab));
  for (const w of state.confirmedWords || []) produced.add(lemmatize(w, vocab));
  let mastered = 0;
  for (const [lm, c] of count) if (c >= MASTERY_EXPOSURES && produced.has(lm)) mastered++;
  return { encountered: count.size, mastered };
}

// —— 复习不等答错（设计精华第 6 条）：一幕结束时，曝光刚好达到阈值的新词自动入队 ——
// 与 apps/mobile/lib/game/review.ts 的 enqueueExposureReviews 逻辑相同。
const EXPOSURE_REVIEW_THRESHOLD = 3;
const EXPOSURE_REVIEW_PER_SCENE = 2;
function enqueueExposureReviews(sceneIndex) {
  const scene = GAME_CONTENT.scenes[sceneIndex];
  if (!scene || typeof WORD_DICT === "undefined") return 0;
  const vocab = corpusVocab();
  const before = sceneIndex > 0 ? exposureCounts(sceneIndex - 1) : new Map();
  const inQueue = new Set(state.reviewQueue.map((r) => lemmatize(r.en, vocab)));
  const confirmed = new Set((state.confirmedWords || []).map((w) => lemmatize(w, vocab)));
  const seenHere = new Map();
  for (const node of Object.values(scene.nodes)) {
    const right = node.choices.find((c) => c.correct);
    const lines = [{ en: node.npcLine.en, zh: node.npcLine.zh }];
    if (right) lines.push({ en: right.text, zh: right.zh || node.npcLine.zh });
    for (const line of lines) {
      for (const w of tokenizeWords(line.en)) {
        const lm = lemmatize(w, vocab);
        if (isStopword(lm)) continue;
        const cur = seenHere.get(lm);
        if (cur) cur.count++;
        else seenHere.set(lm, { word: w, sentence: line.en, sentenceZh: line.zh, count: 1 });
      }
    }
  }
  const candidates = [];
  for (const [lm, info] of seenHere) {
    const prev = before.get(lm) || 0;
    if (prev >= EXPOSURE_REVIEW_THRESHOLD || prev + info.count < EXPOSURE_REVIEW_THRESHOLD) continue;
    if (info.word.length < 4 || inQueue.has(lm) || confirmed.has(lm)) continue;
    const meaning = WORD_DICT[info.word] || WORD_DICT[lm];
    if (!meaning) continue;
    candidates.push({ word: info.word, meaning, sentence: info.sentence, sentenceZh: info.sentenceZh });
  }
  candidates.sort((a, b) => b.word.length - a.word.length || a.word.localeCompare(b.word));
  let added = 0;
  for (const c of candidates.slice(0, EXPOSURE_REVIEW_PER_SCENE)) {
    state.reviewQueue.push({ en: c.word, zh: c.meaning, kind: "word", source: "exposure", streak: 0, status: "active", queuedAtScene: sceneIndex, sentence: c.sentence, sentenceZh: c.sentenceZh });
    added++;
  }
  return added;
}
// 通过最终确认的条目：把它的实词记进 confirmedWords（"掌握"的第二条证据）
function recordConfirmed(item) {
  const vocab = corpusVocab();
  const set = new Set(state.confirmedWords || []);
  for (const w of tokenizeWords(item.en)) { const lm = lemmatize(w, vocab); if (!isStopword(lm)) set.add(lm); }
  state.confirmedWords = [...set];
}

// —— 第三个选项（设计精华第 5 条）：从附近节点借一句"通顺但答非所问"的玩家句 ——
// 与 apps/mobile/lib/game/distractor.ts 逻辑相同。同一节点每次渲染都拿到同一句（确定性哈希）。
function pickContextualDistractor(sceneIndex, nodeId, node) {
  const WINDOW = 10, MIN_WORDS = 4;
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const correct = node.choices.find((c) => c.correct);
  if (!correct) return null;
  const cLen = tokenizeWords(correct.text).length;
  if (cLen < MIN_WORDS) return null;
  const own = new Set(node.choices.map((c) => c.text.trim().toLowerCase()));
  const context = new Set([...tokenizeWords(node.npcLine.en), ...node.choices.flatMap((c) => tokenizeWords(c.text))]);
  const lo = Math.max(0, sceneIndex - WINDOW), hi = Math.min(GAME_CONTENT.scenes.length - 1, sceneIndex + WINDOW);
  const pool = [];
  for (let i = lo; i <= hi; i++) {
    if (i === sceneIndex) continue;
    for (const [nid, n] of Object.entries(GAME_CONTENT.scenes[i].nodes)) {
      const right = n.choices.find((c) => c.correct);
      if (!right) continue;
      const ws = tokenizeWords(right.text);
      if (ws.length < MIN_WORDS || ws.length < cLen * 0.6 || ws.length > cLen * 1.5) continue;
      if (own.has(right.text.trim().toLowerCase())) continue;
      if (/\?$/.test(right.text.trim()) !== /\?$/.test(correct.text.trim())) continue;
      // 语境词重叠越少越"答非所问"；同一技能领域（同话题）再加 1 分惩罚，优先借别的话题的句子
      const overlap = ws.filter((w) => w.length > 3 && context.has(w)).length * 2 + (n.skill === node.skill ? 1 : 0);
      pool.push({ text: right.text, zh: right.zh, overlap, key: `${i}:${nid}` });
    }
  }
  if (pool.length === 0) return null;
  const minOverlap = Math.min(...pool.map((p) => p.overlap));
  const best = pool.filter((p) => p.overlap === minOverlap);
  const pick = best[hash(`${sceneIndex}:${nodeId}`) % best.length];
  return { text: pick.text, zh: pick.zh };
}

// 只统计玩家实际会读到的文字（NPC 台词 + 场景里出现过的选项），不算 vocabBank——
// 那是复习用的干扰项池，不是"读过的内容"。
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

function computeLevelProgress(wordCount) {
  // globalPct 是在"整条到 B1 的路"上的位置，用来算进度条该露出多少——
  // 露出比例要对得上 CSS 渐变里色带的绝对位置，不能只按当前级别内部的比例算，
  // 不然词汇量还远没到 A2，条却已经露到黄色那段去了。
  const finalTarget = CEFR_VOCAB_THRESHOLDS[CEFR_VOCAB_THRESHOLDS.length - 1].words;
  const globalPct = Math.max(0, Math.min(100, Math.round((wordCount / finalTarget) * 100)));

  let prevThreshold = 0;
  for (const tier of CEFR_VOCAB_THRESHOLDS) {
    if (wordCount < tier.words) {
      return { level: tier.level, globalPct, wordCount, target: tier.words };
    }
    prevThreshold = tier.words;
  }
  const last = CEFR_VOCAB_THRESHOLDS[CEFR_VOCAB_THRESHOLDS.length - 1];
  return { level: last.level + "+", globalPct, wordCount, target: last.words };
}

// 复习间隔规则（见 skills/joshlabs-dev/references/projects/unlearn-english.md）：
// 答错入队时 status="active"，短期内连对 2 次后不直接移出，改成 status="pendingFinal"，
// 等场景数间隔 ≥ REVIEW_GAP_SCENES 后再抽考一次做最终确认，通过才真正移出队列。
const REVIEW_GAP_SCENES = 5;
// 玩家中断超过这个时长再打开，判定为"回访"而非同一次的场景切换，触发断点热身。
const RECONNECT_GAP_MS = 20 * 60 * 1000;

// —— 留存/激励机制参数 ——
// 每天要答对几次算"打卡完成"；心数上限与回复速度；随机双倍经验的概率与倍数。
// 都是可调数字，不影响存档结构，改这几个常量就能重新平衡数值。
const DAILY_GOAL = 3;
const MAX_HEARTS = 5;
const HEART_REGEN_MS = 20 * 60 * 1000; // 每 20 分钟回 1 颗心（4小时→1小时→20分钟，一路调短）
const BONUS_XP_CHANCE = 0.2; // 变量奖励：约 20% 概率触发双倍经验，制造"随机惊喜"而非可预测的节奏
const BONUS_XP_MULTIPLIER = 2;

// 成就/称号：解锁的成就同时也是可以佩戴、显示在左上角身份标签上的称号。
// 内容层（chapter*.js）一直在自动增长、章节边界在引擎侧不可靠推算，所以不做
// "每章一个成就"，改成基于三类引擎侧已经在可靠实时算的数据：词汇量里程碑
// （复用 CEFR_VOCAB_THRESHOLDS 的门槛，两处口径保持一致）、技能精通（点满某个
// 技能的 XP）、连续打卡天数。技能精通那组是从 GAME_CONTENT.skillMeta 动态生成的，
// 跟 computeSkillMax() 一样的思路——以后内容层加新技能，成就自动跟上，不用手动同步。
// rarity 只影响成就墙里的描边/发光配色（见 style.css .achievement-card.rarity-*），
// 越靠后门槛越高就给越显眼的稀有度，纯视觉分层，不影响解锁判定。
const ACHIEVEMENTS = [
  { id: "vocab-a1", icon: "📖", title: "词汇破500 · A1达成", rarity: "bronze", check: (s, vocab) => vocab >= 500 },
  { id: "vocab-a2", icon: "📚", title: "词汇破1100 · A2达成", rarity: "silver", check: (s, vocab) => vocab >= 1100 },
  { id: "vocab-b1", icon: "🎓", title: "词汇破2250 · B1达成", rarity: "gold", check: (s, vocab) => vocab >= 2250 },
  { id: "vocab-b2", icon: "🏆", title: "词汇破4000 · B2达成", rarity: "diamond", check: (s, vocab) => vocab >= 4000 },
  ...Object.entries(GAME_CONTENT.skillMeta).map(([key, meta]) => ({
    id: "skill-" + key,
    icon: meta.icon,
    title: meta.label + "达人",
    rarity: "silver",
    check: (s) => (s.skills[key] || 0) >= (SKILL_MAX[key] || Infinity)
  })),
  { id: "streak-3", icon: "🔥", title: "连续学习3天", rarity: "bronze", check: (s) => (s.streak || 0) >= 3 },
  { id: "streak-7", icon: "🔥", title: "连续学习7天", rarity: "gold", check: (s) => (s.streak || 0) >= 7 },
  { id: "streak-30", icon: "🔥", title: "连续学习30天", rarity: "diamond", check: (s) => (s.streak || 0) >= 30 }
];

// 找出这次新解锁的成就（跟上次存的 unlockedAchievements 比对），记下来 + 逐个弹庆祝提示。
// 调用时机：答对一题之后（技能XP/词汇量可能变了）、每日打卡结算之后（streak可能变了）。
function checkAchievements() {
  const vocab = computeVocabExposure(state.sceneIndex);
  const unlocked = state.unlockedAchievements || (state.unlockedAchievements = []);
  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) => !unlocked.includes(a.id) && a.check(state, vocab)
  );
  if (newlyUnlocked.length === 0) return;
  newlyUnlocked.forEach((a) => unlocked.push(a.id));
  saveState();
  newlyUnlocked.forEach((a, i) => setTimeout(() => showAchievementToast(a), i * 2600));
}

// 成就解锁提示：居中卡片，比 spawnXpFloat 那种飘字更醒目、停留更久，
// 点一下可以提前关掉，不用干等自动消失。
let achievementToastTimer = null;
function showAchievementToast(achievement) {
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.innerHTML = `
    <div class="achievement-toast-icon">${achievement.icon}</div>
    <div class="achievement-toast-body">
      <div class="achievement-toast-label zh-inline">解锁成就</div>
      <div class="achievement-toast-title">${achievement.title}</div>
    </div>
  `;
  const dismiss = () => {
    toast.classList.add("achievement-toast-out");
    setTimeout(() => toast.remove(), 250);
  };
  toast.addEventListener("click", dismiss);
  // 挂在 .phone-shell 下面而不是 document.body——它是 position:fixed，
  // 定位基准跟着 shell 走，才会居中在"手机屏幕"里，不会跑到宽屏手机边框外面。
  el.phoneShell.appendChild(toast);
  setTimeout(dismiss, 3800);
}

// 纯文字提示条，复用成就 toast 的卡片样式（没有图标/双行结构，就一行字）。
// 目前只用来在第一次打开盲听模式时告诉玩家怎么操作。
function showTextToast(text, ms) {
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.textContent = text;
  const dismiss = () => {
    toast.classList.add("achievement-toast-out");
    setTimeout(() => toast.remove(), 250);
  };
  toast.addEventListener("click", dismiss);
  el.phoneShell.appendChild(toast);
  setTimeout(dismiss, ms || 4200);
}

function freshState() {
  const skills = {};
  for (const key of Object.keys(GAME_CONTENT.skillMeta)) skills[key] = 0;
  return {
    sceneIndex: 0,
    nodeId: GAME_CONTENT.scenes[0].startNode,
    skills,
    learnedVocab: [], // [{en, zh, skill}]
    reviewQueue: [], // [{en, zh, streak, status: "active"|"pendingFinal", queuedAtScene}]
    finished: false,
    lastActiveAt: Date.now(),
    // 旧存档没有下面这些字段——不做迁移，读取方一律用 ?? / || 兜底默认值，
    // 新开一局才会真的用到这里写的初始值。
    streak: 0,
    lastStreakDate: null, // 本地日期字符串 "YYYY-MM-DD"，null 表示还没打过卡
    dailyCorrectCount: 0,
    dailyCorrectDate: null,
    hearts: MAX_HEARTS,
    lastHeartAt: Date.now(),
    // 角色定制 + 成就/称号，同样不做旧存档迁移，读取方一律兜底默认值。
    playerName: null,
    playerAvatar: "🍎",
    playerAvatarImage: null, // 上传的照片：压缩过的方形头像，data URL；设了就优先于 emoji
    equippedTitle: null,
    unlockedAchievements: [],
    confirmedWords: [] // 闪回最终确认答对过的词元（"掌握"的第二条证据）
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.skills) return freshState();
    return parsed;
  } catch (e) {
    return freshState();
  }
}

function saveState() {
  state.lastActiveAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  if (window.GameAuth) window.GameAuth.pushSave(state); // 登录了才会真的发请求，见 auth.js
}

let state = loadState();
// 上次存档时间到这次打开的间隔——loadState() 读到的是上一次会话留下的旧值，
// 必须在第一次 saveState() 覆盖掉它之前算出来，才能判断这次是不是"回访"。
const reconnectGapMs = state.lastActiveAt ? Date.now() - state.lastActiveAt : 0;

// 打开 App 就预热当前章 + 下一章的音频缓存：新玩家等于自动把第1章下载好，
// 回访玩家（比如清过缓存、或这个功能是后来上的）也能补上当前进度所在章节。
if (typeof CHAPTER_INDEX !== "undefined") {
  const resumeChapter = [...CHAPTER_INDEX].reverse().find((c) => c.sceneIndex <= state.sceneIndex);
  if (resumeChapter) {
    prefetchChapterAudio(resumeChapter.chapter);
    prefetchChapterAudio(resumeChapter.chapter + 1);
  }
}
let pendingFlashback = []; // queue of items to review before advancing scene
let flashbackTotal = 0; // 本轮闪回队列的初始长度，只用来画进度点，随 pendingFlashback 一起在下面几处赋值点同步设置
let flashbackOnComplete = goToNextScene; // 闪回队列清空后要做什么：正常翻页，或断点热身后继续当前场景
let wrongButtonsThisNode = new Set();
// 当前这次闪回是不是"心数清零后，靠复习赚回一颗心"触发的——是的话，
// resolveFlashback 答对时要额外加一颗心；跟场景末尾/断点热身的闪回复用同一套 UI，
// 不用另开一个弹层，只是这个标记决定结算方式不一样。
let heartRecoveryMode = false;

// 中文翻译显隐：全局开关，存在 localStorage 里跨场景/跨次打开都记得。
// 只影响台词下方的中文翻译（.npc-zh），不影响回忆闪回的中文提示——那是游戏机制本身要考的。
const ZH_HIDE_KEY = "eng-rpg-hide-zh";
let hideZh = localStorage.getItem(ZH_HIDE_KEY) !== "0";

const TITLE_ZH = "十年之约 · Unlearn";
const TITLE_EN = "A Decade Apart · Unlearn";

function applyZhVisibility() {
  document.body.classList.toggle("hide-zh", hideZh);
  el.zhToggleBtn.textContent = hideZh ? "显示中文" : "隐藏中文";
  el.zhToggleBtn.setAttribute("aria-pressed", String(!hideZh));
  document.title = hideZh ? TITLE_EN : TITLE_ZH;
}

// 盲听模式：全局开关，跟 hideZh 一样存 localStorage。开启后台词区域换成
// .npc-listen-hint 占位提示（英文原句和中文翻译都先不给），逼着玩家先听音频
// 再从选项里挑答案；轻触=重播，长按=临时露出中文当提示（见下面 pointerdown 逻辑）。
const BLIND_LISTEN_KEY = "eng-rpg-blind-listen";
const BLIND_LISTEN_TIP_KEY = "eng-rpg-blind-listen-tip-seen";
let blindListen = localStorage.getItem(BLIND_LISTEN_KEY) === "1";

function applyBlindListenVisibility() {
  document.body.classList.toggle("blind-listen", blindListen);
  el.blindListenBtn.textContent = blindListen ? "🎧 退出盲听模式" : "🎧 盲听模式";
  el.blindListenBtn.setAttribute("aria-pressed", String(blindListen));
}

// 点词查词：把英文台词拆成单词 span，点一下弹出中文释义，几秒后自动收起。
// 点过的词会记进 reviewQueue，跟错题走同一套间隔重复机制——查过的词不是查完就算，
// 之后还会在闪回复习里再考一次。
const WORD_POPUP_MS = 2500;
let wordPopupTimer = null;

// 已经点查过的词：常态显示品牌绿（不用等再点一次才高亮），一眼能看出这句里
// 哪些词是自己收藏过的——生词本页面（vocab.html）就是照这份集合反查句子的。
const knownWords = new Set(
  state.reviewQueue.filter((r) => r.kind === "word").map((r) => r.en.toLowerCase())
);

function wrapWordsHTML(text, sentenceZh) {
  const sentenceAttr = encodeURIComponent(text);
  const zhAttr = encodeURIComponent(sentenceZh || "");
  return text.replace(/[A-Za-zÀ-ÿ']+/g, (word) => {
    const cls = knownWords.has(word.toLowerCase()) ? "word word-known" : "word";
    return `<span class="${cls}" data-word="${word.toLowerCase()}" data-sentence="${sentenceAttr}" data-sentence-zh="${zhAttr}">${word}</span>`;
  });
}

function queueWordForReview(word, meaning, sentenceEn, sentenceZh) {
  // 已经在复习队列里的话不重复加、不重置进度——只是又查了一下不代表没学会，
  // 只有故事里真答错才算"没学会"，重置进度这件事只归 handleChoice 管。
  const existing = state.reviewQueue.find((r) => r.en === word && r.kind === "word");
  if (existing) {
    if (sentenceEn && !existing.sentence) {
      existing.sentence = sentenceEn;
      existing.sentenceZh = sentenceZh;
      saveState();
    }
    return;
  }
  state.reviewQueue.push({
    en: word,
    zh: meaning,
    kind: "word",
    sentence: sentenceEn || null,
    sentenceZh: sentenceZh || null,
    streak: 0,
    status: "active",
    queuedAtScene: state.sceneIndex
  });
  knownWords.add(word.toLowerCase());
  saveState();
}

function showWordPopup(wordEl) {
  const word = wordEl.dataset.word;
  const meaning = typeof WORD_DICT !== "undefined" ? WORD_DICT[word] : null;
  if (!meaning) return;
  el.wordPopup.textContent = `${wordEl.textContent} ${meaning}`;
  el.wordPopup.classList.remove("hidden");

  // .word-popup 是 position:fixed，但定位基准是 .phone-shell（见 style.css 里
  // .phone-shell 的 transform 注释），所以这里所有坐标都要减去 shellRect 的偏移，
  // 不能直接用 window.innerWidth——宽屏手机边框模式下 shell 是居中悬浮的一小块，
  // 跟真实浏览器窗口对不上。
  const shellRect = el.phoneShell.getBoundingClientRect();
  const rect = wordEl.getBoundingClientRect();
  const popRect = el.wordPopup.getBoundingClientRect();
  let left = rect.left - shellRect.left + rect.width / 2 - popRect.width / 2;
  left = Math.max(8, Math.min(left, shellRect.width - popRect.width - 8));
  // 手指点的地方会挡住紧贴单词上方的位置，隔远一点（不是10px那种贴着），
  // 弹出层才不会被指尖本身盖住。
  const CLEARANCE = 36;
  let top = rect.top - shellRect.top - popRect.height - CLEARANCE;
  if (top < 8) top = rect.bottom - shellRect.top + CLEARANCE;
  el.wordPopup.style.left = left + "px";
  el.wordPopup.style.top = top + "px";

  document.querySelectorAll(".word.word-active").forEach((w) => w.classList.remove("word-active"));
  wordEl.classList.add("word-active");
  // 收藏态是永久的（跟 word-active 那个 2.5 秒就收起的临时高亮不一样）：点过一次，
  // 这句里同名的词全部立刻变绿，不用等下次重新渲染。
  document.querySelectorAll(`.word[data-word="${word}"]`).forEach((w) => w.classList.add("word-known"));

  // 单词发音走独立的 WORD_AUDIO_MANIFEST（按 WORD_DICT 的 key 合成），
  // 跟整句配音的 AUDIO_MANIFEST 分开维护——查词弹出解释的同时读一遍这个词。
  if (typeof WORD_AUDIO_MANIFEST !== "undefined") {
    playAudio(word, null, WORD_AUDIO_MANIFEST);
  }

  clearTimeout(wordPopupTimer);
  wordPopupTimer = setTimeout(hideWordPopup, WORD_POPUP_MS);

  const sentenceEn = decodeURIComponent(wordEl.dataset.sentence || "");
  const sentenceZh = decodeURIComponent(wordEl.dataset.sentenceZh || "");
  queueWordForReview(word, meaning, sentenceEn, sentenceZh);
}

function hideWordPopup() {
  clearTimeout(wordPopupTimer);
  el.wordPopup.classList.add("hidden");
  document.querySelectorAll(".word.word-active").forEach((w) => w.classList.remove("word-active"));
}

// 点查词范围：不只是台词本身，场景大标题（英文）、小标题也能点单词查释义——
// 都走同一套 showWordPopup，查过的词照样存进 reviewQueue 参与复习。
function attachWordLookup(container, { capture = false } = {}) {
  container.addEventListener(
    "click",
    (e) => {
      const wordEl = e.target.closest(".word");
      if (!wordEl) return;
      // 选择题按钮里的单词也能点查——但要在捕获阶段拦下，
      // 不然点单词会先冒泡触发按钮自己的 click（等于顺手把这个选项点选了）。
      if (capture) e.stopPropagation();
      showWordPopup(wordEl);
    },
    capture
  );
}
[el.npcEn, el.sceneTitle, el.sceneSubtitle].forEach((c) => attachWordLookup(c));
[el.choices, el.flashbackChoices].forEach((c) => attachWordLookup(c, { capture: true }));

function currentScene() {
  return GAME_CONTENT.scenes[state.sceneIndex];
}

function currentNode() {
  return currentScene().nodes[state.nodeId];
}

// 翻页回看历史：游戏永远只有"答对才能往前走"这一条路径，所以玩家已经走过的
// 每一句，都能从 GAME_CONTENT 按 scene.startNode → node.next 重新推导出来，
// 不用另外维护一份 history 存档字段——省得旧存档没有这个字段还要迁移。
// 算到当前 state.sceneIndex/state.nodeId（还没作答的那一句）为止，不包含它本身。
function buildHistory() {
  const history = [];
  for (let s = 0; s <= state.sceneIndex && s < GAME_CONTENT.scenes.length; s++) {
    const scene = GAME_CONTENT.scenes[s];
    let nodeId = scene.startNode;
    let guard = 0;
    while (nodeId && scene.nodes[nodeId] && guard++ < 50) {
      if (s === state.sceneIndex && nodeId === state.nodeId) break;
      const node = scene.nodes[nodeId];
      const correct = node.choices.find((c) => c.correct);
      history.push({ sceneIndex: s, nodeId, node, correct });
      nodeId = node.next;
    }
  }
  return history;
}

// null = 在当前直播（可互动）的节点；否则是 buildHistory() 数组的下标，
// 表示正在翻看第几条已经答对过的历史记录。只是个 UI 状态，不落存档，
// 刷新页面就回到直播位置，符合"翻页只是回看，不是切换游戏进度"的预期。
let browseIndex = null;

function updateHistoryNavUI() {
  const history = buildHistory();
  const browsing = browseIndex !== null;
  el.historyBanner.classList.toggle("hidden", !browsing);
  el.historyPrevBtn.disabled = history.length === 0 || (browsing && browseIndex === 0);
  el.historyNextBtn.disabled = !browsing;
}

function renderHistoryView(entry) {
  const scene = GAME_CONTENT.scenes[entry.sceneIndex];
  const node = entry.node;

  hideWordPopup();
  document.body.classList.remove("zh-peek");
  const scenePalette = SCENE_PALETTE[entry.sceneIndex % SCENE_PALETTE.length];
  el.sceneCard.style.background = scenePalette.bg;
  el.avatar.style.borderColor = scenePalette.tint;
  el.sceneTitle.innerHTML = wrapWordsHTML(scene.title);
  el.sceneSubtitle.innerHTML = wrapWordsHTML(scene.subtitle);
  el.avatar.textContent = node.avatar || scene.avatar;
  el.npcEn.innerHTML = wrapWordsHTML(node.npcLine.en, node.npcLine.zh);
  el.npcZh.textContent = node.npcLine.zh;
  playAudio(node.npcLine.en, el.npcEn);
  el.hint.textContent = "";
  el.hint.classList.remove("visible");

  // 回看模式只读：只展示当时选对的那句，禁用点击，不能重新作答。
  el.choices.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "choice-btn correct";
  btn.textContent = entry.correct ? entry.correct.text : "";
  btn.disabled = true;
  el.choices.appendChild(btn);

  updateHistoryNavUI();
}

function goToPrevHistory() {
  const history = buildHistory();
  if (history.length === 0) return;
  browseIndex = browseIndex === null ? history.length - 1 : Math.max(0, browseIndex - 1);
  renderHistoryView(history[browseIndex]);
}

function goToNextHistory() {
  if (browseIndex === null) return;
  const history = buildHistory();
  if (browseIndex < history.length - 1) {
    browseIndex++;
    renderHistoryView(history[browseIndex]);
  } else {
    // 已经翻到最新一条历史记录，再往前一步就是回到当前直播、可以正常作答的节点
    browseIndex = null;
    renderScene();
  }
}

el.historyPrevBtn.addEventListener("click", goToPrevHistory);
el.historyNextBtn.addEventListener("click", goToNextHistory);

// 连续打卡 + 每日目标：同一次"今天第一次答对"的判定里一起结算，
// 避免分别读一遍"今天是几号"却因为跨了午夜边界得出不一致的结果。
// 只在 handleChoice 的答对分支调用——回忆闪回答对不算"今天打卡"，
// 不然玩家光靠复习旧词条就能刷连续记录，跟"今天有没有学新内容"这件事脱节了。
function registerDailyProgress() {
  const today = localDateStr();

  if (state.lastStreakDate !== today) {
    const yesterday = localDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
    state.streak = state.lastStreakDate === yesterday ? (state.streak || 0) + 1 : 1;
    state.lastStreakDate = today;
  }

  if (state.dailyCorrectDate !== today) {
    state.dailyCorrectDate = today;
    state.dailyCorrectCount = 0;
  }
  const wasComplete = (state.dailyCorrectCount || 0) >= DAILY_GOAL;
  state.dailyCorrectCount = (state.dailyCorrectCount || 0) + 1;
  const nowComplete = state.dailyCorrectCount >= DAILY_GOAL;
  return { justHitGoal: nowComplete && !wasComplete };
}

function renderStreakUI() {
  el.streakBadge.textContent = `🔥 ${state.streak || 0}`;
  const checkedInToday = state.lastStreakDate === localDateStr();
  el.streakBanner.classList.toggle("hidden", checkedInToday);
  if (!checkedInToday) updateStreakCountdown();
}

// 倒计时到本地零点——玩家今天还没打卡时才会用到，答对一次横幅立刻消失，
// 不用等这个定时器下一轮才刷新。
function updateStreakCountdown() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const msLeft = Math.max(0, midnight - now);
  const hours = Math.floor(msLeft / 3600000);
  const mins = Math.floor((msLeft % 3600000) / 60000);
  el.streakBanner.textContent = `🔥 今天还没打卡，还剩 ${hours} 小时 ${mins} 分钟，别断了连续记录！`;
}
// 横幅一直挂着的时候每半分钟刷新一次倒计时文字就够了，没必要按秒跳。
setInterval(() => {
  if (!el.streakBanner.classList.contains("hidden")) updateStreakCountdown();
}, 30000);

function renderDailyGoal() {
  const today = localDateStr();
  const count = state.dailyCorrectDate === today ? state.dailyCorrectCount || 0 : 0;
  const pct = Math.min(100, Math.round((count / DAILY_GOAL) * 100));
  el.dailyGoalFill.style.width = pct + "%";
  el.dailyGoalCount.textContent = `${Math.min(count, DAILY_GOAL)}/${DAILY_GOAL}`;
  el.dailyGoalCard.classList.toggle("goal-complete", count >= DAILY_GOAL);
}

// 达成今日目标的庆祝动画：纯 CSS/JS 生成的彩纸屑，不引入任何图片/音频素材。
// 只在"刚好这一次跨过目标线"时调用一次（见 handleChoice），renderDailyGoal 本身
// 之后每次重渲染只是维持 goal-complete 这个 class，不会重复放这段动画。
const CONFETTI_COLORS = ["var(--accent)", "var(--correct)", "var(--accent-soft)"];
function celebrateDailyGoal() {
  // 强制重排一下再重新加 class，保证动画能重新触发（万一这个 class 已经在上面了）
  el.dailyGoalCard.classList.remove("goal-complete");
  void el.dailyGoalCard.offsetWidth;
  el.dailyGoalCard.classList.add("goal-complete");

  // 跟 showAchievementToast 一样，坐标和挂载点都相对 .phone-shell，
  // 宽屏手机边框模式下才不会飘到"手机"外面去。
  const shellRect = el.phoneShell.getBoundingClientRect();
  const originX = shellRect.width / 2;
  for (let i = 0; i < 24; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = originX + (Math.random() - 0.5) * 280 + "px";
    piece.style.top = "110px";
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDelay = Math.random() * 0.25 + "s";
    el.phoneShell.appendChild(piece);
    setTimeout(() => piece.remove(), 1600);
  }
}

// 心数：不用定时器实时刷新，而是每次要用到时按"过了几个 4 小时"来补——
// 补满几颗心，lastHeartAt 就往前推进对应的整段时间，剩下不足一个周期的零头
// 留着继续累积，不会因为"看了一眼"就被偷走进度。满心状态下 lastHeartAt
// 持续贴着"现在"走，这样从满心掉血的那一刻起，下一颗心才重新开始计时。
function syncHearts() {
  const prevHearts = state.hearts;
  const prevAt = state.lastHeartAt;
  let hearts = state.hearts ?? MAX_HEARTS;
  let lastHeartAt = state.lastHeartAt ?? state.lastActiveAt ?? Date.now();

  if (hearts < MAX_HEARTS) {
    const elapsed = Date.now() - lastHeartAt;
    const regen = Math.floor(elapsed / HEART_REGEN_MS);
    if (regen > 0) {
      hearts = Math.min(MAX_HEARTS, hearts + regen);
      lastHeartAt += regen * HEART_REGEN_MS;
    }
  } else {
    lastHeartAt = Date.now();
  }

  state.hearts = hearts;
  state.lastHeartAt = lastHeartAt;
  if (hearts !== prevHearts || lastHeartAt !== prevAt) saveState();
  return hearts;
}

function loseHeart() {
  syncHearts(); // 扣血前先把该回的心补上，不然扣血这一刻可能刚好卡在回复点之后
  state.hearts = Math.max(0, (state.hearts ?? MAX_HEARTS) - 1);
}

function renderHeartsDisplay() {
  const hearts = syncHearts();
  const heartsRow = "❤️".repeat(hearts) + "🖤".repeat(Math.max(0, MAX_HEARTS - hearts));
  el.heartsDisplay.innerHTML = "";
  const rowEl = document.createElement("div");
  rowEl.className = "hearts-row";
  rowEl.textContent = heartsRow;
  el.heartsDisplay.appendChild(rowEl);
}

// 心数清零时不硬卡关：不让玩家点新的选项，但给一条出路——去复习队列里
// 挑一条清掉，答对就还一颗心。复习队列本来就空的话说明没东西能清，
// 这种边缘情况直接放行，不然会真的卡死（见 renderSceneContent 里的判断）。
function renderHeartGate() {
  const msg = document.createElement("p");
  msg.className = "heart-gate-msg";
  msg.textContent = "💔 心数用完了，先复习一条已学内容赚回一颗心，才能继续对话。";
  const btn = document.createElement("button");
  btn.className = "primary-btn";
  btn.type = "button";
  btn.textContent = "🎬 开始复习";
  btn.addEventListener("click", startHeartRecoveryFlashback);
  el.choices.appendChild(msg);
  el.choices.appendChild(btn);
}

function startHeartRecoveryFlashback() {
  if (state.reviewQueue.length === 0) {
    renderScene();
    return;
  }
  heartRecoveryMode = true;
  el.flashbackLabel.textContent = "❤️ 复习赚心 · 答对就能回一颗心";
  flashbackOnComplete = () => {
    heartRecoveryMode = false;
    renderScene();
  };
  pendingFlashback = [state.reviewQueue[0]];
  flashbackTotal = pendingFlashback.length;
  showFlashback();
}

function renderSkillPanel() {
  el.skillPanel.innerHTML = "";
  for (const [key, meta] of Object.entries(GAME_CONTENT.skillMeta)) {
    const xp = state.skills[key] || 0;
    const max = SKILL_MAX[key] || 1;
    const pct = Math.min(100, Math.round((xp / max) * 100));
    const row = document.createElement("div");
    row.className = "skill-row";
    row.innerHTML = `
      <div class="skill-label">${meta.icon} ${meta.labelEn} <span class="zh-inline">${meta.label}</span></div>
      <div class="skill-bar"><div class="skill-bar-fill" style="width:${pct}%"></div></div>
      <div class="skill-xp">${xp}/${max}</div>
    `;
    row.addEventListener("click", () => {
      location.href = "category.html?skill=" + encodeURIComponent(key);
    });
    el.skillPanel.appendChild(row);
  }
  const totalXp = Object.values(state.skills).reduce((a, b) => a + b, 0);
  el.xpTotal.textContent = totalXp;
  el.vocabCount.textContent = state.learnedVocab.length;
  if (el.leaderboardSelfXp) el.leaderboardSelfXp.textContent = totalXp;

  // 每次总分变化顺手推一次排行榜（哪怕没登录也调用，pushLeaderboard 内部会自己判断
  // currentUser 存不存在再决定要不要真的发请求，这里不用重复判断登录状态）。
  const user = window.GameAuth && window.GameAuth.getUser();
  if (user) {
    window.GameAuth.pushLeaderboard({ nickname: getNickname(user), totalXp });
  }
}

// 排行榜：谁都能查（未登录也看得到榜），自己那一行按 user_id 对比高亮，
// 不用额外发一次"查我的排名"请求。
async function renderLeaderboard() {
  if (!window.GameAuth || !el.leaderboardList) return;
  const rows = await window.GameAuth.fetchLeaderboard(10);
  el.leaderboardList.innerHTML = "";
  if (rows.length === 0) {
    el.leaderboardEmpty.classList.remove("hidden");
    return;
  }
  el.leaderboardEmpty.classList.add("hidden");
  const myId = window.GameAuth.getUser() ? window.GameAuth.getUser().id : null;
  rows.forEach((row, i) => {
    const li = document.createElement("li");
    li.className = "leaderboard-row" + (row.user_id === myId ? " leaderboard-row-self" : "");
    li.innerHTML = `
      <span class="leaderboard-rank">${i + 1}</span>
      <span class="leaderboard-name">${row.nickname}</span>
      <span class="leaderboard-xp">${row.total_xp}</span>
    `;
    el.leaderboardList.appendChild(li);
  });
}

function renderProgress() {
  // 百分比进度条 + "第 N / M 幕" 文字，对齐手机 app 的做法——全 94 章合并进来
  // 快上千幕，一格一幕的圆点行会挤成一条看不清的细线（见上面 .scene-progress-bar
  // 的注释）。
  const pct = Math.round(((state.sceneIndex + 1) / GAME_CONTENT.scenes.length) * 100);
  el.sceneProgressFill.style.width = pct + "%";
  el.sceneProgressLabel.textContent = `第 ${state.sceneIndex + 1} / ${GAME_CONTENT.scenes.length} 幕`;

  // 诚实计数：等级按"掌握"的词元数算，"接触"数只做参考（设计精华第 7 条）
  const stats = computeVocabStats(state.sceneIndex);
  const { level, globalPct, target } = computeLevelProgress(stats.mastered);
  el.levelBarMask.style.width = 100 - globalPct + "%";
  el.levelLabel.textContent = `${level} · 掌握 ${stats.mastered}/${target} · 接触 ${stats.encountered}`;
  el.hudLevelPill.textContent = level;
}

// 配音播放：按台词原文去 AUDIO_MANIFEST 里查对应的音频文件。
// 找不到就静默跳过（内容没配到音也不影响游戏本身）。
// 返回一个 Promise，在这段音频真正播完（或没有音频/播放失败）时 resolve——
// 调用方可以用它来"等配音说完再翻页"，而不是猜一个固定延迟。
let currentAudio = null;
function playAudio(text, btnEl, manifest) {
  const activeManifest = manifest || (typeof AUDIO_MANIFEST !== "undefined" ? AUDIO_MANIFEST : null);
  const src = activeManifest ? activeManifest[text] : null;
  if (!src) return Promise.resolve();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  const audio = new Audio(src);
  currentAudio = audio;
  if (btnEl) btnEl.classList.add("playing");

  return new Promise((resolve) => {
    const done = () => {
      if (btnEl) btnEl.classList.remove("playing");
      resolve();
    };
    audio.addEventListener("ended", done, { once: true });
    audio.addEventListener("error", done, { once: true });
    audio.play().catch(done);
  });
}

// 章节音频预加载：边学边在后台把下一章的配音下载好，做到"翻到下一章即点即播放"。
// 缓存名必须跟 sw.js 里的 CACHE_NAME 保持一致——这样离线时 sw.js 的 fetch 兜底
// (caches.match) 才能命中这里提前存好的文件，不需要额外改 Service Worker。
const AUDIO_CACHE_NAME = "unlearn-english-v1";

function getChapterSceneRange(chapterNum) {
  if (typeof CHAPTER_INDEX === "undefined") return null;
  const entry = CHAPTER_INDEX.find((c) => c.chapter === chapterNum);
  if (!entry) return null;
  const nextEntry = CHAPTER_INDEX.find((c) => c.chapter === chapterNum + 1);
  return { start: entry.sceneIndex, end: nextEntry ? nextEntry.sceneIndex : GAME_CONTENT.scenes.length };
}

// 按章节号收集这一章所有台词（NPC 台词 + 选项文案）对应的音频文件地址，
// 去 AUDIO_MANIFEST 里查不到（没配音的文案）就跳过。
function collectChapterAudioUrls(chapterNum) {
  const range = getChapterSceneRange(chapterNum);
  if (!range || typeof AUDIO_MANIFEST === "undefined") return [];
  const urls = new Set();
  for (let i = range.start; i < range.end; i++) {
    const scene = GAME_CONTENT.scenes[i];
    if (!scene || !scene.nodes) continue;
    for (const node of Object.values(scene.nodes)) {
      const texts = [];
      if (node.npcLine && node.npcLine.en) texts.push(node.npcLine.en);
      if (Array.isArray(node.choices)) {
        for (const choice of node.choices) if (choice.text) texts.push(choice.text);
      }
      for (const text of texts) {
        const url = AUDIO_MANIFEST[text];
        if (url) urls.add(url);
      }
    }
  }
  return Array.from(urls);
}

// 限流并发地把音频塞进 Cache Storage；已经缓存过的文件直接跳过，避免重复占流量。
// 省流量模式下（Data Saver）不做预加载，尊重用户的网络设置。
async function prefetchAudioUrls(urls) {
  if (!urls.length || !("caches" in window)) return;
  if (navigator.connection && navigator.connection.saveData) return;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    let i = 0;
    async function worker() {
      while (i < urls.length) {
        const url = urls[i++];
        const hit = await cache.match(url);
        if (hit) continue;
        try {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
        } catch (e) {} // 离线或单个文件失败不影响其他文件，也不影响正常游戏
      }
    }
    await Promise.all(Array.from({ length: 4 }, worker)); // 4路并发，兼顾速度和不占满带宽
  } catch (e) {}
}

function prefetchChapterAudio(chapterNum) {
  const urls = collectChapterAudioUrls(chapterNum);
  if (urls.length) prefetchAudioUrls(urls);
}

// 音效：用 Web Audio API 合成，不依赖外部音频文件。
let sfxCtx = null;
function getSfxCtx() {
  if (!sfxCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    sfxCtx = new Ctx();
  }
  if (sfxCtx.state === "suspended") sfxCtx.resume();
  return sfxCtx;
}

function playTone(freq, startTime, duration, { type = "sine", gain = 0.2, ctx } = {}) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, startTime);
  g.gain.exponentialRampToValueAtTime(gain, startTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playCorrectSfx() {
  try {
    const ctx = getSfxCtx();
    const now = ctx.currentTime;
    playTone(660, now, 0.12, { ctx });
    playTone(880, now + 0.1, 0.16, { ctx });
  } catch (e) {}
}

function playWrongSfx() {
  try {
    const ctx = getSfxCtx();
    const now = ctx.currentTime;
    playTone(220, now, 0.18, { type: "sawtooth", gain: 0.15, ctx });
    playTone(160, now + 0.08, 0.2, { type: "sawtooth", gain: 0.15, ctx });
  } catch (e) {}
}

function playXpSfx() {
  try {
    const ctx = getSfxCtx();
    const now = ctx.currentTime;
    playTone(988, now, 0.08, { type: "triangle", gain: 0.18, ctx });
    playTone(1319, now + 0.06, 0.12, { type: "triangle", gain: 0.18, ctx });
  } catch (e) {}
}

// 变量奖励命中时用的音效：比普通 +XP 多一层上扬的音，跟视觉上的"双倍"一起，
// 听感也要跟平时不一样，不只是加个视觉标签。
function playBonusXpSfx() {
  try {
    const ctx = getSfxCtx();
    const now = ctx.currentTime;
    playTone(988, now, 0.08, { type: "triangle", gain: 0.2, ctx });
    playTone(1319, now + 0.07, 0.1, { type: "triangle", gain: 0.2, ctx });
    playTone(1760, now + 0.14, 0.16, { type: "triangle", gain: 0.22, ctx });
  } catch (e) {}
}

function spawnXpFloat(fromEl, amount, isBonus) {
  const shellRect = el.phoneShell.getBoundingClientRect();
  const rect = fromEl.getBoundingClientRect();
  const float = document.createElement("span");
  float.className = isBonus ? "xp-float xp-float-bonus" : "xp-float";
  float.textContent = isBonus ? `🎉 双倍 XP! +${amount}` : `+${amount} XP`;
  float.style.left = rect.right - shellRect.left - (isBonus ? 100 : 60) + "px";
  float.style.top = rect.top - shellRect.top - 6 + "px";
  el.phoneShell.appendChild(float);
  setTimeout(() => float.remove(), isBonus ? 1400 : 900);
}

const SCENE_TRANSITION_MS = 450;

// renderScene() 是外部统一入口：先把当前场景淡出+轻微上移，
// 等动画放完再真正换内容（renderSceneContent），然后淡入。
// 放慢、加动画就是这一层做的，实际渲染逻辑还在 renderSceneContent 里没变。
function renderScene() {
  const panel = el.scenePanel;
  if (!panel || panel.dataset.rendered !== "true") {
    // 第一次渲染（刚打开页面）不用等淡出，直接进淡入
    renderSceneContent();
    if (panel) {
      panel.dataset.rendered = "true";
      panel.classList.add("scene-fade-in-prep");
      void panel.offsetWidth;
      panel.classList.remove("scene-fade-in-prep");
    }
    return;
  }

  panel.classList.add("scene-fade-out");
  setTimeout(() => {
    renderSceneContent();
    panel.classList.remove("scene-fade-out");
    panel.classList.add("scene-fade-in-prep");
    void panel.offsetWidth; // 强制重排，让下一步的 class 切换能触发过渡动画
    panel.classList.remove("scene-fade-in-prep");
  }, SCENE_TRANSITION_MS);
}

function renderSceneContent() {
  const scene = currentScene();
  const node = currentNode();

  browseIndex = null; // 任何一次正常的直播渲染，都代表玩家不在翻页回看状态
  hideWordPopup();
  document.body.classList.remove("zh-peek"); // 换台词了，上一句长按露出的中文提示不该带过来
  renderProgress();

  // 场景卡+头像描边+HUD 等级胶囊都按当前场景取同一组配色，见 SCENE_PALETTE 顶部注释。
  const scenePalette = SCENE_PALETTE[state.sceneIndex % SCENE_PALETTE.length];
  el.sceneCard.style.background = scenePalette.bg;
  el.avatar.style.borderColor = scenePalette.tint;
  el.hudLevelPill.style.borderColor = scenePalette.tint;
  el.hudLevelPill.style.color = scenePalette.tint;
  el.hudLevelPill.style.background = scenePalette.bg;

  el.sceneTitle.innerHTML = wrapWordsHTML(scene.title);
  el.sceneSubtitle.innerHTML = wrapWordsHTML(scene.subtitle);
  el.avatar.textContent = node.avatar || scene.avatar;
  el.npcEn.innerHTML = wrapWordsHTML(node.npcLine.en, node.npcLine.zh);
  el.npcZh.textContent = node.npcLine.zh;
  // 进节点自动放一遍就够了，不再循环提醒——想再听就点台词本身（对齐手机 app
  // 用 <Pressable onPress={playLine}> 包住台词文字，不再单独放一个 PLAY 按钮，
  // 见下面 el.npcEn 的 click 监听）。
  playAudio(node.npcLine.en, el.npcEn);
  el.hint.textContent = "";
  el.hint.classList.remove("visible");
  wrongButtonsThisNode = new Set();

  renderHeartsDisplay();
  el.choices.innerHTML = "";
  const hearts = state.hearts ?? MAX_HEARTS;
  if (hearts <= 0 && state.reviewQueue.length > 0) {
    // 心数清零：不让开新选项，先去复习赚回一颗心（见 renderHeartGate）。
    renderHeartGate();
  } else {
    // 内容里为了方便写作，正确选项总是排第一个——渲染时打乱顺序，
    // 不然正确答案永远在同一个位置，玩家不用看台词也能蒙对。
    // 再动态补第三个选项：从附近节点借一句通顺但答非所问的玩家句（idx = -1，一律算错）——
    // 内容里现成的两个选项大多靠常识就能排除，测不到英文（设计精华第 5 条）。
    const extra = pickContextualDistractor(state.sceneIndex, state.nodeId, node);
    const all = node.choices.map((choice, idx) => ({ choice, idx }));
    if (extra) all.push({ choice: { text: extra.text, zh: extra.zh, correct: false }, idx: -1 });
    const shuffled = all.sort(() => Math.random() - 0.5);
    shuffled.forEach(({ choice, idx }) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.innerHTML = wrapWordsHTML(choice.text, choice.zh || node.npcLine.zh);
      btn.addEventListener("click", () => handleChoice(idx, btn, choice.text));
      el.choices.appendChild(btn);
    });
  }

  renderSkillPanel();
  renderDailyGoal();
  renderStreakUI();
  updateHistoryNavUI();
}

function handleChoice(idx, btnEl, extraText) {
  const node = currentNode();
  // idx = -1 是渲染时动态补的第三个选项，不在 node.choices 里，一律按答错处理
  const choice = idx < 0 ? { text: extraText || "", correct: false } : node.choices[idx];
  playAudio(choice.text, btnEl);

  if (choice.correct) {
    Array.from(el.choices.children).forEach((b) => (b.disabled = true));
    // 变量奖励：小概率双倍经验，每次都要重新掷一次骰子，不能按固定节奏出现，
    // 不然玩家会摸出规律，"随机惊喜"就失效了。
    const isBonus = !!choice.xp && Math.random() < BONUS_XP_CHANCE;
    const awardedXp = isBonus ? choice.xp * BONUS_XP_MULTIPLIER : choice.xp || 0;
    state.skills[node.skill] = (state.skills[node.skill] || 0) + awardedXp;
    const already = state.learnedVocab.some((v) => v.en === choice.text);
    if (!already) {
      state.learnedVocab.push({ en: choice.text, zh: choice.zh || node.npcLine.zh, skill: node.skill });
    }
    playCorrectSfx();
    if (choice.xp) {
      spawnXpFloat(btnEl, awardedXp, isBonus);
      setTimeout(isBonus ? playBonusXpSfx : playXpSfx, 150);
    }
    // 连续打卡 + 每日目标只在故事主线答对时结算（不含闪回复习），
    // 见 registerDailyProgress 顶部注释。
    const { justHitGoal } = registerDailyProgress();
    saveState();
    renderStreakUI();
    renderDailyGoal();
    if (justHitGoal) celebrateDailyGoal();
    checkAchievements(); // 技能XP/词汇量刚变，可能刚好摸到某个成就门槛
    // 答对先亮出中文确认理解，不管当前是不是"隐藏中文"模式，停留2秒再翻页，
    // 翻页前把隐藏状态还原，不影响用户原本的显示偏好。
    document.body.classList.remove("hide-zh");
    setTimeout(() => {
      if (hideZh) document.body.classList.add("hide-zh");
      advance(node.next);
    }, 2000);
  } else {
    playWrongSfx();
    btnEl.classList.add("wrong", "shake");
    btnEl.addEventListener("animationend", () => btnEl.classList.remove("shake"), { once: true });
    btnEl.disabled = true;
    wrongButtonsThisNode.add(idx);
    el.hint.textContent = "💡 " + node.hintOnWrong;
    el.hint.classList.add("visible");

    const targetEn = node.choices.find((c) => c.correct).text;
    const targetZh = node.choices.find((c) => c.correct).zh || node.npcLine.zh;
    const existing = state.reviewQueue.find((r) => r.en === targetEn);
    if (existing) {
      // 答错说明还没学会（哪怕之前已经进入"待最终确认"阶段）：退回重新学，间隔重新计时
      existing.streak = 0;
      existing.status = "active";
      existing.queuedAtScene = state.sceneIndex;
    } else {
      state.reviewQueue.push({ en: targetEn, zh: targetZh, kind: "sentence", streak: 0, status: "active", queuedAtScene: state.sceneIndex });
    }
    // 答错额外扣一颗心——跟上面进复习队列的逻辑各管各的，互不影响
    // （心数只影响"能不能开下一个节点的新选项"，不影响复习队列本身怎么记）。
    loseHeart();
    saveState();
    renderHeartsDisplay();
  }
}

function advance(nextNodeId) {
  if (nextNodeId) {
    state.nodeId = nextNodeId;
    saveState();
    renderScene();
    return;
  }
  // scene finished -> maybe show flashback review, then move to next scene
  el.flashbackLabel.textContent = "🧳 回忆闪回 · 这个词是？";
  flashbackOnComplete = goToNextScene;
  // 先把这一幕里曝光够次数的新词自动入队（复习不等答错），再挑要考的
  if (enqueueExposureReviews(state.sceneIndex) > 0) saveState();
  pendingFlashback = pickFlashbackItems();
  flashbackTotal = pendingFlashback.length;
  if (pendingFlashback.length > 0) {
    showFlashback();
  } else {
    goToNextScene();
  }
}

// 场景切换时最多复习 2 条：优先短期错题（还在 active 阶段），
// 剩余名额才补"待最终确认"里间隔已经够长、可以抽考的老词条。
function pickFlashbackItems() {
  const active = state.reviewQueue.filter((r) => r.status !== "pendingFinal");
  const eligibleFinal = state.reviewQueue.filter(
    (r) => r.status === "pendingFinal" && state.sceneIndex - r.queuedAtScene >= REVIEW_GAP_SCENES
  );
  return [...active, ...eligibleFinal].slice(0, 2);
}

// 断点热身：玩家隔了一段时间才回来（不是同一次场景切换），
// 继续当前场景前先抽一条复习queue里最老的词条考一下。
// 隔了至少一整天再回来，换成 Emma 口吻的挽留提醒（带实际天数）——
// 20分钟到1天这种短间隔还用"欢迎回来"就够了，天天都说"好几天没等到你"会显得假。
function showReconnectWarmup() {
  if (state.reviewQueue.length === 0) {
    renderScene();
    return;
  }
  const daysAway = Math.floor(reconnectGapMs / (24 * 60 * 60 * 1000));
  el.flashbackLabel.textContent =
    daysAway >= 1
      ? `💌 Emma 已经 ${daysAway} 天没等到你了，快回去见她吧`
      : "👋 欢迎回来，先复习一下";
  flashbackOnComplete = renderScene;
  pendingFlashback = [state.reviewQueue[0]];
  flashbackTotal = pendingFlashback.length;
  showFlashback();
}

function goToNextScene() {
  const nextIndex = state.sceneIndex + 1;
  if (nextIndex >= GAME_CONTENT.scenes.length) {
    showEndScreen();
    return;
  }
  state.sceneIndex = nextIndex;
  state.nodeId = GAME_CONTENT.scenes[nextIndex].startNode;
  saveState();
  // 场景之间如果隔了一段时间/换了地方，先过一下"一天过去了"这种简短的转场，
  // 不直接硬切——只有明确定义了 transition 的场景才会停一下，大多数场景之间还是直接接着走。
  const transition = GAME_CONTENT.scenes[nextIndex].transition;
  // 跨章节（不只是跨场景）再叠加一张更醒目的"章节卡"——不然银行办完事直接
  // 切到在家吃饭这种跨生活领域的跳转，读起来跟普通场景切换没区别，容易让人
  // 没意识到"这其实是全新的一段故事"。CHAPTER_INDEX 是静态数据（见
  // content/chapter-index.js），按 sceneIndex 查有没有对应章节即可，不用猜。
  const chapterEntry =
    typeof CHAPTER_INDEX !== "undefined" ? CHAPTER_INDEX.find((c) => c.sceneIndex === nextIndex) : null;
  if (transition || chapterEntry) {
    if (chapterEntry) prefetchChapterAudio(chapterEntry.chapter + 1); // 一进入新章节就后台下载下一章的配音
    showTransition(transition, chapterEntry);
  } else {
    renderScene();
  }
}

function showTransition(transition, chapterEntry) {
  el.transitionChapterCard.classList.toggle("hidden", !chapterEntry);
  if (chapterEntry) {
    el.transitionChapterNum.textContent = `第 ${chapterEntry.chapter} 章${chapterEntry.kind === "side" ? " · 番外" : ""}`;
    el.transitionChapterTitle.textContent = chapterEntry.title;
  }
  el.transitionEn.classList.toggle("hidden", !transition);
  el.transitionZh.classList.toggle("hidden", !transition);
  if (transition) {
    el.transitionEn.textContent = transition.en;
    el.transitionZh.textContent = transition.zh;
  }
  el.transitionOverlay.classList.add("visible");
}

// 检索难度随熟练度升级：还在 active 阶段（第一次见到 / 之前答错过）用选择题，
// 门槛低；进了 pendingFinal（短期已连对2次，等长间隔做最终确认）就换成拼词，
// 逼玩家真正拼出整句，而不是靠排除法认出来。
const FLASHBACK_ICONS = { word: "🃏", sentence: "🎴" };

function showFlashback() {
  const item = pendingFlashback[0];
  el.flashbackOverlay.classList.add("visible");
  el.flashbackFeedback.textContent = "";
  el.flashbackZh.textContent = item.zh;
  el.flashbackIcon.textContent = FLASHBACK_ICONS[item.kind] || "🎴";
  renderFlashbackProgress();
  // 复习赚心模式必须真答对才给心，不能靠"已经学会"白嫖，这个通道只在正常闪回里开放。
  el.flashbackKnowBtn.classList.toggle("hidden", heartRecoveryMode);
  el.flashbackKnowBtn.disabled = false;

  // 重新触发弹出动画：同一个卡片元素连续复用（队列里下一题），
  // 不移除再加类名的话动画只会在第一次弹层打开时播放一次。
  const card = el.flashbackOverlay.querySelector(".flashback-card-game");
  if (card) {
    card.classList.remove("flashback-card-game");
    void card.offsetWidth;
    card.classList.add("flashback-card-game");
  }

  // 单个单词没法拆词拼句，pendingFinal 阶段也一直用选择题，不进拼词模式。
  if (item.status === "pendingFinal" && item.kind !== "word") {
    renderFlashbackBuild(item);
  } else {
    renderFlashbackChoices(item);
  }
}

function renderFlashbackProgress() {
  el.flashbackProgress.innerHTML = "";
  if (flashbackTotal <= 1) return; // 只有一条待复习时不需要进度点
  const doneCount = flashbackTotal - pendingFlashback.length;
  for (let i = 0; i < flashbackTotal; i++) {
    const dot = document.createElement("span");
    dot.className = "flashback-progress-dot";
    if (i < doneCount) dot.classList.add("is-done");
    else if (i === doneCount) dot.classList.add("is-current");
    el.flashbackProgress.appendChild(dot);
  }
}

// 整句条目的干扰项：从 vocabBank 里挑"长度接近、也是整句"的句子——不能混进
// "tandem kayak" 这种单词条目，一眼就能排除，测不到记忆（设计精华第 5 条）。
// 与 apps/mobile/lib/game/review.ts 的 buildFlashbackChoiceOptions 逻辑相同。
function pickSentenceDistractors(targetEn, n) {
  const len = tokenizeWords(targetEn).length;
  const isQ = /\?\s*$/.test(targetEn);
  const all = GAME_CONTENT.vocabBank.filter((v) => v.en !== targetEn);
  const near = all.filter((v) => {
    const l = tokenizeWords(v.en).length;
    return l >= 3 && l >= len * 0.6 && l <= len * 1.5 && /\?\s*$/.test(v.en) === isQ;
  });
  const pool = near.length >= n ? near : all.filter((v) => tokenizeWords(v.en).length >= 3);
  return pool.sort(() => Math.random() - 0.5).slice(0, n).map((v) => v.en);
}

function renderFlashbackChoices(item) {
  el.flashbackChoices.classList.remove("hidden");
  el.flashbackBuild.classList.add("hidden");
  el.flashbackChoices.innerHTML = "";

  const distractors = item.kind === "word"
    ? Object.keys(WORD_DICT)
        .filter((w) => w !== item.en)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
    : pickSentenceDistractors(item.en, 2);

  const options = [item.en, ...distractors].sort(() => Math.random() - 0.5);

  options.forEach((text) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerHTML = wrapWordsHTML(text);
    btn.addEventListener("click", () => {
      Array.from(el.flashbackChoices.children).forEach((b) => (b.disabled = true));
      // 点了就立刻选中变绿——不靠这个提示对错（下面播的都是正确答案的读音），
      // 只是给"我点了这个"一个马上能看见的反馈，跟音频同时发生。
      btn.classList.add("correct");
      const isCorrect = text === item.en;
      const audioDone = playAudio(item.en, btn);
      resolveFlashback(isCorrect, item, audioDone);
    });
    el.flashbackChoices.appendChild(btn);
  });
}

// 拼词模式：把目标句子的单词打乱放进词库，玩家依次点回答题区拼出原句；
// 点已拼的词可以收回重排。凑齐词数才判定对错。
function renderFlashbackBuild(item) {
  el.flashbackChoices.classList.add("hidden");
  el.flashbackBuild.classList.remove("hidden");
  el.flashbackAnswer.classList.remove("build-correct", "build-wrong");

  const words = item.en.split(" ");
  const bankOrder = words.map((w, i) => i).sort(() => Math.random() - 0.5);
  const placed = [];

  function renderBank() {
    el.flashbackWordbank.innerHTML = "";
    bankOrder.forEach((i) => {
      if (placed.includes(i)) return;
      const chip = document.createElement("button");
      chip.className = "word-chip";
      chip.textContent = words[i];
      chip.addEventListener("click", () => {
        placed.push(i);
        renderAnswer();
        renderBank();
        if (placed.length === words.length) checkBuild();
      });
      el.flashbackWordbank.appendChild(chip);
    });
  }

  function renderAnswer() {
    el.flashbackAnswer.innerHTML = "";
    placed.forEach((i) => {
      const chip = document.createElement("button");
      chip.className = "word-chip placed";
      chip.textContent = words[i];
      chip.addEventListener("click", () => {
        placed.splice(placed.indexOf(i), 1);
        renderAnswer();
        renderBank();
      });
      el.flashbackAnswer.appendChild(chip);
    });
  }

  function checkBuild() {
    Array.from(el.flashbackWordbank.children).forEach((c) => (c.disabled = true));
    Array.from(el.flashbackAnswer.children).forEach((c) => (c.disabled = true));
    const isCorrect = placed.map((i) => words[i]).join(" ") === item.en;
    el.flashbackAnswer.classList.add(isCorrect ? "build-correct" : "build-wrong");
    const audioDone = playAudio(item.en, null);
    resolveFlashback(isCorrect, item, audioDone);
  }

  renderAnswer();
  renderBank();
}

function resolveFlashback(isCorrect, item, audioDone) {
  const target = state.reviewQueue.find((r) => r.en === item.en);
  if (isCorrect) playCorrectSfx();
  else playWrongSfx();

  if (isCorrect) {
    el.flashbackFeedback.textContent = heartRecoveryMode ? "✅ 记住了！回一颗心 ❤️" : "✅ 记住了！";
    if (target) {
      if (target.status === "pendingFinal") {
        // 长间隔之后再考一次也答对了：真正学会，移出队列，并记为"已确认掌握"
        state.reviewQueue = state.reviewQueue.filter((r) => r.en !== item.en);
        recordConfirmed(item);
      } else {
        target.streak += 1;
        if (target.streak >= 2) {
          // 短期内连对2次，先别急着判定"学会"，等够长的间隔再做最终确认
          target.status = "pendingFinal";
          target.queuedAtScene = state.sceneIndex;
        }
      }
    }
    if (heartRecoveryMode) {
      // 心数清零时专门开的复习通道：答对就还一颗心，跟平常场景末尾/断点热身
      // 的闪回（不带这个标记）区分开，不是随便一次复习都送心。
      state.hearts = Math.min(MAX_HEARTS, (state.hearts ?? MAX_HEARTS) + 1);
      renderHeartsDisplay();
    }
  } else {
    el.flashbackFeedback.textContent = `❌ 正确答案：${item.en}`;
    if (target) {
      target.streak = 0;
      target.status = "active";
      target.queuedAtScene = state.sceneIndex;
    }
  }
  saveState();

  // 等配音播完，再留1秒看清反馈文字，才翻页——不是配音一结束就硬切。
  Promise.resolve(audioDone).then(() => finishFlashbackTurn());
}

// 闪回队列翻页的公共尾巴：resolveFlashback（选择题/拼词）和"已经学会了"
// 跳过按钮都要"停留一会儿再进下一题"，抽出来共用，延迟统一改成1秒。
function finishFlashbackTurn(delayMs = 1000) {
  setTimeout(() => {
    pendingFlashback.shift();
    if (pendingFlashback.length > 0) {
      showFlashback();
    } else {
      el.flashbackOverlay.classList.remove("visible");
      flashbackOnComplete();
    }
  }, delayMs);
}

// "我已经学会了"：跳过复习、直接判定学会并移出队列——跟长间隔真答对
// 的效果一样，但不走选择/拼词那套判定，也照样有音效+1秒停留再翻页。
// 复习赚心模式下按钮本身是隐藏的（见 showFlashback），这里再挡一层防止误触发。
function markFlashbackKnown() {
  const item = pendingFlashback[0];
  if (!item || heartRecoveryMode) return;
  Array.from(el.flashbackChoices.children).forEach((b) => (b.disabled = true));
  Array.from(el.flashbackWordbank.children).forEach((b) => (b.disabled = true));
  Array.from(el.flashbackAnswer.children).forEach((b) => (b.disabled = true));
  el.flashbackKnowBtn.disabled = true;

  state.reviewQueue = state.reviewQueue.filter((r) => r.en !== item.en);
  playCorrectSfx();
  el.flashbackFeedback.textContent = "✅ 已标记为学会，不再复习";
  saveState();

  finishFlashbackTurn();
}

function showEndScreen() {
  state.finished = true;
  saveState();
  el.choices.innerHTML = "";
  el.gameScreen.classList.add("hidden");
  el.endScreen.classList.remove("hidden");
  renderStreakUI(); // 连续打卡徽章/提醒横幅在 header 里，不属于 game-screen，结局页也要照常显示
  const totalXp = Object.values(state.skills).reduce((a, b) => a + b, 0);
  el.endSummary.innerHTML = `
    <p>你在多伦多安顿了下来——开了账户、租了房、认识了室友——但那张旧照片和地址一直没放下。今晚，你决定明天就去看看。</p>
    <p style="opacity:.7">故事还在继续，敬请期待下一段。</p>
    <p>总经验值：${totalXp} ・ 学会词汇：${state.learnedVocab.length} 个</p>
    <p>${Object.entries(GAME_CONTENT.skillMeta)
      .map(([k, m]) => `${m.icon} ${m.label} ${state.skills[k] || 0}/${SKILL_MAX[k] || 0}`)
      .join(" ・ ")}</p>
  `;
}

function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  state = freshState();
  if (window.GameAuth) window.GameAuth.pushSave(state); // 登录了的话云端存档也一起清空
  pendingFlashback = [];
  el.endScreen.classList.add("hidden");
  el.gameScreen.classList.remove("hidden");
  renderScene();
}

el.resetBtn.addEventListener("click", () => {
  if (confirm("确定要重新开始吗？当前进度会清空。")) resetGame();
});
el.restartBtn.addEventListener("click", resetGame);
// 播放按钮改成直接点台词本身（对齐手机 app 用 Pressable 包住台词文字），
// 但点单词查释义（.word span）不该顺带把整句也放一遍音，所以先排除掉。
el.npcEn.addEventListener("click", (e) => {
  if (e.target.closest(".word")) return;
  playAudio(currentNode().npcLine.en, el.npcEn);
});
// 盲听模式下台词换成这个占位提示条：短按=重播音频，长按=临时露出中文提示。
// 用 pointerdown 起一个计时器，计时器跑完前松手就当短按；跑完了就翻译成
// "长按确认"，松手时不再重播、只是把中文提示收回去。
let listenHintPressTimer = null;
let listenHintLongPressed = false;
const LISTEN_HINT_LONG_PRESS_MS = 380;

function endListenHintPress() {
  clearTimeout(listenHintPressTimer);
  if (listenHintLongPressed) {
    document.body.classList.remove("zh-peek");
  } else {
    playAudio(currentNode().npcLine.en, el.npcListenHint);
  }
  listenHintLongPressed = false;
}

el.npcListenHint.addEventListener("pointerdown", () => {
  listenHintLongPressed = false;
  listenHintPressTimer = setTimeout(() => {
    listenHintLongPressed = true;
    document.body.classList.add("zh-peek");
  }, LISTEN_HINT_LONG_PRESS_MS);
});
el.npcListenHint.addEventListener("pointerup", endListenHintPress);
el.npcListenHint.addEventListener("pointercancel", endListenHintPress);
el.npcListenHint.addEventListener("pointerleave", () => {
  if (listenHintLongPressed) endListenHintPress();
});
el.flashbackKnowBtn.addEventListener("click", markFlashbackKnown);
el.transitionContinueBtn.addEventListener("click", () => {
  el.transitionOverlay.classList.remove("visible");
  renderScene();
});
el.zhToggleBtn.addEventListener("click", () => {
  hideZh = !hideZh;
  localStorage.setItem(ZH_HIDE_KEY, hideZh ? "1" : "0");
  applyZhVisibility();
});
el.blindListenBtn.addEventListener("click", () => {
  blindListen = !blindListen;
  localStorage.setItem(BLIND_LISTEN_KEY, blindListen ? "1" : "0");
  applyBlindListenVisibility();
  if (blindListen && !localStorage.getItem(BLIND_LISTEN_TIP_KEY)) {
    localStorage.setItem(BLIND_LISTEN_TIP_KEY, "1");
    showTextToast("🎧 轻触台词重新播放，长按台词查看中文提示");
  }
});

// 昵称：登录后随机配一个"形容词+蔬果"的花名（比如"奔跑的土豆"），不用邮箱本身，
// 按 user.id 存进 localStorage 只生成一次——同一个账号每次登录看到的都是同一个名字，
// 不会一刷新就换掉。
const NICKNAME_ADJ = [
  "奔跑的", "快乐的", "神秘的", "勇敢的", "淡定的", "机智的", "爱笑的", "闪亮的",
  "悠闲的", "话痨的", "元气满满的", "迷路的", "摸鱼的", "热情的", "安静的", "调皮的",
  "打盹的", "路痴的", "好奇的", "慢悠悠的"
];
const NICKNAME_NOUN = [
  "土豆", "西红柿", "香蕉", "苹果", "菠萝", "南瓜", "西瓜", "橙子",
  "葡萄", "洋葱", "萝卜", "芒果", "椰子", "草莓", "冬瓜", "白菜",
  "玉米", "柠檬", "牛油果", "哈密瓜"
];
const NICKNAME_KEY_PREFIX = "eng-rpg-nickname-";

function getNickname(user) {
  const key = NICKNAME_KEY_PREFIX + (user.id || user.email || "anon");
  let name = localStorage.getItem(key);
  if (!name) {
    const adj = NICKNAME_ADJ[Math.floor(Math.random() * NICKNAME_ADJ.length)];
    const noun = NICKNAME_NOUN[Math.floor(Math.random() * NICKNAME_NOUN.length)];
    name = adj + noun;
    localStorage.setItem(key, name);
  }
  return name;
}

// 顶部左边的身份标签：优先显示玩家自己起的名字（state.playerName，不需要登录也能设置），
// 没设置名字才退回"登录了显示花名 / 没登录显示请登录"这套原逻辑。命名跟登录状态解耦——
// 登录只管跨设备同步存档，不是"能不能给角色起名"的前提，上手门槛更低。
// 佩戴了称号（state.equippedTitle）的话，名字前面会带上成就的 icon+标题。
function renderIdentityBadge() {
  const loggedIn = !!(window.GameAuth && window.GameAuth.getUser());
  const name = state.playerName || (loggedIn ? getNickname(window.GameAuth.getUser()) : null);
  if (!name) {
    el.userBadgeAvatar.innerHTML = "";
    el.userBadgeLabel.textContent = "请登录";
    el.userBadge.classList.remove("logged-in");
    return;
  }
  // 头像：上传过照片就用照片，没有就退回 emoji——两处用同一份状态
  // （state.playerAvatarImage / state.playerAvatar），跟角色编辑器共享。
  if (state.playerAvatarImage) {
    el.userBadgeAvatar.innerHTML = `<img src="${state.playerAvatarImage}" alt="" />`;
  } else {
    el.userBadgeAvatar.textContent = state.playerAvatar || "🍎";
  }
  const titleObj = ACHIEVEMENTS.find((a) => a.id === state.equippedTitle);
  el.userBadgeLabel.textContent = titleObj ? `${titleObj.icon}${titleObj.title} · ${name}` : name;
  el.userBadge.classList.add("logged-in");
}

// 右上角 ☰ 菜单是两回事：☰ 一直只是"打开菜单"，不再随登录状态换文字。显示中文/重新开始
// 常驻菜单里；账号区随登录状态在"登录账号"入口和"邮箱 + 退出登录"之间切换。
// 登录状态变化由 auth.js 的 onAuthChange 驱动。
function renderAuthPanel(user) {
  const loggedIn = !!user;
  renderIdentityBadge();
  el.accountLoggedOutItem.classList.toggle("hidden", loggedIn);
  el.accountLoggedInItem.classList.toggle("hidden", !loggedIn);
  if (loggedIn) {
    el.accountMenuEmail.textContent = user.email || "";
    // 刚登录：把当前总分立刻推一次，不用等下一次答对题才上榜。
    const totalXp = Object.values(state.skills).reduce((a, b) => a + b, 0);
    window.GameAuth.pushLeaderboard({ nickname: getNickname(user), totalXp });
  }
  renderLeaderboard();
}

// 头像用水果 emoji，不用人物形象——主要是为了绕开"主角向 Emma 求婚"（第21章）
// 这条剧情线对玩家性别的隐含预期，水果没有性别，谁选都不别扭。
const AVATAR_OPTIONS = ["🍎", "🍊", "🍋", "🍇", "🍓", "🍑", "🍍", "🥝", "🍒", "🍉", "🥭", "🍐"];

function renderAvatarPicker() {
  el.avatarPicker.innerHTML = "";
  AVATAR_OPTIONS.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "avatar-option";
    btn.textContent = emoji;
    if (!pendingAvatarImage && (state.playerAvatar || "🍎") === emoji) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      el.avatarPicker.querySelectorAll(".avatar-option").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      el.avatarPicker.dataset.selected = emoji;
      // 点 emoji 等于放弃刚传的照片——头像只能二选一，不是叠加。
      pendingAvatarImage = null;
      renderAvatarUploadPreview();
    });
    el.avatarPicker.appendChild(btn);
  });
  el.avatarPicker.dataset.selected = state.playerAvatar || "🍎";
}

// 上传照片当头像：本地先压缩成 96x96 的正方形缩略图（居中裁切，不管原图比例）
// 立刻预览，同时把同一张缩略图传到 R2（走 AVATAR_UPLOAD_URL 这个 Worker 中转，
// 静态站没有自己的服务器，浏览器不能直接匿名写 R2）。传成功就把 pendingAvatarImage
// 换成托管 URL（几十字节，比几 KB 的 base64 更省存档空间）；传失败/离线就留着本地
// data URL 当兜底——不阻塞保存，只是体积大一点，跟这个项目一贯的离线优先原则一致。
// 存的是"待保存"的值（pendingAvatarImage），点"保存"按钮才真正写进 state。
const AVATAR_IMAGE_SIZE = 96;
const AVATAR_UPLOAD_URL = "https://english-game-uploads.josh-zeng.workers.dev";
let pendingAvatarImage = null;
let avatarUploadToken = 0; // 递增让上一次还没传完的上传作废——中途又换了张照片就不用它的结果了

function renderAvatarUploadPreview() {
  if (pendingAvatarImage) {
    el.avatarUploadPreview.innerHTML = `<img src="${pendingAvatarImage}" alt="" />`;
    el.avatarUploadPreview.parentElement.classList.add("selected");
  } else {
    el.avatarUploadPreview.textContent = "📷";
    el.avatarUploadPreview.parentElement.classList.remove("selected");
  }
}

function handleAvatarUpload(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const myToken = ++avatarUploadToken;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      if (myToken !== avatarUploadToken) return;
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_IMAGE_SIZE;
      canvas.height = AVATAR_IMAGE_SIZE;
      const ctx = canvas.getContext("2d");
      // 居中裁成正方形再缩放：不管上传的照片是什么长宽比，头像圆框里都不会被拉变形。
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_IMAGE_SIZE, AVATAR_IMAGE_SIZE);
      pendingAvatarImage = canvas.toDataURL("image/jpeg", 0.82);
      el.avatarPicker.querySelectorAll(".avatar-option").forEach((b) => b.classList.remove("selected"));
      renderAvatarUploadPreview();

      canvas.toBlob((blob) => {
        if (!blob || myToken !== avatarUploadToken) return;
        fetch(AVATAR_UPLOAD_URL, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob })
          .then((res) => (res.ok ? res.json() : Promise.reject(res)))
          .then((data) => {
            if (myToken !== avatarUploadToken || !data.url) return;
            pendingAvatarImage = data.url;
            renderAvatarUploadPreview();
          })
          .catch(() => {}); // 上传失败静默跳过，本地缩略图仍然可用、可以正常保存
      }, "image/jpeg", 0.82);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

el.avatarUploadInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) handleAvatarUpload(file);
});

el.characterEditBtn.addEventListener("click", () => {
  el.characterNameInput.value = state.playerName || "";
  pendingAvatarImage = state.playerAvatarImage || null;
  avatarUploadToken++; // 作废上一次打开这个编辑器时可能还没传完的上传
  el.avatarUploadInput.value = "";
  renderAvatarPicker();
  renderAvatarUploadPreview();
  el.characterOverlay.classList.add("visible");
});
el.characterCloseBtn.addEventListener("click", () => {
  el.characterOverlay.classList.remove("visible");
});
el.characterSaveBtn.addEventListener("click", () => {
  const name = el.characterNameInput.value.trim();
  state.playerName = name || null;
  state.playerAvatar = el.avatarPicker.dataset.selected || "🍎";
  state.playerAvatarImage = pendingAvatarImage;
  saveState();
  renderIdentityBadge();
  el.characterOverlay.classList.remove("visible");
});

// 成就墙：网格列出全部 ACHIEVEMENTS，未解锁的灰置+锁图标；已解锁的点一下佩戴/取消佩戴。
function renderAchievementsGrid() {
  const unlocked = state.unlockedAchievements || [];
  el.achievementsGrid.innerHTML = "";
  ACHIEVEMENTS.forEach((a) => {
    const isUnlocked = unlocked.includes(a.id);
    const isEquipped = state.equippedTitle === a.id;
    const card = document.createElement("button");
    card.type = "button";
    card.className =
      "achievement-card" +
      (isUnlocked ? " unlocked rarity-" + a.rarity : " locked") +
      (isEquipped ? " equipped" : "");
    card.innerHTML = `
      <div class="achievement-card-icon">${isUnlocked ? a.icon : "🔒"}</div>
      <div class="achievement-card-title">${isUnlocked ? a.title : "？？？"}</div>
    `;
    if (isUnlocked) {
      card.addEventListener("click", () => {
        state.equippedTitle = isEquipped ? null : a.id;
        saveState();
        renderIdentityBadge();
        renderAchievementsGrid();
      });
    } else {
      card.disabled = true;
    }
    el.achievementsGrid.appendChild(card);
  });
}

el.achievementsBtn.addEventListener("click", () => {
  renderAchievementsGrid();
  el.achievementsOverlay.classList.add("visible");
});
el.achievementsCloseBtn.addEventListener("click", () => {
  el.achievementsOverlay.classList.remove("visible");
});

function resetAuthForm() {
  el.authEmailStep.classList.remove("hidden");
  el.authEmailSentStep.classList.add("hidden");
  el.authError.textContent = "";
}

if (window.GameAuth) window.GameAuth.onAuthChange(renderAuthPanel);

// "更多" tab 里的身份行：没登录时点一下直接弹登录框；登录了就只是个花名标签，
// 不做别的——退出登录走"账号"卡片里的独立按钮，两边不重复。
el.userBadge.addEventListener("click", () => {
  if (window.GameAuth && window.GameAuth.getUser()) return;
  resetAuthForm();
  el.authOverlay.classList.add("visible");
});
el.accountLoginBtn.addEventListener("click", () => {
  resetAuthForm();
  el.authOverlay.classList.add("visible");
});
el.authCloseBtn.addEventListener("click", () => {
  el.authOverlay.classList.remove("visible");
});
el.authSendLinkBtn.addEventListener("click", async () => {
  const email = el.authEmailInput.value.trim();
  if (!email) return;
  el.authError.textContent = "";
  el.authSendLinkBtn.disabled = true;
  try {
    await window.GameAuth.sendMagicLink(email);
    el.authSentEmail.textContent = email;
    el.authEmailStep.classList.add("hidden");
    el.authEmailSentStep.classList.remove("hidden");
  } catch (e) {
    el.authError.textContent = "发送失败，请检查邮箱地址后重试";
  } finally {
    el.authSendLinkBtn.disabled = false;
  }
});
el.authRetryEmailBtn.addEventListener("click", resetAuthForm);
el.authGoogleBtn.addEventListener("click", () => {
  el.authError.textContent = "";
  window.GameAuth.signInWithGoogle().catch(() => {
    el.authError.textContent = "Google 登录暂时不可用";
  });
});
el.authAppleBtn.addEventListener("click", () => {
  el.authError.textContent = "";
  window.GameAuth.signInWithApple().catch(() => {
    el.authError.textContent = "Apple 登录暂时不可用";
  });
});
el.authSignOutBtn.addEventListener("click", async () => {
  await window.GameAuth.signOut();
});

applyZhVisibility();
applyBlindListenVisibility();

// 底部 Tab 栏：五个入口里"首页/角色成长/更多"三个切的是同一页里的三块 .view，
// 不跳转页面，也不重新渲染游戏状态；"对话/生词"两个是真的 <a> 跳到独立页面
// （对齐手机 app 的 (tabs)/_layout.tsx，只是 app 那边这两个还没做，网页先保留
// 原有的两个独立页面当入口）。顶栏标题跟着当前 tab 换一下文字就够了。
const VIEW_TITLES = { game: "A Decade Apart", growth: "角色成长", more: "更多" };
function activateView(view) {
  if (!VIEW_TITLES[view]) return;
  document.querySelectorAll(".tab-btn[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  document.getElementById("view-title").textContent = VIEW_TITLES[view];
  // 宽屏手机边框模式下滚动条在 .phone-shell 自己身上，真机上是整个页面在滚——
  // 切 tab 都得回到顶部，两种情况都处理一下（不适用的那个是无害的空操作）。
  window.scrollTo(0, 0);
  if (el.phoneShell) el.phoneShell.scrollTop = 0;
}
document.querySelectorAll(".tab-btn[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => activateView(btn.dataset.view));
});
// 从 dialogue.html/vocab.html 的 tab 栏点"角色成长"/"更多"跳过来时带的是
// index.html#growth / index.html#more，进页面先按 hash 把对应的 view 打开，
// 不然永远只会落在默认的"首页"。
if (location.hash === "#growth" || location.hash === "#more") {
  activateView(location.hash.slice(1));
}

// 进页面直接开始，不额外插入"点击开始"的确认步骤。手机浏览器不允许没有用户
// 手势就自动放声音，所以第一句台词的自动配音在部分设备上可能放不出来——
// 玩家可以点台词本身手动听，不为了保证自动配音去插一个额外的点击关卡。
function startGame() {
  renderIdentityBadge(); // 不用等 GameAuth 的登录回调，playerName 设置了就先显示出来
  checkAchievements(); // 补一次成就检查——老玩家可能早就摸到某些门槛了，回来这次先算清楚
  if (state.finished) {
    showEndScreen();
  } else if (reconnectGapMs > RECONNECT_GAP_MS) {
    showReconnectWarmup();
  } else {
    renderScene();
  }
}

// 打开页面先看一下有没有已登录账号：有的话拉云端存档，跟本地比谁更新就用谁，
// 两边收敛后再正常进入游戏；没登录/云端不可用时直接跳过，不影响离线单机玩。
async function syncFromCloudThenStart() {
  if (window.GameAuth) {
    try {
      const user = await window.GameAuth.ready;
      if (user) {
        const cloud = await window.GameAuth.pullSave();
        if (cloud && (cloud.lastActiveAt || 0) > (state.lastActiveAt || 0)) {
          state = cloud;
          // 云端存档可能带着本地没有的查词记录，重建一下 knownWords，
          // 不然这次渲染还是按同步前的旧集合来标绿。
          knownWords.clear();
          state.reviewQueue.filter((r) => r.kind === "word").forEach((r) => knownWords.add(r.en.toLowerCase()));
        }
        saveState(); // 落地本地 + 回写云端，确保两边收敛到同一份
      }
    } catch (e) {
      // 云端拉取失败不阻塞游戏，继续用本地存档
    }
  }
  startGame();
}

syncFromCloudThenStart();
