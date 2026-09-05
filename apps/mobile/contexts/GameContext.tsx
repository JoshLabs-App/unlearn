// The game's state machine, reimplemented as a React context around the pure
// lib/game/* functions ported from a-decade-apart/main.js. Keeps the same imperative
// "mutate a state object, then persist" style as main.js's global `state` (via the
// `mutate()` helper below + a ref holding the canonical value), instead of threading
// everything through reducer actions — that mapping is closest to the original engine
// and easiest to diff against it when porting chapters 2-7 later.
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import { GAME_CONTENT } from "@/content/chapter1";
import { computeUnlocked } from "@/lib/game/achievements";
import { playLine } from "@/lib/game/audio";
import { loseHeart, msUntilNextHeart, syncHearts } from "@/lib/game/hearts";
import { lookupWord } from "@/lib/game/dictionary";
import { computeSkillMax } from "@/lib/game/progress";
import {
  addWrongAnswerToReview,
  enqueueExposureReviews,
  pickFlashbackItems,
  resolveFlashbackAnswer,
} from "@/lib/game/review";
import { cloneState, freshState, loadState, normalizeState, persistState, SAVE_KEY } from "@/lib/game/state";
import { registerDailyProgress } from "@/lib/game/streak";
import type { GameContent, GameState, ReviewItem, SceneTransition } from "@/lib/game/types";
import { pullSave, pushLeaderboardDebounced, pushSaveDebounced } from "@/lib/supabase/gameSync";

// 变量奖励：小概率双倍经验，制造"随机惊喜"而非可预测的节奏（main.js:180-181,893-896）。
const BONUS_XP_CHANCE = 0.2;
const BONUS_XP_MULTIPLIER = 2;
// 连击奖励：每连对这么多题，额外发一笔固定 XP——跟上面"随机双倍"是两套不同的
// 变量/确定奖励节奏叠加：随机奖励制造"惊喜"，连击奖励制造"可预期的爽点"，
// 两种心理驱动力都要有，只靠一种容易腻。
const COMBO_BONUS_EVERY = 3;
const COMBO_BONUS_XP = 5;
// 闪回答完一题后，停留多久再进下一题/关闭（main.js resolveFlashback 里等音频播完再等
// 500ms；这里简化成固定延迟，音频本身仍会播放，只是不拿它的实际时长门控转场）。
const FLASHBACK_STEP_DELAY_MS = 1200;
// 点"继续"/过场卡的"确定"之后，先停一下再真正翻页——瞬间切换显得太仓促，
// 玩家看清楚自己点了什么之前画面已经换掉了。跟上面闪回的停顿是同一个用意。
const CONFIRM_ADVANCE_DELAY_MS = 1000;

export type FlashbackMode = "sceneEnd" | "heartRecovery";

export interface FlashbackSession {
  queue: ReviewItem[]; // queue[0] is the item currently on screen
  mode: FlashbackMode;
  label: string;
  // set briefly after answering. xpAwarded/heartGained render inside the overlay
  // itself (not a separate floating toast) — the overlay is a native Modal, which
  // renders above everything else, so a toast living outside it would be invisible
  // while the modal is up.
  feedback: { correct: boolean; answerEn: string; xpAwarded: number; heartGained: boolean } | null;
}

export interface FlashbackOutcome {
  correct: boolean;
  xpAwarded: number;
  heartGained: boolean;
}

export interface ChoiceOutcome {
  correct: boolean;
  awardedXp?: number;
  isBonus?: boolean;
  justHitGoal?: boolean;
  hint?: string;
  // 连击：这次答对之后连击数变成多少；comboBonusXp 有值就代表这次连击数刚好
  // 撞上 COMBO_BONUS_EVERY 的倍数，触发了额外奖励（已经算进 awardedXp 里了，
  // 这里单独报出来是给 UI 展示"连击奖励"专属的提示文案）。
  combo?: number;
  comboBonusXp?: number;
  isNewComboRecord?: boolean;
  usedFreeze?: boolean;
  earnedFreeze?: boolean;
}

interface GameContextValue {
  content: GameContent;
  skillMax: Record<string, number>;
  state: GameState | null;
  loading: boolean;
  hearts: number;
  nextHeartInMs: number;
  hideZh: boolean;
  toggleZh: () => void;
  // 长按单词查释义的新手引导：见下面 markWordLongPressUsed 的注释。
  hasUsedWordLongPress: boolean;
  markWordLongPressUsed: () => void;
  // 改昵称：见下面 setPlayerName 的注释。
  setPlayerName: (name: string) => void;
  flashback: FlashbackSession | null;
  transitionCard: SceneTransition | null;
  dismissTransition: () => void;
  // choiceIdx = -1 表示玩家点的是渲染时动态补上的第三个选项（见 lib/game/distractor.ts），
  // 它不在 node.choices 里，一律按答错处理；extraText 是那句话的原文，用来放读音。
  handleChoice: (choiceIdx: number, extraText?: string) => Promise<ChoiceOutcome>;
  // 答对之后不再自动翻页——玩家至少要看清楚自己刚才那句话的中文意思，手动点
  // "继续"才推进剧情，故事不会哗一下就跳过去（见 index.tsx 的确认卡片）。
  awaitingAdvance: boolean;
  confirmAdvance: () => void;
  answerFlashback: (answer: string) => FlashbackOutcome | undefined;
  startHeartRecoveryFlashback: () => void;
  resetGame: () => Promise<void>;
  // 点单词查释义时收藏进生词本（PORTED from main.js queueWordForReview）：查过的词
  // 跟错题走同一套间隔重复复习机制，不是查完就算。sentence/sentenceZh 是这个词
  // 当时所在的那句台词，"待复习"页要把词摆回整句里显示，不是孤零零一个词。
  queueWordForReview: (word: string, meaning: string, sentence?: string, sentenceZh?: string) => void;
  // 连击是"这一局玩下去"的心流状态，不是需要跨设备同步/重开也要记得的进度，所以
  // 故意不存进 GameState/AsyncStorage——跟 hearts 倒计时那种"派生展示值"是同一类。
  combo: number;
  bestCombo: number;
  // 某一幕从头到尾没答错过：goToNextScene() 离开这一幕时算出来，塞进这个字段给
  // index.tsx 弹一次性的"完美通关"提示。用时间戳当 key 而不是 boolean，是因为
  // 连续两幕都 flawless 时，纯 boolean 值不变，watch 它的 useEffect 不会再触发。
  flawlessPulse: number | null;
  // 新解锁的成就——跟 flawlessPulse 一样是"派生事件"通知，但可能一次解锁好几个
  // （比如一次答对同时凑够了词汇量和连击两个成就），所以是 id 数组而不是单个值。
  // 在 mutate() 里统一判定（不管这次 mutate 是答题、闪回还是完美通关触发的），
  // 不需要每个改状态的入口各自判断一遍"这次有没有解锁新成就"。
  newAchievementPulse: { key: number; ids: string[] } | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const content = GAME_CONTENT;
  const skillMax = useMemo(() => computeSkillMax(content), [content]);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  // 跟网页版一致：默认隐藏中文（main.js `localStorage.getItem(ZH_HIDE_KEY) !== "0"`
  // 在没存过值时就是 true），只有存过"0"才是显示。
  const [hideZh, setHideZh] = useState(true);
  const [flashback, setFlashback] = useState<FlashbackSession | null>(null);
  const [transitionCard, setTransitionCard] = useState<SceneTransition | null>(null);
  const [hearts, setHearts] = useState(5);
  const [nextHeartInMs, setNextHeartInMs] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [flawlessPulse, setFlawlessPulse] = useState<number | null>(null);
  const [newAchievementPulse, setNewAchievementPulse] = useState<{ key: number; ids: string[] } | null>(
    null,
  );
  // 当前这一幕有没有答错过——只在 handleChoice 里写，只在离开当前幕（goToNextScene）
  // 时读+重置，不需要触发渲染，用 ref 就够。
  const sceneHadMistakeRef = useRef(false);

  const stateRef = useRef<GameState | null>(null);
  const flashbackRef = useRef<FlashbackSession | null>(null);
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);
  useEffect(() => {
    flashbackRef.current = flashback;
  }, [flashback]);

  // mutate()：main.js 里"改 state 全局变量 + saveState()"这套写法的 React 版本——
  // 克隆当前 state，跑同步的 mutator，把结果既写回 ref（供后续同步逻辑读取最新值）
  // 又 setState（触发重渲染），最后异步落盘（本地 + 有登录的话云端也推一份）。
  const mutate = useCallback(<T,>(fn: (draft: GameState) => T): T => {
    const base = stateRef.current;
    if (!base) throw new Error("mutate() called before game state loaded");
    const draft = cloneState(base);
    const result = fn(draft);
    draft.lastActiveAt = Date.now();
    // 成就判定统一放在这一个入口——不管这次 mutate 是答题、闪回还是完美通关触发的，
    // 都过一遍同样的检查，不用在每个改状态的地方各自判断"这次有没有解锁新成就"。
    const before = new Set(draft.unlockedAchievements);
    const newly = computeUnlocked(draft).filter((id) => !before.has(id));
    if (newly.length > 0) {
      draft.unlockedAchievements = [...draft.unlockedAchievements, ...newly];
      setNewAchievementPulse({ key: Date.now(), ids: newly });
    }
    stateRef.current = draft;
    setGameState(draft);
    setHearts(draft.hearts);
    setNextHeartInMs(msUntilNextHeart(draft));
    void persistState(draft).catch(() => {});
    pushSaveDebounced(userIdRef.current, draft);
    const totalXp = Object.values(draft.skills).reduce((a, b) => a + b, 0);
    if (userIdRef.current) {
      pushLeaderboardDebounced(userIdRef.current, {
        nickname: draft.playerName || "Anonymous",
        totalXp,
      });
    }
    return result;
  }, []);

  // 首次加载：本地 AsyncStorage 存档（跟原网页版一样，不等网络）。
  useEffect(() => {
    void (async () => {
      const initial = await loadState(content);
      stateRef.current = initial;
      setGameState(initial);
      const synced = cloneState(initial);
      setHearts(syncHearts(synced));
      setNextHeartInMs(msUntilNextHeart(synced));
      setLoading(false);
    })();
  }, [content]);

  useEffect(() => {
    void AsyncStorage.getItem("eng-rpg-hide-zh").then((v) => {
      if (v !== null) setHideZh(v !== "0");
    });
  }, []);

  const toggleZh = useCallback(() => {
    setHideZh((prev) => {
      const next = !prev;
      void AsyncStorage.setItem("eng-rpg-hide-zh", next ? "1" : "0");
      return next;
    });
  }, []);

  // 长按查词的新手提示：新用户不知道选项里的单词能长按查释义，这个手势不够
  // 显眼、纯靠自己摸索基本发现不了。用没用过持久化到本地——用过一次就永久不再
  // 提示，没用过的话每次进故事页都还会看到提示（不是只提示一次就收手）。
  const [hasUsedWordLongPress, setHasUsedWordLongPress] = useState(true);
  useEffect(() => {
    void AsyncStorage.getItem("eng-rpg-used-word-longpress").then((v) => {
      setHasUsedWordLongPress(v === "1");
    });
  }, []);

  const markWordLongPressUsed = useCallback(() => {
    setHasUsedWordLongPress((prev) => {
      if (prev) return prev;
      void AsyncStorage.setItem("eng-rpg-used-word-longpress", "1");
      return true;
    });
  }, []);

  // 改昵称：第一次进来已经给了个"努力的土豆"这种现成昵称（见 freshState），
  // 这里是让玩家自己去"更多"页改成别的。走 mutate() 而不是单独存一个 AsyncStorage
  // key，是因为昵称本来就是 GameState 的一个字段，答题时已经在推去排行榜
  // （pushLeaderboardDebounced 读的就是 draft.playerName），改名也得走同一条路径
  // 才会同步更新排行榜上显示的名字。
  const setPlayerName = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, 20);
      if (!trimmed) return;
      mutate((draft) => {
        draft.playerName = trimmed;
      });
    },
    [mutate],
  );

  // 登录后：拉一次云端存档，有就用云端覆盖本地（跨设备同步），没有就把本地存档
  // 推上去做首次种子（对应 auth.js 的 pullSave + main.js saveState 里的 pushSave）。
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const cloudRaw = await pullSave(user.id);
      if (cloudRaw && cloudRaw.skills) {
        const cloud = normalizeState(cloudRaw, content);
        stateRef.current = cloud;
        setGameState(cloud);
        const synced = cloneState(cloud);
        setHearts(syncHearts(synced));
        setNextHeartInMs(msUntilNextHeart(synced));
        await persistState(cloud).catch(() => {});
      } else if (stateRef.current) {
        pushSaveDebounced(user.id, stateRef.current);
      }
    })();
  }, [user]);

  // 心数回复是按时间算的，不需要一直跑定时器去改真正的 state——只在这几个时机
  // 重新算一遍显示用的 hearts 数字 + 倒计时：进屏幕、每 30 秒兜底刷新一次。
  // 算在一份临时 clone 上（不写回 stateRef），下一次真正的 mutate()（答题/闪回）
  // 会用当时的真实经过时间重新 syncHearts 一遍，不会因为这里没持久化而丢进度。
  useEffect(() => {
    const tick = () => {
      if (!stateRef.current) return;
      const draft = cloneState(stateRef.current);
      setHearts(syncHearts(draft));
      setNextHeartInMs(msUntilNextHeart(draft));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [gameState?.sceneIndex, gameState?.nodeId]);

  // 有 transition 文案的场景：先只弹过渡卡，不立刻把 sceneIndex/nodeId 切过去——
  // 之前是先切场景再弹卡，画面其实已经在下一幕了，nodeKey 一变，index.tsx 那个
  // "进新节点自动配音"的 effect 立刻就把下一幕 NPC 的第一句台词读出来，玩家却还在
  // 看上一幕的过渡文字，声音抢跑到画面前面去了。改成先原地弹卡（背景还是上一幕），
  // 等玩家点"继续"（dismissTransition）才真正把 state 切到下一幕，配音才跟着播。
  const pendingSceneAdvanceRef = useRef<number | null>(null);

  const goToNextScene = useCallback(() => {
    // 离开当前这一幕的时刻——这一幕全程没答错过就是"完美通关"，跟下面的场景切换
    // 逻辑无关，所以放在最前面单独判定，不受"是否有过场卡/是否是最后一幕"影响。
    if (!sceneHadMistakeRef.current) {
      mutate((draft) => {
        draft.flawlessScenes = (draft.flawlessScenes || 0) + 1;
      });
      setFlawlessPulse(Date.now());
    }
    sceneHadMistakeRef.current = false;

    const nextIndex = stateRef.current!.sceneIndex + 1;
    if (nextIndex >= content.scenes.length) {
      mutate((draft) => {
        draft.finished = true;
      });
      return;
    }
    const nextScene = content.scenes[nextIndex];
    if (nextScene.transition) {
      pendingSceneAdvanceRef.current = nextIndex;
      setTransitionCard(nextScene.transition);
      return;
    }
    mutate((draft) => {
      draft.sceneIndex = nextIndex;
      draft.nodeId = nextScene.startNode;
    });
  }, [content, mutate]);

  const beginFlashback = useCallback(
    (items: ReviewItem[], mode: FlashbackMode) => {
      if (items.length === 0) {
        if (mode === "sceneEnd") goToNextScene();
        return;
      }
      setFlashback({
        queue: items,
        mode,
        label:
          mode === "heartRecovery"
            ? "❤️ Review to earn a heart · Get it right to recover one"
            : "🧳 Flashback Review · What's this?",
        feedback: null,
      });
    },
    [goToNextScene],
  );

  const advanceNode = useCallback(
    (nextNodeId: string | null) => {
      if (nextNodeId) {
        mutate((draft) => {
          draft.nodeId = nextNodeId;
        });
        return;
      }
      // 场景走完了：先把这一幕里曝光够次数的新词自动入队（复习不等答错），
      // 再看有没有该复习的，没有就直接翻场景（main.js advance()）。
      mutate((draft) => {
        enqueueExposureReviews(draft, content, draft.sceneIndex, lookupWord);
      });
      const items = pickFlashbackItems(stateRef.current!);
      beginFlashback(items, "sceneEnd");
    },
    [mutate, beginFlashback],
  );

  const confirmingRef = useRef(false);
  const confirmAdvance = useCallback(() => {
    if (confirmingRef.current) return; // 已经在等这 1 秒了，忽略重复点击
    confirmingRef.current = true;
    setTimeout(() => {
      confirmingRef.current = false;
      setAwaitingAdvance(false);
      advanceNode(pendingNextRef.current);
    }, CONFIRM_ADVANCE_DELAY_MS);
  }, [advanceNode]);

  // 存"答对了但还没推进"的下一个节点 id——真正的推进要等玩家在 UI 上手动点
  // "继续"（见 confirmAdvance），不再是这里自己 setTimeout 定时跳。
  const pendingNextRef = useRef<string | null>(null);
  const [awaitingAdvance, setAwaitingAdvance] = useState(false);

  const handleChoice = useCallback(
    async (choiceIdx: number, extraText?: string): Promise<ChoiceOutcome> => {
      const snapshot = stateRef.current;
      if (!snapshot) return { correct: false };
      const scene = content.scenes[snapshot.sceneIndex];
      const node = scene.nodes[snapshot.nodeId];
      const isExtra = choiceIdx < 0;
      const choice = isExtra ? { text: extraText || "", correct: false } : node.choices[choiceIdx];

      void playLine(choice.text);

      if (choice.correct) {
        const isBonus = !!choice.xp && Math.random() < BONUS_XP_CHANCE;
        const baseXp = isBonus ? (choice.xp as number) * BONUS_XP_MULTIPLIER : choice.xp || 0;

        // 连击：答对才累加，答错清零（下面的 else 分支处理）；每满 COMBO_BONUS_EVERY
        // 发一笔固定奖励，跟上面的随机双倍是两套独立的奖励节奏，可能同一次答对撞在
        // 一起（既是随机双倍又刚好连击达标），那就是本局最爽的一下，不特殊处理去
        // 避免"同时触发"——叠加本身就是奖励感的一部分。
        const nextCombo = combo + 1;
        const comboBonusXp = nextCombo % COMBO_BONUS_EVERY === 0 ? COMBO_BONUS_XP : 0;
        const awardedXp = baseXp + comboBonusXp;
        // 破纪录只在超过"本局目前为止的最高连击"且至少连了 3 个才算——连击 1、2
        // 时严格来说也"刷新了纪录"，但那没有任何庆祝价值，会让"新纪录"这个反馈
        // 廉价掉。
        const isNewComboRecord = nextCombo > bestCombo && nextCombo >= COMBO_BONUS_EVERY;
        setCombo(nextCombo);
        setBestCombo((prev) => Math.max(prev, nextCombo));

        let justHitGoal = false;
        let usedFreeze = false;
        let earnedFreeze = false;
        mutate((draft) => {
          draft.skills[node.skill] = (draft.skills[node.skill] || 0) + awardedXp;
          draft.allTimeBestCombo = Math.max(draft.allTimeBestCombo || 0, nextCombo);
          const already = draft.learnedVocab.some((v) => v.en === choice.text);
          if (!already) {
            draft.learnedVocab.push({
              en: choice.text,
              zh: choice.zh || node.npcLine.zh,
              skill: node.skill,
            });
          }
          // 连续打卡 + 每日目标只在故事主线答对时结算（不含闪回复习）。
          const progress = registerDailyProgress(draft);
          justHitGoal = progress.justHitGoal;
          usedFreeze = progress.usedFreeze;
          earnedFreeze = progress.earnedFreeze;
        });
        pendingNextRef.current = node.next;
        setAwaitingAdvance(true);
        return {
          correct: true,
          awardedXp,
          isBonus,
          justHitGoal,
          combo: nextCombo,
          comboBonusXp: comboBonusXp || undefined,
          isNewComboRecord,
          usedFreeze,
          earnedFreeze,
        };
      }

      setCombo(0);
      sceneHadMistakeRef.current = true;
      mutate((draft) => {
        const correctChoice = node.choices.find((c) => c.correct)!;
        addWrongAnswerToReview(
          draft,
          correctChoice.text,
          correctChoice.zh || node.npcLine.zh,
          node.npcLine.en,
          node.npcLine.zh,
        );
        loseHeart(draft);
      });
      return { correct: false, hint: node.hintOnWrong };
    },
    [content, mutate, combo, bestCombo],
  );

  const answerFlashback = useCallback(
    (answerEn: string) => {
      const session = flashbackRef.current;
      if (!session || session.feedback) return undefined; // 一题只能答一次，等下一题再答
      const item = session.queue[0];
      const isCorrect = answerEn === item.en;

      const resolution = mutate((draft) =>
        resolveFlashbackAnswer(draft, item, isCorrect, {
          heartRecoveryMode: session.mode === "heartRecovery", content }),
      );
      // 发音已经在 FlashbackOverlay 的 ChoiceAnswer/BuildAnswer 里按 item.kind 分流
      // 播过一次了（词走 playWord，句子走 playLine）——这里以前无条件又调一次
      // playLine(item.en)，词条目会把刚起播的 playWord 音频打断（audio.ts 里任何
      // 新的播放请求都会先停掉上一个），playLine 自己又在整句配音表里查不到单个词，
      // 静默失败，结果是词条目答完直接没声音。删掉，交给调用方按 kind 播一次就够。

      setFlashback({
        ...session,
        feedback: {
          correct: isCorrect,
          answerEn: item.en,
          xpAwarded: resolution.xpAwarded,
          heartGained: resolution.heartGained,
        },
      });

      setTimeout(() => {
        const remaining = session.queue.slice(1);
        if (remaining.length > 0) {
          setFlashback({ queue: remaining, mode: session.mode, label: session.label, feedback: null });
        } else {
          setFlashback(null);
          if (session.mode === "sceneEnd") goToNextScene();
        }
      }, FLASHBACK_STEP_DELAY_MS);

      return { correct: isCorrect, xpAwarded: resolution.xpAwarded, heartGained: resolution.heartGained };
    },
    [mutate, goToNextScene],
  );

  const startHeartRecoveryFlashback = useCallback(() => {
    const queue = stateRef.current?.reviewQueue ?? [];
    if (queue.length === 0) return;
    beginFlashback([queue[0]], "heartRecovery");
  }, [beginFlashback]);

  const dismissingRef = useRef(false);
  const dismissTransition = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    setTimeout(() => {
      dismissingRef.current = false;
      setTransitionCard(null);
      const pendingIndex = pendingSceneAdvanceRef.current;
      if (pendingIndex === null) return;
      pendingSceneAdvanceRef.current = null;
      mutate((draft) => {
        draft.sceneIndex = pendingIndex;
        draft.nodeId = content.scenes[pendingIndex].startNode;
      });
    }, CONFIRM_ADVANCE_DELAY_MS);
  }, [content, mutate]);

  // PORTED from main.js queueWordForReview(): 已经在复习队列里的话不重复加、不重置
  // 进度——只是又查了一下不代表没学会，只有故事里真答错才算"没学会"。
  const queueWordForReview = useCallback(
    (word: string, meaning: string, sentence?: string, sentenceZh?: string) => {
      const existing = stateRef.current?.reviewQueue.find((r) => r.en === word && r.kind === "word");
      if (existing) {
        if (sentence && !existing.sentence) {
          mutate((draft) => {
            const target = draft.reviewQueue.find((r) => r.en === word && r.kind === "word");
            if (target) {
              target.sentence = sentence;
              target.sentenceZh = sentenceZh;
            }
          });
        }
        return;
      }
      mutate((draft) => {
        draft.reviewQueue.push({
          en: word,
          zh: meaning,
          kind: "word",
          streak: 0,
          status: "active",
          queuedAtScene: draft.sceneIndex,
          sentence,
          sentenceZh,
        });
      });
    },
    [mutate],
  );

  const resetGame = useCallback(async () => {
    const next = freshState(content);
    stateRef.current = next;
    setGameState(next);
    setHearts(next.hearts);
    setNextHeartInMs(0);
    setFlashback(null);
    setTransitionCard(null);
    setCombo(0);
    setBestCombo(0);
    setFlawlessPulse(null);
    setNewAchievementPulse(null);
    sceneHadMistakeRef.current = false;
    await persistState(next).catch(() => {});
    if (userIdRef.current) pushSaveDebounced(userIdRef.current, next);
  }, [content]);

  const value = useMemo<GameContextValue>(
    () => ({
      content,
      skillMax,
      state: gameState,
      loading,
      hearts,
      nextHeartInMs,
      hideZh,
      toggleZh,
      hasUsedWordLongPress,
      markWordLongPressUsed,
      setPlayerName,
      flashback,
      transitionCard,
      dismissTransition,
      handleChoice,
      awaitingAdvance,
      confirmAdvance,
      answerFlashback,
      startHeartRecoveryFlashback,
      resetGame,
      queueWordForReview,
      combo,
      bestCombo,
      flawlessPulse,
      newAchievementPulse,
    }),
    [
      content,
      skillMax,
      gameState,
      loading,
      hearts,
      nextHeartInMs,
      hideZh,
      toggleZh,
      hasUsedWordLongPress,
      markWordLongPressUsed,
      setPlayerName,
      flashback,
      transitionCard,
      dismissTransition,
      handleChoice,
      awaitingAdvance,
      confirmAdvance,
      answerFlashback,
      startHeartRecoveryFlashback,
      resetGame,
      queueWordForReview,
      combo,
      bestCombo,
      flawlessPulse,
      newAchievementPulse,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

export { SAVE_KEY };
