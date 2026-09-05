// UI 音效（不是台词配音）。跟 lib/game/audio.ts 的 playLine 用同一个 per-play 模式
// （每次播放新建 player，播完 release，不复用实例——Android 上复用的 player 在放完一次
// 后 seekTo(0)+play() 不一定能再响，这个坑 audio.ts 已经踩过一次）,但这里是 fire-and-forget，
// 不用等播完再 resolve——UI 反馈不该被音效播放时长卡住。
// 音效本身由 scripts/generate-sfx.mjs 合成（纯代码生成音调，呼应网页版 main.js 里
// getSfxCtx/playTone 的思路），不引入外部音频素材。
import { createAudioPlayer } from "expo-audio";

import { preloadGameAudio } from "./audio";

export type SfxName =
  | "correct"
  | "wrong"
  | "xp"
  | "xpBonus"
  | "goal"
  | "levelUp"
  | "heartLoss"
  | "combo"
  | "comboBig"
  | "achievement";

const SFX_SOURCES: Record<SfxName, number> = {
  correct: require("@/assets/sfx/correct.wav"),
  wrong: require("@/assets/sfx/wrong.wav"),
  xp: require("@/assets/sfx/xp.wav"),
  xpBonus: require("@/assets/sfx/xp-bonus.wav"),
  goal: require("@/assets/sfx/goal.wav"),
  levelUp: require("@/assets/sfx/levelup.wav"),
  heartLoss: require("@/assets/sfx/heart-loss.wav"),
  // 破连击纪录/成就解锁专属音效，不再借用 xpBonus/levelUp——见
  // scripts/generate-sfx.mjs 底部注释。
  combo: require("@/assets/sfx/combo.wav"),
  comboBig: require("@/assets/sfx/combo-big.wav"),
  achievement: require("@/assets/sfx/achievement.wav"),
};

interface PlayerHandle {
  addListener(
    event: "playbackStatusUpdate",
    listener: (status: { didJustFinish: boolean }) => void,
  ): { remove(): void };
  release(): void;
}

export function playSfx(name: SfxName): void {
  void preloadGameAudio();
  try {
    const player = createAudioPlayer(SFX_SOURCES[name], { keepAudioSessionActive: true });
    const handle = player as unknown as PlayerHandle;
    const cleanup = () => {
      subscription.remove();
      clearTimeout(timeout);
      handle.release();
    };
    const subscription = handle.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) cleanup();
    });
    const timeout = setTimeout(cleanup, 2000);
    player.play();
  } catch {
    // 音效播放失败不应该影响游戏流程。
  }
}
