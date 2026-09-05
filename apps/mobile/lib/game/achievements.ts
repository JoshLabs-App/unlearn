// 成就定义 + 判定。之前"更多"页的成就墙一直是 Phase 2 占位卡片——main.js 原本有
// checkAchievements()，但网页版那套判定条件挂在网页专属的一些字段上，没有直接照抄。
// 这里先实现一小批完全基于移动端已经在记录的数据就能判定的成就，不引入新内容/新
// 素材；GameState.unlockedAchievements 这个字段 Phase 1 就已经建好了，之前一直没人写。
import type { GameState } from "./types";

export interface AchievementDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_correct", icon: "🎯", title: "初次登场", desc: "答对第一题" },
  { id: "streak_7", icon: "🔥", title: "七日之约", desc: "连续打卡 7 天" },
  { id: "combo_10", icon: "⚡", title: "连击高手", desc: "单次连对 10 题" },
  { id: "flawless_1", icon: "✨", title: "完美主义者", desc: "一幕对话全程不答错" },
  { id: "vocab_50", icon: "📚", title: "词汇达人", desc: "学会 50 个词汇" },
];

const CHECKS: Record<string, (state: GameState) => boolean> = {
  first_correct: (s) => s.learnedVocab.length >= 1,
  streak_7: (s) => (s.streak || 0) >= 7,
  combo_10: (s) => (s.allTimeBestCombo || 0) >= 10,
  flawless_1: (s) => (s.flawlessScenes || 0) >= 1,
  vocab_50: (s) => s.learnedVocab.length >= 50,
};

export function computeUnlocked(state: GameState): string[] {
  return ACHIEVEMENTS.filter((a) => CHECKS[a.id]?.(state)).map((a) => a.id);
}
