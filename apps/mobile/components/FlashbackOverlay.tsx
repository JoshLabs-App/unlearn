// 回忆闪回复习弹层。两种出题模式跟 a-decade-apart/main.js 的
// renderFlashbackChoices / renderFlashbackBuild 对应：
// - active 阶段（第一次见到/之前答错过）→ 选择题，门槛低
// - pendingFinal 阶段（短期已连对2次，等长间隔做最终确认）→ 拼词，逼玩家真正拼出整句
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { ChoiceButton, type ChoiceState } from "@/components/game/ChoiceButton";
import { XpToast } from "@/components/game/XpToast";
import type { FlashbackSession } from "@/contexts/GameContext";
import { playLine, playWord } from "@/lib/game/audio";
import { WORD_DICT } from "@/lib/game/dictionary";
import { buildFlashbackChoiceOptions, shouldUseBuildMode } from "@/lib/game/review";
import type { GameContent, ReviewItem } from "@/lib/game/types";
import { theme } from "@/lib/theme";

// 单词条目走单词发音表（word-audio-manifest），整句条目走整句配音表——两张表
// key 的粒度不一样，item.en 是单个词时用 playLine 大概率查不到对应音频，只能
// 静音，所以要按 item.kind 分流，不能一律用 playLine。返回 Promise 而不是
// fire-and-forget：调用方要等发音真的放完，才播效果音、弹积分特效、提交答案——
// 不然效果音会跟发音撞在一起响，听不清哪个是哪个。
function playItemAudio(item: ReviewItem): Promise<void> {
  return item.kind === "word" ? playWord(item.en) : playLine(item.en);
}

interface Props {
  session: FlashbackSession;
  content: GameContent;
  onAnswer: (answerEn: string) => void;
}

export function FlashbackOverlay({ session, content, onAnswer }: Props) {
  const item = session.queue[0];
  const useBuild = shouldUseBuildMode(item);
  const answered = !!session.feedback;

  // 答对的积分特效：跟主线共用同一个 XpToast 组件——这个弹层是原生 Modal，会盖在
  // 包括 XpToast 在内的其他内容之上，所以不能像主线那样把它挂在 index.tsx 里，
  // 得渲染在 Modal 内部。session.feedback 每答一题都是个新对象，用 ref 记上一次
  // 处理过的引用，避免同一次答对在重渲染时被误判成"又答对了一次"重复弹一遍。
  const prevFeedbackRef = useRef<FlashbackSession["feedback"]>(null);
  const [xpToast, setXpToast] = useState<{ key: number; xp: number } | null>(null);
  useEffect(() => {
    if (session.feedback && session.feedback !== prevFeedbackRef.current && session.feedback.correct) {
      setXpToast({ key: Date.now(), xp: session.feedback.xpAwarded });
    }
    prevFeedbackRef.current = session.feedback;
  }, [session.feedback]);

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.label}>{session.label}</Text>

          {/* 有存问题原文的条目（PORTED 逻辑见 review.ts 的 addWrongAnswerToReview）
              先把 NPC 当时说的那句话摆出来——不然复习感觉像在背一句脱离场景的
              孤立例句，而不是"这道题又出现了一次"。旧存档里没存这两个字段的
              条目会跳过这一块，直接退回原来的样子。 */}
          {item.npcEn ? (
            <View style={styles.npcPrompt}>
              <Text style={styles.npcPromptEn}>{item.npcEn}</Text>
              {item.npcZh ? <Text style={styles.npcPromptZh}>{item.npcZh}</Text> : null}
            </View>
          ) : null}

          <Text style={styles.zh}>{item.zh}</Text>

          {useBuild ? (
            <BuildAnswer item={item} answered={answered} onSubmit={onAnswer} />
          ) : (
            <ChoiceAnswer item={item} content={content} answered={answered} onSubmit={onAnswer} />
          )}

          {/* 反馈文字之前答完才渲染出来，卡片本身跟着变高——Modal 是居中弹出的，
              卡片一变高就要重新居中，整张卡带着刚点完的选项一起在屏幕上挪位置，
              很晃眼。改成反馈这一行永远占位（没答的时候是空文本），卡片高度
              从头到尾不变，就不会跳了。 */}
          <Text
            style={[
              styles.feedback,
              session.feedback?.correct && styles.feedbackCorrect,
              session.feedback && !session.feedback.correct && styles.feedbackWrong,
            ]}>
            {session.feedback
              ? session.feedback.correct
                ? session.feedback.heartGained
                  ? `✅ Got it! +${session.feedback.xpAwarded} XP · +1 heart ❤️`
                  : `✅ Got it! +${session.feedback.xpAwarded} XP`
                : `❌ Correct answer: ${session.feedback.answerEn}`
              : " "}
          </Text>
        </View>

        {xpToast ? (
          <XpToast
            key={xpToast.key}
            label={`+${xpToast.xp} XP`}
            onFinished={() => setXpToast(null)}
          />
        ) : null}
      </View>
    </Modal>
  );
}

// 单词条目的干扰项池：整本词典的词（见 review.ts 的 buildFlashbackChoiceOptions）
const WORD_POOL = Object.keys(WORD_DICT);

function ChoiceAnswer({
  item,
  content,
  answered,
  onSubmit,
}: {
  item: ReviewItem;
  content: GameContent;
  answered: boolean;
  onSubmit: (answerEn: string) => void;
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- regenerate distractors only per item
  const options = useMemo(() => buildFlashbackChoiceOptions(item, content, WORD_POOL), [item.en]);
  const [picked, setPicked] = useState<string | null>(null);
  // 发音播完之前先锁住，防止等待期间又点别的选项——同一题只提交一次。
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPicked(null);
    setSubmitting(false);
  }, [item.en]);

  async function handlePick(text: string) {
    if (answered || submitting) return;
    setPicked(text);
    setSubmitting(true);
    // PORTED from main.js renderFlashbackChoices()：不管选没选对都放正确答案
    // （item.en）的读音，不是点到的那个选项——复习看的是记没记住这个词/句怎么
    // 读，不是靠点错了就听不到正确发音。等发音真的放完才提交答案，效果音/积分
    // 特效/答案反馈才不会跟发音撞在一起。
    await playItemAudio(item);
    onSubmit(text);
  }

  return (
    <View style={styles.choices}>
      {options.map((text) => {
        const isPicked = picked === text;
        // 跟主线选项按钮共用同一个 ChoiceButton——按下缩放反馈、答对弹一下、
        // 答错左右震动，这些动效原来只有主线答题有，记忆卡这边之前是纯静态
        // Pressable，点了跟没点感觉差不多。
        //
        // 点中的选项要立刻变绿，不能等到 answered（发音放完才会置真）才亮——
        // 跟网页版 renderFlashbackChoices 一致：颜色不是用来提示对错的，只是
        // "我点了这个"的即时反馈，得跟发音同时发生。等真的 answered 了，
        // 再切换成"正确答案是哪个/我点的这个错了"的最终配色。
        const state: ChoiceState = !answered
          ? isPicked
            ? "correct"
            : "idle"
          : text === item.en
            ? "correct"
            : isPicked
              ? "wrong"
              : "idle";
        return (
          <ChoiceButton
            key={text}
            label={text}
            state={state}
            disabled={answered || submitting}
            onPress={() => void handlePick(text)}
          />
        );
      })}
    </View>
  );
}

// 拼词模式的词块——按下缩一下、放开弹回来，跟 ChoiceButton 同一个"实体按键"手感，
// 之前是纯静态 Pressable，点了跟没点视觉上没差别。
function Chip({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePressIn() {
    if (disabled) return;
    scale.value = withSpring(0.9, { damping: 14, stiffness: 320 });
  }
  function handlePressOut() {
    scale.value = withSpring(1, { damping: 11, stiffness: 260 });
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.chip}>
        <Text style={styles.chipText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function BuildAnswer({
  item,
  answered,
  onSubmit,
}: {
  item: ReviewItem;
  answered: boolean;
  onSubmit: (answerEn: string) => void;
}) {
  const words = useMemo(() => item.en.split(" "), [item.en]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reshuffle only per item
  const bankOrder = useMemo(() => words.map((_, i) => i).sort(() => Math.random() - 0.5), [item.en]);
  const [placed, setPlaced] = useState<number[]>([]);
  // 发音播完之前先锁住，防止等待期间又拆词重拼——同一题只提交一次。
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPlaced([]);
    setSubmitting(false);
  }, [item.en]);

  async function place(i: number) {
    if (answered || submitting) return;
    const next = [...placed, i];
    setPlaced(next);
    if (next.length === words.length) {
      setSubmitting(true);
      // PORTED from main.js renderFlashbackBuild()/checkBuild()：拼完就放正确
      // 答案的读音，跟选择题模式一致，不管拼没拼对。等发音真的放完才提交答案，
      // 效果音/积分特效/答案反馈才不会跟发音撞在一起。
      await playItemAudio(item);
      onSubmit(next.map((idx) => words[idx]).join(" "));
    }
  }

  function unplace(i: number) {
    if (answered || submitting) return;
    setPlaced(placed.filter((x) => x !== i));
  }

  return (
    <View>
      <View style={[styles.chipRow, styles.answerRow]}>
        {placed.map((i) => (
          <Chip key={i} label={words[i]} disabled={answered || submitting} onPress={() => unplace(i)} />
        ))}
      </View>
      <View style={styles.chipRow}>
        {bankOrder
          .filter((i) => !placed.includes(i))
          .map((i) => (
            <Chip key={i} label={words[i]} disabled={answered || submitting} onPress={() => void place(i)} />
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 弹层居中显示，卡片本身再往下偏移 30，避免死贴在屏幕正中间。
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(43,36,32,0.55)",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginTop: 30,
  },
  label: { fontSize: 15, fontWeight: "700", color: theme.colors.accent, marginBottom: theme.spacing.sm },
  // NPC 原话用左侧一条竖线 + 斜体，跟下面"你该怎么回答"的大字提示（.zh）拉开
  // 视觉层级——这块是"回顾当时的场景"，不是这道题真正要考的内容。
  npcPrompt: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.border,
    paddingLeft: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  npcPromptEn: { fontSize: 16, color: theme.colors.textMuted, fontStyle: "italic" },
  npcPromptZh: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  zh: { fontSize: 23, color: theme.colors.text, marginBottom: theme.spacing.md, fontWeight: "800" },
  choices: { gap: theme.spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  answerRow: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  // 拼词块换成大圆角药丸形（跟 ChoiceButton 的 pill 感一致），字也加大加粗——
  // 原来 8px 圆角 + 15px 常规字重，看着比主线答题选项朴素/呆板不少。
  chip: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    ...theme.shadow.card,
  },
  chipText: { fontSize: 18, color: theme.colors.accentDeep, fontWeight: "800" },
  feedback: { marginTop: theme.spacing.md, minHeight: 20, fontSize: 14, fontWeight: "600" },
  feedbackCorrect: { color: theme.colors.correct },
  feedbackWrong: { color: theme.colors.wrong },
});
