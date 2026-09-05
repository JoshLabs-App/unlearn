// PORTED from a-decade-apart/main.js:122-129,474-495 (localDateStr / registerDailyProgress).
// 连胜保护（streakFreezes）是移动端新加的机制，网页版没有——见下面 registerDailyProgress
// 里的注释。
import type { GameState } from "./types";

// 每天要答对几次算"打卡完成"。
export const DAILY_GOAL = 3;
// 连续打卡每满这么多天，自动奖励一个连胜保护（不需要玩家做任何额外操作/花费——
// 保持"打卡本身就有回报"，不引入新的虚拟货币/商店概念）。
export const STREAK_FREEZE_MILESTONE = 7;
// 保护道具上限，防止攒成"永远不会真正断"的连胜——保护应该是缓冲，不是免死金牌。
export const STREAK_FREEZE_MAX = 3;

// 按本地时区拼"今天是几号"——不能用 toISOString()，那是 UTC，会在时区边界把
// "今天"算错，连续打卡就会莫名其妙断掉。
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DailyProgressResult {
  justHitGoal: boolean;
  usedFreeze: boolean;
  earnedFreeze: boolean;
}

// 连续打卡 + 每日目标：同一次"今天第一次答对"的判定里一起结算，避免分别读一遍
// "今天是几号"却因为跨了午夜边界得出不一致的结果。只在故事主线答对时调用——
// 回忆闪回答对不算"今天打卡"，不然玩家光靠复习旧词条就能刷连续记录。
// 直接 mutate 传入的 state（跟 main.js 的写法一致），调用方负责持久化。
export function registerDailyProgress(state: GameState): DailyProgressResult {
  const today = localDateStr();
  let usedFreeze = false;
  let earnedFreeze = false;

  if (state.lastStreakDate !== today) {
    const yesterday = localDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
    if (state.lastStreakDate === yesterday) {
      state.streak = (state.streak || 0) + 1;
    } else if (state.lastStreakDate && (state.streakFreezes || 0) > 0) {
      // 断了至少一天，但手里还有保护道具：消耗一个保住连胜，而不是打回 1。
      // 不管具体断了几天，一个保护只覆盖"这次没断卡"这一件事——不做逐日精确
      // 补偿，那样对这个游戏的量级来说是过度设计。
      state.streakFreezes = (state.streakFreezes || 0) - 1;
      state.streak = (state.streak || 0) + 1;
      usedFreeze = true;
    } else {
      state.streak = 1;
    }
    state.lastStreakDate = today;

    if (
      state.streak > 0 &&
      state.streak % STREAK_FREEZE_MILESTONE === 0 &&
      (state.streakFreezes || 0) < STREAK_FREEZE_MAX
    ) {
      state.streakFreezes = (state.streakFreezes || 0) + 1;
      earnedFreeze = true;
    }
  }

  if (state.dailyCorrectDate !== today) {
    state.dailyCorrectDate = today;
    state.dailyCorrectCount = 0;
  }
  const wasComplete = (state.dailyCorrectCount || 0) >= DAILY_GOAL;
  state.dailyCorrectCount = (state.dailyCorrectCount || 0) + 1;
  const nowComplete = state.dailyCorrectCount >= DAILY_GOAL;
  return { justHitGoal: nowComplete && !wasComplete, usedFreeze, earnedFreeze };
}
