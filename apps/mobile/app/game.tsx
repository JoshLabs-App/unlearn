// Main game screen. Ported from a-decade-apart/index.html #game-screen +
// main.js renderSceneContent()/handleChoice() — reimplemented as React state/JSX
// instead of direct DOM manipulation, using GameContext for all state transitions.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AchievementToast } from "@/components/game/AchievementToast";
import { AnimatedProgressBar } from "@/components/game/AnimatedProgressBar";
import { CefrLevelBar } from "@/components/game/CefrLevelBar";
import { ChoiceButton, type ChoiceState } from "@/components/game/ChoiceButton";
import { ComboBadge } from "@/components/game/ComboBadge";
import { ConfettiBurst } from "@/components/game/ConfettiBurst";
import { HeartsRow } from "@/components/game/HeartsRow";
import { LevelUpOverlay } from "@/components/game/LevelUpOverlay";
import { NavArrowIcon } from "@/components/game/NavArrowIcon";
import { PrimaryButton } from "@/components/game/PrimaryButton";
import { StreakBanner } from "@/components/game/StreakBanner";
import { WordPopup } from "@/components/game/WordPopup";
import { WordText } from "@/components/game/WordText";
import { XpToast } from "@/components/game/XpToast";
import { FlawlessBadge } from "@/components/game/FlawlessBadge";
import { FlashbackOverlay } from "@/components/FlashbackOverlay";
import { useGame } from "@/contexts/GameContext";
import { ACHIEVEMENTS, type AchievementDef } from "@/lib/game/achievements";
import { playLine, playWord } from "@/lib/game/audio";
import { lookupWord } from "@/lib/game/dictionary";
import { bigImpact } from "@/lib/game/haptics";
import { MAX_HEARTS } from "@/lib/game/hearts";
import { buildHistory } from "@/lib/game/history";
import { pickContextualDistractor } from "@/lib/game/distractor";
import { computeLevelProgress, computePlayerLevel, computeVocabStats } from "@/lib/game/progress";
import { levelTitle } from "@/lib/game/levelTitles";
import { playSfx } from "@/lib/game/sfx";
import { localDateStr } from "@/lib/game/streak";
import { useCountUp, useLiveCounter } from "@/lib/game/useCountUp";
import { theme } from "@/lib/theme";

// 答对之后，先留给 XpToast/连击徽章这些"胜利反馈"独占一段时间，"继续"确认卡
// 延迟这么久才出现——太短等于没延迟，两者还是撞在一起；太长又显得卡顿，玩家
// 会以为点漏了。两档：普通 +XP 小提示动画短，用 ANSWER_POPUP_DELAY_MS；金色大
// 反馈（连击破纪录/连胜保护/双倍经验）动画拖得更久，得等 ANSWER_POPUP_DELAY_GOLD_MS
// 才行，不然确认卡会在飘字还没放完就糊上来。
const ANSWER_POPUP_DELAY_MS = 750;
const ANSWER_POPUP_DELAY_GOLD_MS = 1700;

function shuffledIndices(length: number): number[] {
  const idx = Array.from({ length }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

// 场景/章节过场卡：网页版是 CSS opacity/translateY crossfade（scene-fade-out/in），
// 移动端原本是纯 Modal fade，卡片内容瞬间出现——这里给卡片本身加一层轻微上滑+
// 缩放入场，更有"翻页/转场"的仪式感。Modal 本身的 fade 负责背景遮罩淡入淡出。
function TransitionCard({
  transitionCard,
  onContinue,
}: {
  transitionCard: { en: string; zh: string };
  onContinue: () => void;
}) {
  const translateY = useSharedValue(18);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 12, stiffness: 170 });
    opacity.value = withTiming(1, { duration: 280 });
    scale.value = withSequence(
      withSpring(1.03, { damping: 9, stiffness: 220 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
  }, [translateY, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  // 中文不再单独一行摆着看，直接就是"继续"按钮的文案——跟下面答对之后的确认卡
  // 是同一个思路：按钮本身既亮出了这句话的中文意思，点它又是唯一的"继续"动作，
  // 不用"读完中文再去点一个写着英文 Continue 的按钮"这两步。
  return (
    <Animated.View style={[styles.transitionCard, style]}>
      <Text style={styles.transitionEn}>{transitionCard.en}</Text>
      <PrimaryButton label={transitionCard.zh} onPress={onContinue} />
    </Animated.View>
  );
}

// 答对之后的"继续"确认：不是临时弹出、待一会儿又消失的浮层——是屏幕最下方、
// 贴着底部标签栏图标上方的一条常驻占位条，位置永远固定，不用每次现找它在哪。
// 没有答对时是灰色占位态——原来这个态是纯禁用的"···"，现在把小眼睛（原来单独
// 悬浮在左下角的圆形按钮）的"按住偷看这句中文"功能合并了进来：按住这条灰条，
// 提示文案换成当前 NPC 台词的中文本身（不再用眼睛图标——按下去看到的就是中文
// 这件事本身已经足够直白），松手收回、变回"显示中文"这行小字提示。一旦答对
// （且反馈动画播完，见 showAdvancePopup 的 effect），才变成实色可点，文案换成
// 这句的中文翻译，点一下是"我看懂了，继续"——这时松开偷看功能，专心当"继续"
// 按钮用。直接复用 PrimaryButton 而不是另起一套按压动效，跟全app其它按钮的
// 手感保持一致。
function ContinueBar({
  active,
  zh,
  peeking,
  bottom,
  onPress,
  onPeekIn,
  onPeekOut,
}: {
  active: boolean;
  zh: string;
  peeking: boolean;
  bottom: number;
  onPress: () => void;
  onPeekIn: () => void;
  onPeekOut: () => void;
}) {
  // 变成可点的一瞬间先"弹"一下（从略小弹到略大再回正），然后一直轻微地一涨
  // 一缩呼吸——底部这条离对话区最远，答对之后光是颜色变绿不够醒目，得靠动
  // 起来把视线拉下来，也暗示"这是现在该点的东西"。回到灰色占位态就停下来、
  // 尺寸归一，占位态本身不该抢注意力。
  const scale = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(scale);
    if (active) {
      scale.value = 0.92;
      scale.value = withSequence(
        withSpring(1.06, { damping: 9, stiffness: 260 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
        withRepeat(
          withSequence(
            withTiming(1.035, { duration: 750, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 750, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
        ),
      );
    } else {
      scale.value = withTiming(1, { duration: 150 });
    }
  }, [active, scale]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.advanceFixedBtn, { bottom }, animStyle]}>
      <PrimaryButton
        label={active ? zh : "显示中文"}
        onPress={active ? onPress : () => {}}
        onPressIn={active ? undefined : onPeekIn}
        onPressOut={active ? undefined : onPeekOut}
        variant={active ? "accent" : "surface"}
        hint={!active && !peeking}
        size="lg"
      />
    </Animated.View>
  );
}

// 头像呼吸动效：原来是纯静态 emoji，场景卡整个换了颜色、对话在动、选项在动，
// 唯独人物头像一动不动，显得像个死图标而不是"在场的角色"。轻微的缩放循环，
// 幅度控制得很小（1→1.04），不能让人分心，只是给个"活着"的暗示。
function BreathingAvatar({ children, style }: { children: string; style: object }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.Text style={[style, animStyle]}>{children}</Animated.Text>
  );
}

// 翻页图标之前是裸图标直接摆在米色背景上——没有底色/边框托着，看着单薄、
// 大小和间距也跟旁边的进度条不成比例。改成套一个圆形浅色底的"小圆钮"（跟
// HUD 里那些胶囊徽章是同一个视觉语言），图标本身缩到 20（chip 直径 44 撑
// 得住），配色也从纯黑/半透明灰改成跟全app一致的 accent 绿 / 静音棕灰。
const NAV_ICON_SIZE = 20;

export default function GameScreen() {
  // 顶栏隐藏了书名之后，这个页面自己就是屏幕最上面的内容——原来靠导航头（自带
  // 安全区避让）把 HUD 顶下去，现在得自己接管顶部安全区，不然 HUD/结算页这些
  // 内容会顶到状态栏/刘海底下去。
  const insets = useSafeAreaInsets();
  // 底部常驻"继续"条离屏幕底边的距离。原来写死 bottom:24——iOS 上 home 指示条是
  // 透明的，压在按钮下沿也看得见；但安卓 SDK 56 起默认 edge-to-edge，系统导航栏
  // （三键导航是一整条不透明的 48dp 高的栏）直接画在 app 内容上面，写死 24 的
  // 按钮大半截被它盖住，答对之后看到的只是一条绿边、中文完全露不出来。所以
  // 必须把底部安全区 insets.bottom 算进去；没有安全区的老设备维持原来的 24。
  const barBottom = Math.max(24, insets.bottom + 12);
  const router = useRouter();
  const {
    content,
    state,
    loading,
    hearts,
    hideZh,
    hasUsedWordLongPress,
    markWordLongPressUsed,
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
  } = useGame();

  const [disabled, setDisabled] = useState<Set<number>>(new Set());
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // busy 这个 state 只保证下一次渲染里选项会变灰不可点，但两次点击之间如果
  // 都发生在同一次渲染提交之前（连点很快、或者动画卡顿的那一刻），读到的都是
  // 同一份旧闭包里的 busy=false，state 挡不住——用一个 ref 同步兜底，点下去
  // 当场标记为 true，不用等 re-render，才能真正防住"两次点击都选中了不同选项，
  // pickedIdx 被后一次覆盖"这种情况。
  const busyRef = useRef(false);
  const [xpToast, setXpToast] = useState<{ key: number; label: string; tone: "accent" | "gold" } | null>(
    null,
  );
  // 用 key（不是 boolean）触发彩纸屑——同一个"大事件"可能在很短时间内连着来
  // 好几次（比如刚破连击纪录又刚好凑够每日目标），boolean 在还没归零之前再设
  // 一次 true 不会触发新的一轮渲染；换成每次都塞一个新时间戳当 key，配合
  // ConfettiBurst 自身的 key prop 强制重新挂载，每次都能重新炸一轮。
  const [confettiKey, setConfettiKey] = useState<number | null>(null);
  function burstConfetti() {
    setConfettiKey(Date.now());
  }
  const [levelUp, setLevelUp] = useState<string | null>(null);
  const prevLevelRef = useRef<string | null>(null);
  const [peek, setPeek] = useState(false);

  // 回顾模式（PORTED from main.js browseIndex）：null = 直播（可互动的当前节点），
  // 否则是 history 数组的下标，表示正在翻看第几条"已经答对走过"的历史记录。纯 UI
  // 状态，不落存档——退出 App 重进就回到直播位置，翻页只是回看不是切换进度。
  const [browseIndex, setBrowseIndex] = useState<number | null>(null);

  // 点词查释义（PORTED from main.js showWordPopup()）：wordPopup 非 null 时悬浮
  // 显示释义，activeWord 只管高亮，两者一起在 WordPopup 的 onDone 里清空——
  // 跟原版"2.5 秒后自动收起"是同一个节奏，具体计时交给 WordPopup 组件自己管理。
  const [wordPopup, setWordPopup] = useState<
    { key: number; word: string; meaning: string; anchorY: number } | null
  >(null);
  const [activeWord, setActiveWord] = useState<string | null>(null);

  // 答对之后先让音效/震动/XP飘字这些"胜利反馈"单独播完，隔一段再弹出"继续"
  // 确认卡——两者同时炸出来会互相抢注意力。等多久不是固定值：金色大反馈（连击
  // 破纪录/连胜保护/双倍经验）现在动画更长（见 XpToast 的 goldWrap），要等更久；
  // 普通 +XP 小提示则快得多。onPressChoice 里按这次具体触发的是哪种反馈，把对应
  // 时长写进这个 ref，下面的 effect 读它来决定延迟多久。
  const answerPopupDelayRef = useRef(ANSWER_POPUP_DELAY_MS);
  const [showAdvancePopup, setShowAdvancePopup] = useState(false);

  function handleWordPress(
    rawWord: string,
    event: GestureResponderEvent,
    sentenceEn?: string,
    sentenceZh?: string,
  ) {
    const lower = rawWord.toLowerCase();
    const meaning = lookupWord(lower);
    if (!meaning) return;
    setActiveWord(lower);
    // 释义气泡定位在长按点的正上方一小段距离（见 WordPopup 的 anchorY），不再
    // 固定挂在屏幕某处——pageY 是相对整个屏幕的坐标，跟弹层用 position:absolute
    // 时的参照系一致。
    setWordPopup({ key: Date.now(), word: rawWord, meaning, anchorY: event.nativeEvent.pageY });
    void playWord(lower);
    queueWordForReview(lower, meaning, sentenceEn, sentenceZh);
    markWordLongPressUsed();
  }

  // 按住底部那条"继续"占位条不放才翻出当前 NPC 台词的中文看一眼，松手立刻
  // 收回——纯本地状态，不动"更多"页里那个持久的显示/隐藏中文设置（那个决定
  // 默认值，这个只是临时偷看，不该互相覆盖）。原来是单独一个悬浮的眼睛图标，
  // 现在合并进 ContinueBar 灰色占位态本身（见 ContinueBar 组件），答对之前
  // 按住它就能看，不用再找另一个按钮。
  function peekZhIn() {
    setPeek(true);
  }
  function peekZhOut() {
    setPeek(false);
  }
  const zhVisible = !hideZh || peek;

  // 退出游戏页回到首页场景列表——像多邻国的关卡页一样，游戏页是从首页点进来的
  // 独立全屏页，不挂在底部 tab 栏里，退出走的是"返回首页"而不是"切 tab"。
  // 优先 back()（保留导航栈里首页当时的滚动位置等状态），只有直接深链进来、
  // 导航栈里没有上一页时才 replace 兜底。
  function exitToHome() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }

  const nodeKey = state ? `${state.sceneIndex}:${state.nodeId}` : null;
  const prevNodeKey = useRef<string | null>(null);

  const scene = state ? content.scenes[state.sceneIndex] : null;
  const node = scene && state ? scene.nodes[state.nodeId] : null;

  // 渲染时动态补第三个选项：从附近别的节点借一句"通顺但答非所问"的玩家句
  // （设计精华第 5 条：内容里现成的两个选项大多靠常识就能排除，测不到英文）。
  // 它不在 node.choices 里，下标是 node.choices.length，点了走 handleChoice(-1, text)。
  const displayChoices = useMemo(() => {
    if (!node || !state) return [];
    const extra = pickContextualDistractor(content, state.sceneIndex, state.nodeId, node);
    return extra ? [...node.choices, { text: extra.text, zh: extra.zh, correct: false }] : node.choices;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute only when the node changes
  }, [nodeKey]);
  const choiceOrder = useMemo(
    () => (node ? shuffledIndices(displayChoices.length) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reshuffle only when the node changes
    [nodeKey, displayChoices.length],
  );

  // PORTED from main.js buildHistory(): 算到当前节点为止、已经答对走过的每一句，
  // 只用 sceneIndex/nodeId 依赖（不是整个 state）——state 里心数/XP 之类字段变化
  // 很频繁，没必要跟着重算这份摊平列表。
  const history = useMemo(
    () => (state ? buildHistory(content, state.sceneIndex, state.nodeId) : []),
    [content, state?.sceneIndex, state?.nodeId],
  );

  useEffect(() => {
    if (!nodeKey || prevNodeKey.current === nodeKey) return;
    prevNodeKey.current = nodeKey;
    setDisabled(new Set());
    setPickedIdx(null);
    setHint(null);
    setXpToast(null);
    setBrowseIndex(null);
    setWordPopup(null);
    setActiveWord(null);
    setShowAdvancePopup(false);
    if (node) void playLine(node.npcLine.en);
  }, [nodeKey, node]);

  // 答对后先让胜利反馈单独播完，隔 answerPopupDelayRef.current 才弹出"继续"
  // 确认卡（这次具体等多久由 onPressChoice 在触发反馈的同时写进这个 ref——
  // 金色大反馈要等更久，见顶部常量注释）——awaitingAdvance 一变 false 就立刻
  // 收回，不需要延迟。
  useEffect(() => {
    if (!awaitingAdvance) {
      setShowAdvancePopup(false);
      return;
    }
    const t = setTimeout(() => setShowAdvancePopup(true), answerPopupDelayRef.current);
    return () => clearTimeout(t);
  }, [awaitingAdvance]);

  // 翻页翻到某一条历史记录时，念一下那句台词——跟直播时"进入新节点自动播放"
  // 是同一个用户预期，回看的时候也不该是哑巴。
  useEffect(() => {
    if (browseIndex === null) return;
    const entry = history[browseIndex];
    if (entry) void playLine(entry.npcEn);
  }, [browseIndex, history]);

  function goToPrevHistory() {
    if (history.length === 0) return;
    setBrowseIndex((prev) => (prev === null ? history.length - 1 : Math.max(0, prev - 1)));
  }

  function goToNextHistory() {
    setBrowseIndex((prev) => {
      if (prev === null) return null;
      // 已经翻到最新一条历史记录，再往前一步就是回到直播、可以正常作答的节点。
      if (prev < history.length - 1) return prev + 1;
      return null;
    });
  }

  // 上一场/下一场：跟上面按条翻的 goToPrevHistory/goToNextHistory 是两档不同
  // 粒度——那两个一次翻一句已答对的台词，这两个直接跳到目标场景的第一句，
  // 用于"跳回去重新学"整段场景，不用一句一句翻过去。
  function currentBrowseSceneIndex(): number {
    if (browseIndex !== null) return history[browseIndex]?.sceneIndex ?? (state?.sceneIndex ?? 0);
    return state?.sceneIndex ?? 0;
  }

  function goToPrevScene() {
    const cur = currentBrowseSceneIndex();
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].sceneIndex < cur) {
        const target = history[i].sceneIndex;
        const firstIdx = history.findIndex((e) => e.sceneIndex === target);
        setBrowseIndex(firstIdx);
        return;
      }
    }
  }

  function goToNextScene() {
    const target = currentBrowseSceneIndex() + 1;
    const firstIdx = history.findIndex((e) => e.sceneIndex === target);
    if (firstIdx !== -1) {
      setBrowseIndex(firstIdx);
    } else if (browseIndex !== null) {
      setBrowseIndex(null);
    }
  }

  // 诚实计数：等级按"掌握"的词元数算（出现够次数且玩家产出过），"接触"数只做参考
  // （设计精华第 7 条）。按幕/已产出句数/已确认词数缓存，不每次渲染都扫全部内容。
  const vocabStats = useMemo(
    () => (state ? computeVocabStats(content, state.sceneIndex, state) : { encountered: 0, mastered: 0 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content, state?.sceneIndex, state?.learnedVocab.length, state?.confirmedWords?.length],
  );
  const level = computeLevelProgress(vocabStats.mastered);

  // 升级时刻：跨过门槛时全屏闪一下——纯粹是给 computeLevelProgress 已经算好的结果加
  // 一层反馈。只在等级真的"往上"跨时触发：改成按掌握数计级之后，老存档第一次打开
  // 等级可能比之前显示的低，那不是升级，不能放礼花。
  useEffect(() => {
    if (prevLevelRef.current === null) {
      prevLevelRef.current = level.level;
      return;
    }
    if (prevLevelRef.current !== level.level) {
      const order = ["A1", "A2", "B1", "B2", "B2+"];
      const wentUp = order.indexOf(level.level) > order.indexOf(prevLevelRef.current);
      prevLevelRef.current = level.level;
      if (!wentUp) return;
      setLevelUp(level.level);
      burstConfetti();
      playSfx("levelUp");
      bigImpact();
    }
  }, [level.level]);

  // 完美通关：GameContext 在离开一幕时算好"这一幕有没有答错过"，用时间戳当 key
  // 塞进 flawlessPulse，这里 watch 它变化就弹一次提示——跟升级同一套"派生事件"
  // 模式，只是数据来源从 computeLevelProgress 换成 GameContext 里的 ref。
  const prevFlawlessRef = useRef<number | null>(null);
  const [flawlessBadge, setFlawlessBadge] = useState<number | null>(null);
  useEffect(() => {
    if (flawlessPulse === null) return;
    if (prevFlawlessRef.current === flawlessPulse) return;
    prevFlawlessRef.current = flawlessPulse;
    setFlawlessBadge(flawlessPulse);
    playSfx("goal");
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [flawlessPulse]);

  // 成就解锁：GameContext 的 mutate() 每次改完状态都会顺带判定一遍，一次 mutate
  // 可能同时解锁好几个（比如同一次答对刚好凑够词汇量+连击两个条件）——排成队列
  // 一个个弹，而不是叠在一起看不清，也不是只显示第一个把其它悄悄吞掉。
  const prevAchievementKeyRef = useRef<number | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([]);
  useEffect(() => {
    if (!newAchievementPulse) return;
    if (prevAchievementKeyRef.current === newAchievementPulse.key) return;
    prevAchievementKeyRef.current = newAchievementPulse.key;
    const defs = newAchievementPulse.ids
      .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
      .filter((a): a is AchievementDef => !!a);
    if (defs.length === 0) return;
    setAchievementQueue((prev) => [...prev, ...defs]);
    burstConfetti();
    playSfx("achievement");
    bigImpact();
  }, [newAchievementPulse]);

  // 结算页的数字要滚动播放，useCountUp 是个 hook，不能等 state.finished 判断
  // 通过了才调用——统一提到所有早退（loading/finished）判断之前，用 state 为空
  // 时的兜底 0 保证 hook 顺序稳定。
  const totalXp = state ? Object.values(state.skills).reduce((a, b) => a + b, 0) : 0;
  const vocabCount = state ? state.learnedVocab.length : 0;
  const finishedXpCount = useCountUp(state?.finished ? totalXp : 0, 1100);
  const finishedVocabCount = useCountUp(state?.finished ? vocabCount : 0, 1100);
  // HUD 里常驻的总分数字也滚动播放——每答对一题就往上"爬"一下，而不是数字瞬间
  // 跳变，"分数一直在涨"这件事本身要看得见过程，不只是看得见结果。用
  // useLiveCounter（从上次显示的值滚到新值）而不是 useCountUp（每次都从 0 滚）——
  // 这个数字随时在变，用 useCountUp 会变成"瞬间归零再冲上去"，很像坏了。
  const displayedTotalXp = useLiveCounter(totalXp, 450);

  // 玩家等级（跟 CEFR 分级是两套系统，见 lib/game/progress.ts 顶部注释）：只认
  // 总 XP，升级很快很频繁，专门用来制造"一直在升级"的爽感，不用等词汇量攒到
  // CEFR 门槛才有一次反馈。
  const playerLevel = computePlayerLevel(totalXp);
  const prevPlayerLevelRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevPlayerLevelRef.current === null) {
      prevPlayerLevelRef.current = playerLevel.level;
      return;
    }
    if (prevPlayerLevelRef.current !== playerLevel.level) {
      prevPlayerLevelRef.current = playerLevel.level;
      setLevelUp(`Lv. ${playerLevel.level}`);
      burstConfetti();
      playSfx("levelUp");
      bigImpact();
    }
  }, [playerLevel.level]);

  if (loading || !state || !scene || !node) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (state.finished) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <Text style={styles.endMedal}>🏅</Text>
        <Text style={styles.endTitle}>Chapter Complete!</Text>
        <Text style={styles.endBody}>
          你在多伦多安顿了下来——开了账户、租了房、认识了室友——但那张旧照片和地址一直没放下。今晚，你决定明天就去看看。
        </Text>
        <View style={styles.endStatGrid}>
          <View style={styles.endStatCard}>
            <Text style={styles.endStatValue}>{finishedXpCount}</Text>
            <Text style={styles.endStatLabel}>Total XP</Text>
          </View>
          <View style={styles.endStatCard}>
            <Text style={styles.endStatValue}>{finishedVocabCount}</Text>
            <Text style={styles.endStatLabel}>Vocab Learned</Text>
          </View>
          <View style={[styles.endStatCard, { borderColor: theme.colors.gold }]}>
            <Text style={[styles.endStatValue, { color: theme.colors.goldDeep }]}>{bestCombo}</Text>
            <Text style={styles.endStatLabel}>Best Combo</Text>
          </View>
          <View style={[styles.endStatCard, { borderColor: theme.skillPalette[1] }]}>
            <Text style={[styles.endStatValue, { color: theme.skillPalette[1] }]}>
              🧊{state.streakFreezes}
            </Text>
            <Text style={styles.endStatLabel}>Streak Freezes</Text>
          </View>
        </View>
        <PrimaryButton label="Play Again" onPress={() => void resetGame()} />
      </View>
    );
  }

  const heartGated = hearts <= 0 && state.reviewQueue.length > 0;

  async function onPressChoice(idx: number) {
    if (busyRef.current || disabled.has(idx) || !node) return;
    busyRef.current = true;
    setBusy(true);
    setPickedIdx(idx);
    const isExtra = idx >= node.choices.length;
    const outcome = await handleChoice(isExtra ? -1 : idx, isExtra ? displayChoices[idx]?.text : undefined);
    busyRef.current = false;
    setBusy(false);
    if (outcome.correct) {
      // 只锁住所有选项防止再点，但只有玩家实际点的这个（pickedIdx）才该显示颜色反馈——
      // 之前这里直接把全部 index 标成 disabled，choiceState() 又把"disabled 且不是
      // correct"的都渲成"wrong"，导致答对时旁边没点过的选项也跟着变红/震动，看起来
      // 像是"选对了但反馈是错的"。
      setDisabled(new Set(displayChoices.map((_, i) => i)));
      // 破本局连击纪录用专属音效（连击数越高越"长效"，见 generate-sfx.mjs），
      // 盖过日常的答对/双倍经验音效——这是当次最值得强调的事件，不该被普通提示
      // 音混在一起听不出区别。
      if (outcome.isNewComboRecord) {
        playSfx((outcome.combo ?? 0) >= 8 ? "comboBig" : "combo");
      } else {
        playSfx(outcome.isBonus || outcome.comboBonusXp ? "xpBonus" : "correct");
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (outcome.isNewComboRecord) {
        bigImpact();
        burstConfetti();
      }
      // 同一次答对可能同时够格好几种提示（拿到 XP、连击奖励、破连击纪录、连胜保护
      // 刚好攒够）——一次只能显示一条飘字，按"稀有度"挑最值得说的那条：连胜保护
      // 相关的最少见（最多 7 天一次），优先展示；其次是破本局连击纪录；再其次是
      // 连击奖励；日常 XP 兜底。
      if (outcome.earnedFreeze) {
        setXpToast({ key: Date.now(), label: "🧊 连续打卡奖励：获得连胜保护 x1！", tone: "gold" });
        answerPopupDelayRef.current = ANSWER_POPUP_DELAY_GOLD_MS;
      } else if (outcome.usedFreeze) {
        setXpToast({ key: Date.now(), label: "🧊 连胜保护生效，连胜没断！", tone: "gold" });
        answerPopupDelayRef.current = ANSWER_POPUP_DELAY_GOLD_MS;
      } else if (outcome.isNewComboRecord) {
        setXpToast({ key: Date.now(), label: `🏆 本局最高连击 x${outcome.combo}！`, tone: "gold" });
        answerPopupDelayRef.current = ANSWER_POPUP_DELAY_GOLD_MS;
      } else if (outcome.comboBonusXp) {
        setXpToast({
          key: Date.now(),
          label: `⚡ 连击 x${outcome.combo}！+${outcome.awardedXp} XP`,
          tone: "gold",
        });
        answerPopupDelayRef.current = ANSWER_POPUP_DELAY_GOLD_MS;
      } else if (outcome.awardedXp) {
        setXpToast({
          key: Date.now(),
          label: `+${outcome.awardedXp} XP`,
          tone: outcome.isBonus ? "gold" : "accent",
        });
        answerPopupDelayRef.current = outcome.isBonus ? ANSWER_POPUP_DELAY_GOLD_MS : ANSWER_POPUP_DELAY_MS;
      } else {
        answerPopupDelayRef.current = ANSWER_POPUP_DELAY_MS;
      }
      if (outcome.justHitGoal) {
        burstConfetti();
        playSfx("goal");
      }
    } else {
      setDisabled((prev) => new Set(prev).add(idx));
      setHint(outcome.hint ?? null);
      playSfx("wrong");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  // 闪回复习弹层答完一题的音效/震动反馈——之前这里点完只有文字变化（"✅ 记住了"），
  // 点了跟没点感觉差不多。XP 数字本身在 FlashbackOverlay 的反馈文字里显示（不用
  // 这里的飘字 XpToast——弹层是原生 Modal，会盖在包括 XpToast 在内的其他内容之上，
  // 飘字放在 Modal 外面根本看不见）。
  function onFlashbackAnswer(answerEn: string) {
    const outcome = answerFlashback(answerEn);
    if (!outcome) return;
    if (outcome.correct) {
      playSfx("correct");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      playSfx("wrong");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function choiceState(idx: number): ChoiceState {
    if (pickedIdx !== idx || !node) return "idle";
    return displayChoices[idx]?.correct ? "correct" : "wrong";
  }

  const today = localDateStr();
  const checkedInToday = state.lastStreakDate === today;

  // PORTED from main.js renderHistoryView(): browsing 时整块场景卡/选项区都换成
  // 只读的历史记录展示，不是叠加在直播内容上面——跟网页版一样，回看的时候看到的
  // 就是"当时那一幕"，不是当前进度混着一条历史提示。
  const browsing = browseIndex !== null;
  const browseEntry = browsing ? history[browseIndex] : null;

  // 翻页图标四个按钮各自的禁用条件——提到这里算一次，JSX 里和图标颜色计算
  // 都直接读这几个布尔值，不用每次都重新拼一遍判断。
  const prevSceneDisabled = !history.some((e) => e.sceneIndex < currentBrowseSceneIndex());
  const prevHistoryDisabled = history.length === 0 || (browsing && browseIndex === 0);
  const nextHistoryDisabled = !browsing;
  const nextSceneDisabled = !browsing;

  // 场景配色：按 sceneIndex 循环取一组柔和背景+强调色，让"换场景"有视觉提示
  // （见 theme.ts scenePalette 顶部注释），而不是全程一块米色卡片到底。回看时
  // 配色跟着"正在看的那一幕"走，不是当前进度所在的那一幕。
  const paletteIndex = browseEntry ? browseEntry.sceneIndex : state.sceneIndex;
  const scenePalette = theme.scenePalette[paletteIndex % theme.scenePalette.length];

  const displayAvatar = browseEntry ? browseEntry.avatar : node.avatar || scene.avatar;
  const displaySceneTitle = browseEntry ? browseEntry.sceneTitle : scene.title;
  const displaySceneSubtitle = browseEntry ? browseEntry.sceneSubtitle : scene.subtitle;
  const displayNpcEn = browseEntry ? browseEntry.npcEn : node.npcLine.en;
  const displayNpcZh = browseEntry ? browseEntry.npcZh : node.npcLine.zh;

  return (
    <View style={styles.container}>
      {/* 常驻 HUD：心数/连胜/等级不随内容滚动，随时可见——原来这三样混在滚动区里，
          往下翻答题就看不到自己还剩几颗心了。头部标题栏隐藏之后这行成了屏幕最
          上面的内容，额外叠上顶部安全区高度，不然会顶到状态栏/刘海底下去。 */}
      <View style={[styles.hud, { paddingTop: insets.top + theme.spacing.sm }]}>
        {/* 退出键：游戏页是从首页场景列表点进来的独立全屏页，不在底部 tab 栏里，
            得自己给一个显式的返回入口——放最左上角，跟多邻国关卡页的 ✕ 一个位置。 */}
        <Pressable style={styles.exitBtn} hitSlop={8} onPress={exitToHome}>
          <SymbolView
            name={{ ios: "xmark", android: "close", web: "close" }}
            tintColor={theme.colors.textMuted}
            size={20}
          />
        </Pressable>
        <View style={styles.hudMiddle}>
          <View style={styles.hudFlame}>
            <Text style={styles.hudFlameEmoji}>🔥</Text>
            <Text style={styles.hudFlameCount}>{state.streak || 0}</Text>
            {state.streakFreezes > 0 ? (
              <Text style={styles.hudFreezeCount}>🧊{state.streakFreezes}</Text>
            ) : null}
          </View>
          <View style={[styles.hudLevelPill, { borderColor: scenePalette.tint, backgroundColor: scenePalette.bg }]}>
            <Text style={[styles.hudLevelText, { color: scenePalette.tint }]}>{level.level}</Text>
          </View>
          {/* 玩家等级：跟上面的 CEFR 徽章是两套系统（见 lib/game/progress.ts 顶部
              注释）——这个升得飞快，常驻在 HUD 里才能一直被看到"又升级了"。 */}
          <View style={styles.hudPlayerLevelPill}>
            <Text style={styles.hudPlayerLevelText}>⭐ Lv.{playerLevel.level}</Text>
          </View>
          <HeartsRow hearts={hearts} max={MAX_HEARTS} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: barBottom + 92 }]}>
        {!checkedInToday ? (
          <StreakBanner
            text={`🔥 ${state.streak || 0}-day streak · Answer one right today to keep it going!`}
          />
        ) : null}

        {/* 玩家等级条：升级很快，条经常填满又清零重来，配上一直在滚动的总分
            数字（useLiveCounter）——"分数一直在涨、条一直在满"是这个条专门要
            制造的爽感，跟下面 CEFR 那条"很久很久才涨一点"的节奏刻意拉开。 */}
        <AnimatedProgressBar
          pct={playerLevel.pct}
          height={12}
          gradient={[theme.colors.goldDeep, theme.colors.gold, "#ffd873", theme.colors.gold]}
          trackColor={theme.colors.surfaceDeep}
          glow
        />
        <Text style={styles.playerLevelLabel}>
          ⭐ Lv.{playerLevel.level} · {displayedTotalXp} XP · {playerLevel.xpForNext - playerLevel.xpIntoLevel}{" "}
          to next level
        </Text>

        <CefrLevelBar pct={level.globalPct} height={12} />
        <Text style={styles.levelLabel}>
          {level.level} · {levelTitle(level.level)} · {level.wordCount}/{level.target} mastered · {vocabStats.encountered} seen
        </Text>

        <View style={[styles.sceneCard, { backgroundColor: scenePalette.bg }]}>
          <View style={styles.sceneHead}>
            <BreathingAvatar style={[styles.avatar, { borderColor: scenePalette.tint }]}>
              {displayAvatar}
            </BreathingAvatar>
            <View style={styles.flex1}>
              <WordText
                text={displaySceneTitle}
                style={styles.sceneTitle}
                activeWord={activeWord}
                onWordPress={() => {}}
                onWordLongPress={handleWordPress}
              />
              {browsing ? (
                <WordText
                  text={displaySceneSubtitle}
                  style={styles.sceneSubtitle}
                  activeWord={activeWord}
                  onWordPress={() => {}}
                  onWordLongPress={handleWordPress}
                />
              ) : null}
            </View>
          </View>

          <View style={styles.dialogueBubble}>
            {/* 点这句台词的任何地方（包括点在单词上）都重新播放这句发音——
                onSelect 就是干这个的：WordText 内部每个词的单击本来是"选中"
                语义，这里没有"选项"要选，借用同一个 hook 把单击转发成"重播"，
                跟外层 Pressable 的 onPress 做同一件事，点在词缝/标点上也一样
                能重播。长按单词才是查释义，两个手势不冲突。 */}
            <Pressable onPress={() => void playLine(displayNpcEn)}>
              <WordText
                text={displayNpcEn}
                style={styles.npcEn}
                activeWord={activeWord}
                onWordPress={() => {}}
                onWordLongPress={(w, e) => handleWordPress(w, e, displayNpcEn, displayNpcZh)}
                onSelect={() => void playLine(displayNpcEn)}
              />
            </Pressable>
            {/* 中文翻译改成浮动在对话框上方，不再挤进 dialogueBubble 的正常文档
                流——原来显示/隐藏中文时，气泡本身跟着变高/变矮，下面的选项按钮/
                翻页条会跟着跳一下位置。改成 position:absolute 悬浮在气泡顶边
                之上，出现/消失都不影响气泡自身高度，也就不会带着下面内容挪位置。 */}
            {zhVisible || browsing ? (
              <View style={styles.npcZhFloat} pointerEvents="none">
                <Text style={styles.npcZhFloatText}>{displayNpcZh}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {browsing && browseEntry ? (
          // 回看模式只读：只展示当时选对的那句，禁用点击，不能重新作答
          // （PORTED from main.js renderHistoryView()）。
          <View style={styles.choices}>
            <ChoiceButton
              label={browseEntry.answerEn}
              state="correct"
              disabled
              onPress={() => {}}
              activeWord={activeWord}
              onWordLongPress={(w, e) => handleWordPress(w, e, browseEntry.answerEn, browseEntry.answerZh)}
              zh={browseEntry.answerZh}
            />
          </View>
        ) : heartGated ? (
          <View style={styles.heartGate}>
            <Text style={styles.heartGateMsg}>
              💔 Out of hearts — review something you've learned to earn one back before continuing.
            </Text>
            <PrimaryButton label="🎬 Start Review" onPress={startHeartRecoveryFlashback} />
          </View>
        ) : (
          <View style={styles.choices}>
            {choiceOrder.map((idx) => {
              const choice = displayChoices[idx];
              const isDisabled = disabled.has(idx) || busy;
              return (
                <ChoiceButton
                  key={idx}
                  label={choice.text}
                  state={choiceState(idx)}
                  disabled={isDisabled}
                  onPress={() => void onPressChoice(idx)}
                  activeWord={activeWord}
                  onWordLongPress={(w, e) => handleWordPress(w, e, choice.text, choice.zh ?? node.npcLine.zh)}
                />
              );
            })}
          </View>
        )}

        {/* 翻页导航 + 场景进度条合并成一行：翻页箭头之前是两个文字按钮，存在感
            比"当前进度"这条信息还强，喧宾夺主——弱化成左右两个小箭头图标，中间
            让给场景进度条，一行占地，视觉上也更轻。始终显示，跟网页版一样——
            左箭头只要历史不为空就能点，右箭头只在回看中才可点（PORTED from
            main.js updateHistoryNavUI）。外侧再各加一个"上一场/下一场"，一次跳
            整段场景而不是一句一句翻，方便直接跳回去重新学某一整场。 */}
        {browsing ? (
          <Text style={styles.historyBanner}>🕰 Review Mode · Something you already got right</Text>
        ) : null}
        <View style={styles.historyNav}>
          <Pressable
            style={[styles.historyNavChip, prevSceneDisabled && styles.historyNavChipDisabled]}
            hitSlop={6}
            disabled={prevSceneDisabled}
            onPress={goToPrevScene}>
            <NavArrowIcon
              direction="left"
              withBar
              color={prevSceneDisabled ? theme.colors.textMuted : theme.colors.accent}
              size={NAV_ICON_SIZE}
            />
          </Pressable>
          <Pressable
            style={[styles.historyNavChip, prevHistoryDisabled && styles.historyNavChipDisabled]}
            hitSlop={6}
            disabled={prevHistoryDisabled}
            onPress={goToPrevHistory}>
            <NavArrowIcon
              direction="left"
              color={prevHistoryDisabled ? theme.colors.textMuted : theme.colors.accent}
              size={NAV_ICON_SIZE}
            />
          </Pressable>
          <View style={styles.sceneProgressTrack}>
            <AnimatedProgressBar
              pct={Math.min(100, Math.round(((state.sceneIndex + 1) / content.scenes.length) * 100))}
              height={6}
              trackColor={theme.colors.surfaceDeep}
            />
          </View>
          <Pressable
            style={[styles.historyNavChip, nextHistoryDisabled && styles.historyNavChipDisabled]}
            hitSlop={6}
            disabled={nextHistoryDisabled}
            onPress={goToNextHistory}>
            <NavArrowIcon
              direction="right"
              color={nextHistoryDisabled ? theme.colors.textMuted : theme.colors.accent}
              size={NAV_ICON_SIZE}
            />
          </Pressable>
          <Pressable
            style={[styles.historyNavChip, nextSceneDisabled && styles.historyNavChipDisabled]}
            hitSlop={6}
            disabled={nextSceneDisabled}
            onPress={goToNextScene}>
            <NavArrowIcon
              direction="right"
              withBar
              color={nextSceneDisabled ? theme.colors.textMuted : theme.colors.accent}
              size={NAV_ICON_SIZE}
            />
          </Pressable>
        </View>
        <Text style={styles.sceneProgressLabel}>
          Scene {state.sceneIndex + 1} / {content.scenes.length}
        </Text>

        {hint && !browsing ? <Text style={styles.hint}>💡 {hint}</Text> : null}
      </ScrollView>

      {/* 连击徽章悬浮在问题页右上角（HUD 行下方）——不占文档流，
          一出现/消失不会带着滚动内容跳一下。 */}
      {combo >= 2 ? (
        <View style={[styles.comboFloat, { top: insets.top + theme.spacing.sm + 40 }]} pointerEvents="none">
          <ComboBadge combo={combo} />
        </View>
      ) : null}

      {/* 长按查词的新手提示：这个手势不够显眼，纯靠自己摸索基本发现不了——没用过
          就一直提示（不是弹一次就收手，见 GameContext 的 hasUsedWordLongPress
          注释），真正长按查过一次词之后才永久收起。改成悬浮条幅而不是塞进滚动
          内容里，是因为它出现/消失不该带着选项按钮的位置跟着跳。 */}
      {!hasUsedWordLongPress ? (
        <View style={[styles.longPressHintFloat, { bottom: barBottom + 84 }]} pointerEvents="none">
          <Text style={styles.longPressHintText}>💡 长按单词可以查看释义</Text>
        </View>
      ) : null}

      {xpToast ? (
        <XpToast
          key={xpToast.key}
          label={xpToast.label}
          tone={xpToast.tone}
          onFinished={() => setXpToast(null)}
        />
      ) : null}

      {confettiKey ? (
        <ConfettiBurst key={confettiKey} onFinished={() => setConfettiKey(null)} />
      ) : null}

      {levelUp ? <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} /> : null}

      {flawlessBadge ? <FlawlessBadge onDone={() => setFlawlessBadge(null)} /> : null}

      {wordPopup ? (
        <WordPopup
          key={wordPopup.key}
          word={wordPopup.word}
          meaning={wordPopup.meaning}
          anchorY={wordPopup.anchorY}
          onDone={() => {
            setWordPopup(null);
            setActiveWord(null);
          }}
        />
      ) : null}

      {achievementQueue.length > 0 ? (
        <AchievementToast
          key={achievementQueue[0].id}
          achievement={achievementQueue[0]}
          onDone={() => setAchievementQueue((prev) => prev.slice(1))}
        />
      ) : null}

      {flashback ? (
        <FlashbackOverlay session={flashback} content={content} onAnswer={onFlashbackAnswer} />
      ) : null}

      {transitionCard ? (
        <Modal transparent animationType="fade" visible statusBarTranslucent>
          <View style={styles.transitionBackdrop}>
            <TransitionCard transitionCard={transitionCard} onContinue={dismissTransition} />
          </View>
        </Modal>
      ) : null}

      {/* 答对之后不再自动翻页（见 GameContext 的 awaitingAdvance）——玩家自己点
          "继续"才往下走，剧情不会哗一下就切过去。常驻占位条，不是临时弹出层——
          没答对时是灰色占位态，答对之后（延迟 ANSWER_POPUP_DELAY_MS 才变成可点，
          见 showAdvancePopup 的 effect，为的是不跟答对的音效/震动/XP飘字抢时间）
          才变成可点、显示中文翻译。回看模式下这题不需要"继续"，永远是占位态。 */}
      <ContinueBar
        active={showAdvancePopup && awaitingAdvance && !browsing && pickedIdx !== null}
        zh={pickedIdx !== null ? (displayChoices[pickedIdx]?.zh || node.npcLine.zh || node.npcLine.en) : ""}
        peeking={peek}
        bottom={barBottom}
        onPress={confirmAdvance}
        onPeekIn={peekZhIn}
        onPeekOut={peekZhOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  flex1: { flex: 1 },
  // 跟 _layout.tsx 里"头部/内容/tab 栏统一同一个底色、不靠硬分割线分层"的原则
  // 保持一致——这里之前用了跟头部不同的 surface 白底 + 一条实线，正好把页面
  // 切成了"头部"和"HUD"两块看得出接缝的色块，改成跟头部同色、去掉分割线，
  // 三个胶囊本身的描边/底色就够把它们从背景里区分出来了。
  hud: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  exitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  hudMiddle: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hudFlame: { flexDirection: "row", alignItems: "center", gap: 4 },
  hudFlameEmoji: { fontSize: 18 },
  hudFlameCount: { fontSize: 15, fontWeight: "800", color: theme.colors.goldDeep },
  hudFreezeCount: { fontSize: 13, fontWeight: "800", color: theme.skillPalette[1], marginLeft: 2 },
  // bottom 挪到常驻的"继续"占位条（advanceFixedBtn，贴在 bottom:24）上方，
  // 不然两个都固定在差不多的高度会叠在一起。
  comboFloat: {
    position: "absolute",
    right: theme.spacing.md,
    alignItems: "flex-end",
    zIndex: 15,
  },
  hudLevelPill: {
    borderWidth: 1.5,
    borderRadius: theme.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  hudLevelText: { fontSize: 13, fontWeight: "800" },
  hudPlayerLevelPill: {
    borderWidth: 1.5,
    borderColor: theme.colors.gold,
    borderRadius: theme.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.goldSoft,
  },
  hudPlayerLevelText: { fontSize: 13, fontWeight: "800", color: theme.colors.goldDeep },
  sceneProgressLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  playerLevelLabel: {
    fontSize: 13,
    color: theme.colors.goldDeep,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  levelLabel: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4, marginBottom: theme.spacing.md },
  // 场景卡：整块场景（头像+标题+对话）套进一张按 sceneIndex 换色的卡片里，
  // 才有"进入了一个新场景"的画面感，而不是文字元素零散地摆在同一块米色背景上。
  sceneCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sceneHead: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  avatar: {
    fontSize: 32,
    width: 56,
    height: 56,
    lineHeight: 56,
    textAlign: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 2,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  sceneTitle: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
  sceneSubtitle: { fontSize: 15, color: theme.colors.textMuted },
  dialogueBubble: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.card,
  },
  npcEn: { fontSize: 22, fontWeight: "600", color: theme.colors.text, lineHeight: 30 },
  // 浮在对话框上方的中文翻译——跟气泡顶边隔一点空隙，深底白字保证盖在上面
  // 内容（场景标题/头像）上时依然看得清楚，不是靠对方的浅色背景硬撑对比度。
  npcZhFloat: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    marginBottom: theme.spacing.xs + 40,
    backgroundColor: theme.colors.text,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 12,
    ...theme.shadow.float,
  },
  npcZhFloatText: { fontSize: 18, lineHeight: 24, color: theme.colors.surface, fontWeight: "600", textAlign: "center" },
  heartGate: { alignItems: "center", gap: theme.spacing.sm, paddingVertical: theme.spacing.lg },
  heartGateMsg: { textAlign: "center", color: theme.colors.text, fontSize: 16 },
  // bottom 在渲染处按 barBottom 动态算（贴在常驻"继续"占位条上方），
  // 不然两个都固定在差不多的高度会叠在一起。
  longPressHintFloat: {
    position: "absolute",
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    alignItems: "center",
    zIndex: 15,
  },
  longPressHintText: {
    textAlign: "center",
    color: theme.colors.surface,
    backgroundColor: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
    ...theme.shadow.float,
  },
  choices: { gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  hint: { color: theme.colors.wrong, fontSize: 15, marginBottom: theme.spacing.sm, fontWeight: "600" },
  historyBanner: {
    textAlign: "center",
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: theme.spacing.xs,
  },
  historyNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  // 翻页图标之前是裸图标直接摆在米色背景上——没有底色/边框托着，单看这四个
  // 符号本身太单薄，跟全app其它按钮（哪怕是小徽章）比都显得没分量。改成套一个
  // 圆形浅色底：跟 hudLevelPill 那些胶囊徽章同一个描边+浅底思路，图标本身则用
  // theme.colors.accent（跟按钮/HUD 里同一个绿）而不是纯黑，色调上才跟得上
  // 全app的基调；圆形直径维持原来 44pt 的点击区大小，不额外收缩。
  historyNavChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  historyNavChipDisabled: { opacity: 0.45 },
  sceneProgressTrack: { flex: 1 },
  endMedal: { fontSize: 56 },
  endTitle: { fontSize: 28, fontWeight: "800", color: theme.colors.text },
  endBody: { fontSize: 17, color: theme.colors.text, textAlign: "center", lineHeight: 24 },
  // 结算数字用四宫格卡片而不是一行文字，是想让"滚动播放的数字"每个都有自己的
  // 呼吸空间——挤在一行里数字变大后容易挤在一起，卡片天然分隔，也方便给
  // 连击/连胜保护这两个"加分项"套上金色/紫色的专属描边，跟经验值/词汇这两个
  // "基础统计"区分开。
  endStatGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, justifyContent: "center" },
  endStatCard: {
    width: 130,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    ...theme.shadow.card,
  },
  endStatValue: { fontSize: 26, fontWeight: "800", color: theme.colors.accent },
  endStatLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "600", marginTop: 2 },
  // 弹出卡片（章节过场/答对确认）居中显示，卡片本身再往下偏移 30，避免
  // 死贴在屏幕正中间。
  transitionBackdrop: {
    flex: 1,
    backgroundColor: "rgba(43,36,32,0.6)",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  transitionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginTop: 30,
    ...theme.shadow.float,
  },
  transitionEn: { fontSize: 21, fontWeight: "700", color: theme.colors.text },
  // 固定悬浮在屏幕最下方、贴着底部标签栏图标上方——不设背景遮罩，跟
  // comboFloat 是同一套"固定位置悬浮元素"的思路。
  // bottom 不在这里写死——由 GameScreen 按底部安全区算出来（见 barBottom），
  // 不然安卓 edge-to-edge 下会被系统导航栏盖住。
  advanceFixedBtn: {
    position: "absolute",
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 16,
  },
});
