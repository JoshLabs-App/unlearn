// PORTED from a-decade-apart/main.js:551-610 (syncHearts / loseHeart) — time-based
// heart regen, logic unchanged.
import type { GameState } from "./types";

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 20 * 60 * 1000; // 每 20 分钟回 1 颗心

// 心数：不用定时器实时刷新，而是每次要用到时按"过了几个周期"来补——补满几颗心，
// lastHeartAt 就往前推进对应的整段时间，剩下不足一个周期的零头留着继续累积，
// 不会因为"看了一眼"就被偷走进度。满心状态下 lastHeartAt 持续贴着"现在"走，
// 这样从满心掉血的那一刻起，下一颗心才重新开始计时。
// 直接 mutate 传入的 state，返回值只是方便调用方读——跟 main.js 的写法一致。
export function syncHearts(state: GameState, now: number = Date.now()): number {
  let hearts = state.hearts ?? MAX_HEARTS;
  let lastHeartAt = state.lastHeartAt ?? state.lastActiveAt ?? now;

  if (hearts < MAX_HEARTS) {
    const elapsed = now - lastHeartAt;
    const regen = Math.floor(elapsed / HEART_REGEN_MS);
    if (regen > 0) {
      hearts = Math.min(MAX_HEARTS, hearts + regen);
      lastHeartAt += regen * HEART_REGEN_MS;
    }
  } else {
    lastHeartAt = now;
  }

  state.hearts = hearts;
  state.lastHeartAt = lastHeartAt;
  return hearts;
}

export function loseHeart(state: GameState): void {
  syncHearts(state); // 扣血前先把该回的心补上，不然扣血这一刻可能刚好卡在回复点之后
  state.hearts = Math.max(0, (state.hearts ?? MAX_HEARTS) - 1);
}

export function msUntilNextHeart(state: GameState, now: number = Date.now()): number {
  if ((state.hearts ?? MAX_HEARTS) >= MAX_HEARTS) return 0;
  return Math.max(0, (state.lastHeartAt ?? now) + HEART_REGEN_MS - now);
}
