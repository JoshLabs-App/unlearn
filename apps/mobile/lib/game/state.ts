// PORTED from a-decade-apart/main.js freshState()/loadState()/saveState() (search
// "SAVE_KEY" in that file). Same shape and defaulting rules, just async (AsyncStorage
// instead of localStorage) and with the DOM/GameAuth calls stripped out — cloud sync is
// wired up separately in contexts/GameContext.tsx so this module stays a pure, testable
// state layer with no React/Supabase dependency.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { MAX_HEARTS } from "./hearts";
import { generateDefaultNickname } from "./nickname";
import type { GameContent, GameState } from "./types";

export const SAVE_KEY = "eng-rpg-london-day1";

export function freshState(content: GameContent): GameState {
  const skills: Record<string, number> = {};
  for (const key of Object.keys(content.skillMeta)) skills[key] = 0;
  return {
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
export function normalizeState(parsed: Partial<GameState>, content: GameContent): GameState {
  const fresh = freshState(content);
  const merged: GameState = {
    ...fresh,
    ...parsed,
    skills: { ...fresh.skills, ...parsed.skills },
  };
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

export async function loadState(content: GameContent): Promise<GameState> {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    if (!raw) return freshState(content);
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.skills) return freshState(content);
    return normalizeState(parsed, content);
  } catch {
    return freshState(content);
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
