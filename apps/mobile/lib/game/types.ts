// Shared types for the game content + save-state layer. Field names/shapes mirror
// a-decade-apart/content/chapter1.js and the `state` object in a-decade-apart/main.js
// exactly, so content/chapter*.ts files can be ported 1:1 in later phases.

export interface Choice {
  text: string;
  zh?: string;
  correct: boolean;
  xp?: number;
}

export interface SceneNode {
  npcLine: { en: string; zh: string; voice?: string };
  avatar?: string;
  skill: string;
  grammarTag?: string;
  choices: Choice[];
  hintOnWrong: string;
  next: string | null;
}

export interface SceneTransition {
  en: string;
  zh: string;
}

export interface Scene {
  id: string;
  title: string;
  subtitle: string;
  avatar: string;
  startNode: string;
  transition?: SceneTransition;
  nodes: Record<string, SceneNode>;
}

export interface SkillMeta {
  label: string;
  labelEn: string;
  icon: string;
}

export interface GameContent {
  chapterTitle: string;
  chapterSubtitle: string;
  vocabBank: { en: string; zh: string; category?: string }[];
  skillMeta: Record<string, SkillMeta>;
  scenes: Scene[];
}

// —— Save state ——
// Mirrors a-decade-apart/main.js freshState()/loadState() exactly (see lib/game/state.ts).

export type ReviewStatus = "active" | "pendingFinal";

export interface ReviewItem {
  en: string;
  zh: string;
  kind: "sentence" | "word";
  // 进队列的原因：答错 / 点词查释义 / 新词曝光够次数后自动入队（复习不等答错，
  // 见 lib/game/review.ts 的 enqueueExposureReviews）。旧条目没有这个字段。
  source?: "wrong" | "tap" | "exposure";
  streak: number;
  status: ReviewStatus;
  queuedAtScene: number;
  // 只有 kind==="word" 的条目才有：点词收藏时那句话的原文，"待复习"页用它把
  // 单个词摆回完整句子里显示，而不是干巴巴一个词孤零零地列出来。旧存档里
  // 收藏的词条没有这两个字段，undefined 时页面回退成"没有句子，只显示词本身"。
  sentence?: string;
  sentenceZh?: string;
  // 只有 kind==="sentence"（答错时存的正确答案）才有：当时 NPC 问的那句话——
  // 没有这两个字段的话，闪回复习时只考"该说哪句英文"，答案脱离了当初的问题，
  // 感觉像在背一句孤立的例句，而不是"这道题又出现了一次"。旧存档里的条目
  // 没有这两个字段，undefined 时退回旧行为（只显示要选/拼的答案，不显示提问）。
  npcEn?: string;
  npcZh?: string;
}

export interface LearnedVocabEntry {
  en: string;
  zh: string;
  skill: string;
}

export interface GameState {
  sceneIndex: number;
  nodeId: string;
  skills: Record<string, number>;
  learnedVocab: LearnedVocabEntry[];
  reviewQueue: ReviewItem[];
  finished: boolean;
  lastActiveAt: number;
  streak: number;
  lastStreakDate: string | null;
  dailyCorrectCount: number;
  dailyCorrectDate: string | null;
  hearts: number;
  lastHeartAt: number;
  // 没有单独的头像图片系统——"头像"直接用玩家等级（⭐ Lv.N，见
  // lib/game/progress.ts 的 computePlayerLevel）代替，不需要 playerAvatar/
  // playerAvatarImage 这类字段。
  playerName: string | null;
  equippedTitle: string | null;
  unlockedAchievements: string[];
  // 连胜保护：断卡那天如果手里还有存货，就消耗一个保住连胜（不清零），而不是
  // 强制要求每天都不能断——纯靠"怕连胜清零"这一种损失厌恶逼玩家，容易变成压力
  // 而不是驱动力；给一点缓冲，连胜本身才更像"攒起来舍不得丢"的资产。见
  // lib/game/streak.ts 的 registerDailyProgress。
  streakFreezes: number;
  // 历史最高连击——跟 GameContext 里那个 session 级的 bestCombo 不一样，那个
  // 重开 App 就清零，这个要跨设备/跨会话留住，给成就系统当判定依据。
  allTimeBestCombo: number;
  // 完美通关（全程没答错）的幕数累计，同样是给成就系统用的持久计数，跟
  // GameContext 里瞬时的 flawlessPulse（只负责这一次弹提示）分工不同。
  flawlessScenes: number;
  // 通过闪回"最终确认"（长间隔后再答对一次）的词元——"掌握"的第二条证据来源
  // （第一条是玩家在主线里亲口选过），见 lib/game/progress.ts 的 computeVocabStats。
  // 旧存档没有这个字段，normalizeState 补成 []。
  confirmedWords: string[];
}
