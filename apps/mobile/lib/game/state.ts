// PORTED from a-decade-apart/main.js freshState()/loadState()/saveState() (search
// "SAVE_KEY" in that file). Same shape and defaulting rules, just async (AsyncStorage
// instead of localStorage) and with the DOM/GameAuth calls stripped out — cloud sync is
// wired up separately in contexts/GameContext.tsx so this module stays a pure, testable
// state layer with no React/Supabase dependency.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { MAX_HEARTS } from "./hearts";
import { generateDefaultNickname } from "./nickname";
import type { BookProgress, GameContent, GameState } from "./types";

export const SAVE_KEY = "eng-rpg-london-day1";

/** 主线「十年之约」的书 id。旧存档（没有 currentBookId 的）一律迁移成它。 */
export const MAIN_BOOK_ID = "a-decade-apart";

/** 按书隔离的字段；其余字段（连胜/爱心/昵称/成就/掌握词…）跨书共享。 */
export function extractBookProgress(state: GameState): BookProgress {
  return {
    sceneIndex: state.sceneIndex,
    nodeId: state.nodeId,
    skills: state.skills,
    learnedVocab: state.learnedVocab,
    reviewQueue: state.reviewQueue,
    finished: state.finished,
    flawlessScenes: state.flawlessScenes,
  };
}

/** 一本还没读过的书：从第一幕开始，技能清零，复习队列空。 */
export function freshBookProgress(content: GameContent): BookProgress {
  const skills: Record<string, number> = {};
  for (const key of Object.keys(content.skillMeta)) skills[key] = 0;
  return {
    sceneIndex: 0,
    nodeId: content.scenes[0].startNode,
    skills,
    learnedVocab: [],
    reviewQueue: [],
    finished: false,
    flawlessScenes: 0,
  };
}

/**
 * 换书：把顶层进度收进 books[当前书]，再把目标书的进度摊回顶层。
 * 任何时刻只有一份真相——顶层永远是"正在读的那本"，books 里永远不含当前书。
 * 跨书共享的字段（连胜、爱心、昵称、成就、掌握词、历史最高连击）原样保留。
 */
export function switchBook(state: GameState, toBookId: string, toContent: GameContent): GameState {
  if (toBookId === state.currentBookId) return state;
  const books = { ...state.books, [state.currentBookId]: extractBookProgress(state) };
  const target = books[toBookId] ?? freshBookProgress(toContent);
  delete books[toBookId];
  return {
    ...state,
    ...target,
    currentBookId: toBookId,
    books,
  };
}

export function freshState(content: GameContent, bookId: string = MAIN_BOOK_ID): GameState {
  const skills: Record<string, number> = {};
  for (const key of Object.keys(content.skillMeta)) skills[key] = 0;
  return {
    currentBookId: bookId,
    books: {},
    sceneIndex: 0,
    nodeId: content.scenes[0].startNode,
    skills,
    learnedVocab: [],
    reviewQueue: [],
    finished: false,
    lastActiveAt: Date.now(),
    // 旧存档没有下面这些字段——不做迁移，读取方一律用 ?? / || 兜底默认值。
    streak: 0,
    lastStreakDate: null,
    dailyCorrectCount: 0,
    dailyCorrectDate: null,
    hearts: MAX_HEARTS,
    lastHeartAt: Date.now(),
    // 正面昵称第一次就给一个现成的（"努力的土豆"这种格式），不留空——玩家可以
    // 之后自己在"更多"页改，见 lib/game/nickname.ts。没有单独的头像图片系统了，
    // "头像"直接用玩家等级（⭐ Lv.N）代替，所以这里不再需要 playerAvatarImage。
    playerName: generateDefaultNickname(),
    equippedTitle: null,
    unlockedAchievements: [],
    streakFreezes: 0,
    allTimeBestCombo: 0,
    flawlessScenes: 0,
    confirmedWords: [],
  };
}

// 把可能缺字段的存档（本地旧版本 AsyncStorage 存档、云端跨设备拉回来的存档）补齐成
// 完整的 GameState——freshState() 顶部注释说"读取方一律用 ?? / || 兜底"，但实际上
// 首页等好几处渲染代码直接访问 state.reviewQueue.length 等字段没有兜底，缺字段的旧
// 存档会导致渲染直接抛错（登录后从云端拉回不完整存档，首页卡死/白屏）。统一在这里补
// 齐，比在每个读取点分别加兜底更不容易漏。
export function normalizeState(
  parsed: Partial<GameState>,
  getContent: (bookId: string) => GameContent,
): GameState {
  // 旧存档没有 currentBookId——它记的就是主线的进度，直接认成主线，不需要搬字段。
  let bookId = parsed.currentBookId ?? MAIN_BOOK_ID;
  let content = getContent(bookId);
  // 存档里的 currentBookId 可能指向一本"当前在读"根本不成立的书：原文阅读本
  // （结构是章→节，没有 scenes/skillMeta）、或者已经下架的 id。这种时候必须
  // 退回主线继续用这份存档，**绝不能让它抛异常**——loadState 的 catch 会把
  // 整份进度当成损坏丢掉，玩家的等级、昵称、连胜全部清零重来。
  if (!content || !Array.isArray(content.scenes) || content.scenes.length === 0 || !content.skillMeta) {
    bookId = MAIN_BOOK_ID;
    content = getContent(MAIN_BOOK_ID);
  }
  const fresh = freshState(content, bookId);
  const merged: GameState = {
    ...fresh,
    ...parsed,
    currentBookId: bookId,
    books: parsed.books ?? {},
    // skills 的键随书不同（主线是问候/方位…，福尔摩斯是结识/找房…），只跟当前书的
    // 技能表合并，不把别的书的技能键混进来。
    skills: { ...fresh.skills, ...parsed.skills },
  };
  // books 里不该留着当前书自己的那份（换书时会 delete，这里兜底防止旧数据残留把
  // 顶层进度和副本搞成两份真相）。
  if (merged.books[bookId]) {
    const rest = { ...merged.books };
    delete rest[bookId];
    merged.books = rest;
  }
  // 存档的 sceneIndex/nodeId 可能是对着另一份内容集生成的（比如网页版有完整章节，
  // 手机端目前只港口了第一章），跟当前 content.scenes 对不上号时 content.scenes[i]
  // 会是 undefined，首页渲染前的 `!scene || !node` 判断就会一直为真，卡死在加载态
  // 且没有任何报错。这里兜底把越界的进度收回到最后一个有效场景。
  if (merged.sceneIndex < 0 || merged.sceneIndex >= content.scenes.length) {
    merged.sceneIndex = content.scenes.length - 1;
    merged.nodeId = content.scenes[merged.sceneIndex].startNode;
  } else if (!content.scenes[merged.sceneIndex].nodes[merged.nodeId]) {
    merged.nodeId = content.scenes[merged.sceneIndex].startNode;
  }
  // 老存档存的是 playerName: null（改默认值之前的写法）——`{...fresh, ...parsed}`
  // 展开时 parsed 里显式的 null 会盖掉 fresh 刚生成的随机昵称，得在这里单独补一次，
  // 不然已经在玩的人反而拿不到这个"第一次给个可爱昵称"的待遇。
  if (!merged.playerName) {
    merged.playerName = generateDefaultNickname();
  }
  return merged;
}

export async function loadState(getContent: (bookId: string) => GameContent): Promise<GameState> {
  const fallback = () => freshState(getContent(MAIN_BOOK_ID), MAIN_BOOK_ID);
  let parsed: Partial<GameState> | null = null;
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    if (!raw) return fallback();
    parsed = JSON.parse(raw) as Partial<GameState>;
  } catch {
    return fallback(); // 存档根本读不出来/不是 JSON，只能重开
  }
  if (!parsed || !parsed.skills) return fallback();
  try {
    return normalizeState(parsed, getContent);
  } catch {
    // normalizeState 万一还是抛了，也不能把玩家的进度整份丢掉——那比少显示一点
    // 东西糟糕得多（等级、昵称、连胜、成就全部归零，而且会被推到云端覆盖掉好的
    // 那一份）。这里退到主线重新规整一次；再失败才认命。
    try {
      return normalizeState({ ...parsed, currentBookId: MAIN_BOOK_ID }, getContent);
    } catch {
      return fallback();
    }
  }
}

export async function persistState(state: GameState): Promise<void> {
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export async function clearPersistedState(): Promise<void> {
  await AsyncStorage.removeItem(SAVE_KEY);
}

/** Deep clone used by GameContext's mutate() helper — state is always JSON-plain data. */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}
