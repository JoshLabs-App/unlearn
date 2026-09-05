// 答题选项按钮：按下有弹簧缩放反馈 + 轻震动，答错时左右震动（照抄网页版 style.css
// 的 .choice-btn.shake keyframe：-6px/5px/-4px/3px/0），答对有专属高亮样式（网页版
// 有 .choice-btn.correct，移动端之前只有"答错"样式，答对是直接瞬间禁用，没反馈）。
//
// 曾经试过在底部加一条"厚度边"模拟实体键按下的立体感，但那条边跟按钮本身的描边
// 颜色太接近、又紧挨着别的横线（章节进度线、"显示中文"下划线），挤在一起反而
// 显得像多余的杂线，不像故意设计的厚度——去掉，改回纯靠 press 时的整体缩放 +
// 柔和投影来给反馈，够干净。
import { useEffect } from "react";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, type GestureResponderEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { WordText } from "@/components/game/WordText";
import { theme } from "@/lib/theme";

export type ChoiceState = "idle" | "correct" | "wrong";

interface Props {
  label: string;
  state: ChoiceState;
  disabled: boolean;
  onPress: () => void;
  // 长按选项里的单词查释义（点译词典 + 收藏），不给就是纯文本按钮，行为
  // 跟以前一样——单击永远是"选这个选项"，两个手势不冲突。事件一起转发出去，
  // 释义气泡要跟着长按的位置浮动定位。
  onWordLongPress?: (word: string, event: GestureResponderEvent) => void;
  activeWord?: string | null;
  // 答对后要在绿色按钮里补一行中文答案——只在 state === "correct" 时渲染，
  // 调用方如果这个态不代表"真的答对"（比如闪回选择题点了就先亮绿，对错
  // 要等发音播完才知道），就别传这个 prop，不然会在还没判定对错时抢先剧透。
  zh?: string;
}

export function ChoiceButton({ label, state, disabled, onPress, onWordLongPress, activeWord, zh }: Props) {
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (state === "wrong") {
      shakeX.value = withSequence(
        withTiming(-6, { duration: 45 }),
        withTiming(5, { duration: 45 }),
        withTiming(-4, { duration: 45 }),
        withTiming(3, { duration: 45 }),
        withTiming(0, { duration: 45 }),
      );
    } else if (state === "correct") {
      scale.value = withSequence(withTiming(1.03, { duration: 120 }), withSpring(1, { damping: 8 }));
    }
  }, [state, shakeX, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shakeX.value }],
  }));

  function handlePressIn() {
    if (disabled) return;
    scale.value = withSpring(0.96, { damping: 14, stiffness: 320 });
  }
  function handlePressOut() {
    if (state === "correct") return; // 让答对那下的弹跳动画自己收尾，不被 pressOut 打断
    scale.value = withSpring(1, { damping: 12, stiffness: 260 });
  }
  function handlePress() {
    if (disabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[styles.btn, state === "correct" && styles.btnCorrect, state === "wrong" && styles.btnWrong]}>
        {onWordLongPress ? (
          <WordText
            text={label}
            style={[
              styles.text,
              state === "correct" && styles.textCorrect,
              state === "wrong" && styles.textWrong,
            ]}
            activeWord={activeWord}
            onWordPress={() => {}}
            onWordLongPress={onWordLongPress}
            onSelect={handlePress}
          />
        ) : (
          <Text
            style={[
              styles.text,
              state === "correct" && styles.textCorrect,
              state === "wrong" && styles.textWrong,
            ]}>
            {label}
          </Text>
        )}
        {state === "correct" && zh ? <Text style={styles.textZh}>{zh}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  btnCorrect: { borderColor: theme.colors.correct, backgroundColor: theme.colors.correctSoft },
  btnWrong: { borderColor: theme.colors.wrong, backgroundColor: theme.colors.wrongSoft },
  text: { fontSize: 19, color: theme.colors.text, fontWeight: "700", textAlign: "center" },
  textCorrect: { color: theme.colors.correct },
  textWrong: { color: theme.colors.wrong },
  textZh: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.correctDeep,
    textAlign: "center",
    marginTop: 4,
  },
});
