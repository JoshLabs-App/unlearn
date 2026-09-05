// PORTED from a-decade-apart/main.js:92-165 (computeSkillMax / computeVocabExposure /
// computeLevelProgress) — logic unchanged, DOM removed.
import { isStopword, lemmatize } from "./lemma";
import type { GameContent, GameState } from "./types";

// 每个技能能拿到的经验值上限，从内容里所有场景动态算出——加新场景/新技能只需要改
// content 文件，这里不用再手动同步数字。
export function computeSkillMax(content: GameContent): Record<string, number> {
  const max: Record<string, number> = {};
  for (const key of Object.keys(content.skillMeta)) max[key] = 0;
  for (const scene of content.scenes) {
    for (const node of Object.values(scene.nodes)) {
      const correct = node.choices.find((c) => c.correct);
      if (correct && correct.xp) {
        max[node.skill] = (max[node.skill] || 0) + correct.xp;
      }
    }
  }
  return max;
}

// 词汇量进度门槛（CEFR 词族数）——门槛改了要同步 UI 里进度条的百分比断点。
export const CEFR_VOCAB_THRESHOLDS = [
  { level: "A1", words: 500 },
  { level: "A2", words: 1100 },
  { level: "B1", words: 2250 },
  { level: "B2", words: 4000 },
];

export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  return text.toLowerCase().match(/[a-z]+'?[a-z]*/g) || [];
}

// 只统计玩家实际会读到的文字（NPC 台词 + 场景里出现过的选项），不算 vocabBank——
// 那是复习用的干扰项池，不是"读过的内容"。
export function computeVocabExposure(content: GameContent, upToSceneIndex: number): number {
  const seen = new Set<string>();
  for (let i = 0; i <= upToSceneIndex && i < content.scenes.length; i++) {
    for (const node of Object.values(content.scenes[i].nodes)) {
      tokenizeWords(node.npcLine.en).forEach((w) => seen.add(w));
      for (const c of node.choices) tokenizeWords(c.text).forEach((w) => seen.add(w));
    }
  }
  return seen.size;
}

// —— 诚实计数（设计精华第 7 条）：把"接触过"和"掌握了"分开数 ——
// 只统计 NPC 句 + 正确选项（玩家真读到、真该会的），不算错误选项；按词元不按词形，
// 去停用词。"掌握"= 出现 ≥ MASTERY_EXPOSURES 次，且玩家产出过（在主线里亲口选过含
// 这个词的句子，或在闪回最终确认里答对过）。CEFR 等级按"掌握"数算，不按"接触"数。
export const MASTERY_EXPOSURES = 5;

export interface VocabStats {
  encountered: number; // 接触过的词元数
  mastered: number; // 掌握的词元数（进度条/等级用这个）
}

let corpusVocabCache: { content: GameContent; vocab: Set<string> } | null = null;
// 语料里出现过的所有词形——lemmatize 用它判断候选词元是否真实存在
export function corpusVocab(content: GameContent): Set<string> {
  if (corpusVocabCache && corpusVocabCache.content === content) return corpusVocabCache.vocab;
  const vocab = new Set<string>();
  for (const scene of content.scenes) {
    for (const node of Object.values(scene.nodes)) {
      tokenizeWords(node.npcLine.en).forEach((w) => vocab.add(w));
      for (const c of node.choices) tokenizeWords(c.text).forEach((w) => vocab.add(w));
    }
  }
  corpusVocabCache = { content, vocab };
  return vocab;
}

// 到某一幕为止每个词元的曝光次数（NPC 句 + 正确选项）
export function exposureCounts(content: GameContent, upToSceneIndex: number): Map<string, number> {
  const vocab = corpusVocab(content);
  const count = new Map<string, number>();
  for (let i = 0; i <= upToSceneIndex && i < content.scenes.length; i++) {
    for (const node of Object.values(content.scenes[i].nodes)) {
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

export function computeVocabStats(
  content: GameContent,
  upToSceneIndex: number,
  state: Pick<GameState, "learnedVocab" | "confirmedWords"> | null,
): VocabStats {
  const vocab = corpusVocab(content);
  const count = exposureCounts(content, upToSceneIndex);
  const produced = new Set<string>();
  if (state) {
    for (const v of state.learnedVocab) for (const w of tokenizeWords(v.en)) produced.add(lemmatize(w, vocab));
    for (const w of state.confirmedWords || []) produced.add(lemmatize(w, vocab));
  }
  let mastered = 0;
  for (const [lm, c] of count) if (c >= MASTERY_EXPOSURES && produced.has(lm)) mastered++;
  return { encountered: count.size, mastered };
}

export interface LevelProgress {
  level: string;
  globalPct: number;
  wordCount: number;
  target: number;
}

export function computeLevelProgress(wordCount: number): LevelProgress {
  // globalPct 是在"整条到 B1 的路"上的位置，用来算进度条该露出多少。
  const finalTarget = CEFR_VOCAB_THRESHOLDS[CEFR_VOCAB_THRESHOLDS.length - 1].words;
  const globalPct = Math.max(0, Math.min(100, Math.round((wordCount / finalTarget) * 100)));

  for (const tier of CEFR_VOCAB_THRESHOLDS) {
    if (wordCount < tier.words) {
      return { level: tier.level, globalPct, wordCount, target: tier.words };
    }
  }
  const last = CEFR_VOCAB_THRESHOLDS[CEFR_VOCAB_THRESHOLDS.length - 1];
  return { level: last.level + "+", globalPct, wordCount, target: last.words };
}

// 玩家等级（Lv.1、Lv.2……）：跟上面的 CEFR 分级是两套完全独立的系统，故意分开——
// CEFR 门槛是真实的语言学习基准（500/1100/2250/4000 词族），不能为了"升级爽感"
// 随便改小，改了这几个等级标签就没有意义了。这里是另开一条纯游戏向的成长线，
// 只认总 XP，早期升得飞快（前几组答对就能升一级），越往后需要的量越大——
// 经典 RPG 曲线，让"升级"这个反馈全程高频出现，不用等攒够一大段词汇量才有一次。
const PLAYER_LEVEL_XP_K = 15;
const PLAYER_LEVEL_XP_EXP = 1.7;

function xpForPlayerLevel(level: number): number {
  return Math.round(PLAYER_LEVEL_XP_K * Math.pow(level, PLAYER_LEVEL_XP_EXP));
}

export interface PlayerLevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  pct: number;
}

export function computePlayerLevel(totalXp: number): PlayerLevelProgress {
  let level = 1;
  while (xpForPlayerLevel(level + 1) <= totalXp) level++;
  const floor = level === 1 ? 0 : xpForPlayerLevel(level);
  const ceil = xpForPlayerLevel(level + 1);
  const xpIntoLevel = totalXp - floor;
  const xpForNext = ceil - floor;
  return {
    level,
    xpIntoLevel,
    xpForNext,
    pct: xpForNext > 0 ? Math.max(0, Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100))) : 100,
  };
}
