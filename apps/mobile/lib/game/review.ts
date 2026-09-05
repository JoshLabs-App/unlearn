// PORTED from a-decade-apart/main.js:167-172,970-976,1143-1176 (review-queue spaced
// repetition: pickFlashbackItems / handleChoice's wrong-answer branch / resolveFlashback).
// Two quiz modes per item.status, both ported: "active" -> multiple choice
// (buildFlashbackChoiceOptions), "pendingFinal" -> word-build (see shouldUseBuildMode;
// the word-bank chip UI itself lives in the flashback screen component).
import { MAX_HEARTS } from "./hearts";
import { isStopword, lemmatize } from "./lemma";
import { corpusVocab, exposureCounts, tokenizeWords } from "./progress";
import type { GameContent, GameState, ReviewItem } from "./types";

// 答错入队时 status="active"，短期内连对 2 次后不直接移出，改成 status="pendingFinal"，
// 等场景数间隔 ≥ REVIEW_GAP_SCENES 后再抽考一次做最终确认，通过才真正移出队列。
export const REVIEW_GAP_SCENES = 5;

// 场景切换时最多复习 2 条：优先短期错题（还在 active 阶段），剩余名额才补
// "待最终确认"里间隔已经够长、可以抽考的老词条。
export function pickFlashbackItems(state: GameState): ReviewItem[] {
  const active = state.reviewQueue.filter((r) => r.status !== "pendingFinal");
  const eligibleFinal = state.reviewQueue.filter(
    (r) => r.status === "pendingFinal" && state.sceneIndex - r.queuedAtScene >= REVIEW_GAP_SCENES,
  );
  return [...active, ...eligibleFinal].slice(0, 2);
}

// 答错说明还没学会（哪怕之前已经进入"待最终确认"阶段）：退回重新学，间隔重新计时。
// npcEn/npcZh 是当时 NPC 问的那句话——闪回复习时先亮出这句提问，再考正确答案，
// 感觉上是"这道题又出现了一次"，不是脱离场景干考一句孤立的例句。
export function addWrongAnswerToReview(
  state: GameState,
  targetEn: string,
  targetZh: string,
  npcEn?: string,
  npcZh?: string,
): void {
  const existing = state.reviewQueue.find((r) => r.en === targetEn);
  if (existing) {
    existing.streak = 0;
    existing.status = "active";
    existing.queuedAtScene = state.sceneIndex;
    // 旧存档里的条目可能还没存问题原文——这次答错刚好补上，不覆盖已经有的。
    if (npcEn && !existing.npcEn) {
      existing.npcEn = npcEn;
      existing.npcZh = npcZh;
    }
  } else {
    state.reviewQueue.push({
      en: targetEn,
      zh: targetZh,
      kind: "sentence",
      streak: 0,
      status: "active",
      queuedAtScene: state.sceneIndex,
      npcEn,
      npcZh,
    });
  }
}

// —— 复习不等答错（设计精华第 6 条）：新词曝光够次数就自动进复习队列 ——
// 一幕结束时，找出"这一幕之后累计曝光刚好达到 EXPOSURE_REVIEW_THRESHOLD 次"的词
// （之前没到、现在到了，所以每个词只会触发一次），挑最多 EXPOSURE_REVIEW_PER_SCENE 个
// 有词典释义的实词入队。带上它在这一幕出现的那句台词，复习时不是孤零零一个词。
export const EXPOSURE_REVIEW_THRESHOLD = 3;
export const EXPOSURE_REVIEW_PER_SCENE = 2;

export function enqueueExposureReviews(
  state: GameState,
  content: GameContent,
  sceneIndex: number,
  lookup: (word: string) => string | null,
): number {
  const scene = content.scenes[sceneIndex];
  if (!scene) return 0;
  const vocab = corpusVocab(content);
  const before = sceneIndex > 0 ? exposureCounts(content, sceneIndex - 1) : new Map<string, number>();
  const inQueue = new Set(state.reviewQueue.map((r) => lemmatize(r.en, vocab)));
  const confirmed = new Set((state.confirmedWords || []).map((w) => lemmatize(w, vocab)));
  // 这一幕里每个词元：第一次出现的原词形 + 所在句子
  const seenHere = new Map<string, { word: string; sentence: string; sentenceZh: string; count: number }>();
  for (const node of Object.values(scene.nodes)) {
    const right = node.choices.find((c) => c.correct);
    const lines: { en: string; zh: string }[] = [{ en: node.npcLine.en, zh: node.npcLine.zh }];
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
  const candidates: { word: string; meaning: string; sentence: string; sentenceZh: string }[] = [];
  for (const [lm, info] of seenHere) {
    const prev = before.get(lm) || 0;
    if (prev >= EXPOSURE_REVIEW_THRESHOLD || prev + info.count < EXPOSURE_REVIEW_THRESHOLD) continue;
    if (info.word.length < 4 || inQueue.has(lm) || confirmed.has(lm)) continue;
    const meaning = lookup(info.word) ?? lookup(lm);
    if (!meaning) continue;
    candidates.push({ word: info.word, meaning, sentence: info.sentence, sentenceZh: info.sentenceZh });
  }
  // 长词优先（短的高频词多半已经会了），同长度按字母序保证确定性
  candidates.sort((a, b) => b.word.length - a.word.length || a.word.localeCompare(b.word));
  let added = 0;
  for (const c of candidates.slice(0, EXPOSURE_REVIEW_PER_SCENE)) {
    state.reviewQueue.push({
      en: c.word,
      zh: c.meaning,
      kind: "word",
      source: "exposure",
      streak: 0,
      status: "active",
      queuedAtScene: sceneIndex,
      sentence: c.sentence,
      sentenceZh: c.sentenceZh,
    });
    added++;
  }
  return added;
}

// 通过最终确认的条目：把它的实词记进 confirmedWords（"掌握"的第二条证据）
function recordConfirmed(state: GameState, item: ReviewItem, content: GameContent): void {
  const vocab = corpusVocab(content);
  const set = new Set(state.confirmedWords || []);
  for (const w of tokenizeWords(item.en)) {
    const lm = lemmatize(w, vocab);
    if (!isStopword(lm)) set.add(lm);
  }
  state.confirmedWords = [...set];
}

export function shouldUseBuildMode(item: ReviewItem): boolean {
  // 单个单词没法拆词拼句，pendingFinal 阶段也一直用选择题，不进拼词模式。
  return item.status === "pendingFinal" && item.kind !== "word";
}

// 单词条目的干扰项从词典里挑长度接近的词，不能拿整句当干扰项（一眼就能排除）；
// 整句条目的干扰项还是从 vocabBank 里抽。
export function buildFlashbackChoiceOptions(item: ReviewItem, content: GameContent, wordPool?: string[]): string[] {
  let distractors: string[];
  if (item.kind === "word" && wordPool && wordPool.length > 2) {
    const len = item.en.length;
    const near = wordPool.filter((w) => w !== item.en && Math.abs(w.length - len) <= 2 && !w.includes("'"));
    const pool = near.length >= 2 ? near : wordPool.filter((w) => w !== item.en);
    distractors = pool.sort(() => Math.random() - 0.5).slice(0, 2);
  } else {
    // 整句条目：挑"长度接近、也是整句、问句/陈述句形态一致"的句子当干扰项——
    // 不能混进 "tandem kayak" 这种单词条目，一眼就能排除，测不到记忆。
    const len = tokenizeWords(item.en).length;
    const isQ = /\?\s*$/.test(item.en);
    const all = content.vocabBank.filter((v) => v.en !== item.en);
    const near = all.filter((v) => {
      const l = tokenizeWords(v.en).length;
      return l >= 3 && l >= len * 0.6 && l <= len * 1.5 && /\?\s*$/.test(v.en) === isQ;
    });
    const pool = near.length >= 2 ? near : all.filter((v) => tokenizeWords(v.en).length >= 3);
    distractors = pool.sort(() => Math.random() - 0.5).slice(0, 2).map((v) => v.en);
  }
  return [item.en, ...distractors].sort(() => Math.random() - 0.5);
}

// 复习答对给的固定 XP——比主线首次答对的 10 少一半，复习是巩固记忆而不是学新
// 内容，分量要比主线轻，但也不能是 0（不然玩家会觉得"答对了却什么都没发生"）。
// 不挂在某个具体技能下（ReviewItem 不带 skill 信息，复习的词句可能来自任意技能），
// 单独记一个 "review" 桶，一样会计入 Total XP。
export const FLASHBACK_XP = 5;

export interface FlashbackResolution {
  heartGained: boolean;
  xpAwarded: number;
}

// 直接 mutate 传入的 state，调用方负责持久化 + 触发音效/UI 反馈。
export function resolveFlashbackAnswer(
  state: GameState,
  item: ReviewItem,
  isCorrect: boolean,
  opts?: { heartRecoveryMode?: boolean; content?: GameContent },
): FlashbackResolution {
  const target = state.reviewQueue.find((r) => r.en === item.en);
  let heartGained = false;
  let xpAwarded = 0;

  if (isCorrect) {
    xpAwarded = FLASHBACK_XP;
    state.skills.review = (state.skills.review || 0) + FLASHBACK_XP;
    if (target) {
      if (target.status === "pendingFinal") {
        // 长间隔之后再考一次也答对了：真正学会，移出队列，并记为"已确认掌握"
        state.reviewQueue = state.reviewQueue.filter((r) => r.en !== item.en);
        if (opts?.content) recordConfirmed(state, item, opts.content);
      } else {
        target.streak += 1;
        if (target.streak >= 2) {
          // 短期内连对2次，先别急着判定"学会"，等够长的间隔再做最终确认
          target.status = "pendingFinal";
          target.queuedAtScene = state.sceneIndex;
        }
      }
    }
    if (opts?.heartRecoveryMode) {
      // 心数清零时专门开的复习通道：答对就还一颗心。
      state.hearts = Math.min(MAX_HEARTS, (state.hearts ?? MAX_HEARTS) + 1);
      heartGained = true;
    }
  } else if (target) {
    target.streak = 0;
    target.status = "active";
    target.queuedAtScene = state.sceneIndex;
  }

  return { heartGained, xpAwarded };
}
