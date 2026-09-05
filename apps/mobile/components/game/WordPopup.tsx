// 点词查释义弹出层：PORTED from a-decade-apart/main.js showWordPopup()/.word-popup
// 样式（深色药丸气泡、白字）。网页版靠 DOM 测量把气泡精确定位在被点的词正上方，
// 这里用 anchorY（长按/点击那一下的 pageY）做同样的事——气泡浮在手指上方大约
// 两行字的距离，跟着点在哪儿走，不是固定挂在屏幕某个位置。没传 anchorY 时（目前
// 没有调用方这样用，留着兜底）退回屏幕顶部一个固定位置。
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/lib/theme";

const WORD_POPUP_MS = 2500;
// 手指点的位置到气泡（气泡底边）之间的垂直距离——两行字的高度，气泡飘在
// 手指上方一小段，既不挡住刚点的那个词，也不会离得太远看着不像"跟着点出来的"。
const ABOVE_OFFSET = 56;
const DEFAULT_TOP = 80;

interface Props {
  word: string;
  meaning: string;
  onDone: () => void;
  // 长按/点击那个词时的触摸点 Y 坐标（pageY，相对整个屏幕）——气泡定位在这个
  // 点正上方 ABOVE_OFFSET 的距离。
  anchorY?: number;
}

export function WordPopup({ word, meaning, onDone, anchorY }: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  // 气泡本身还有高度，上面算的是"底边"位置，转成 View 的 top 还要再减掉气泡
  // 大致的高度；这里用一个經驗值（含 padding/字号），不追求跟实际渲染高度
  // 像素级对齐——差个几像素看不出来，换来的是不用等一帧测量布局再定位。
  const estimatedBubbleHeight = 46;
  const top =
    anchorY != null
      ? Math.max(insets.top + 8, anchorY - ABOVE_OFFSET - estimatedBubbleHeight)
      : DEFAULT_TOP;

  useEffect(() => {
    // 同一个 shared value 不能分两次同步赋值——第二次会直接顶掉第一次（第一次的
    // 动画连一帧都还没跑），淡入效果会被淹没，最终只剩"停在 0 直到时间到"。
    // 必须用 withSequence 把"淡入 → 停留 → 淡出"合成一次赋值。
    scale.value = withSequence(
      withSpring(1.08, { damping: 8, stiffness: 260 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(
        WORD_POPUP_MS - 250 - 120,
        withTiming(0, { duration: 250 }, (finished) => {
          if (finished) runOnJS(onDone)();
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时播一次
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, { top }, style]} pointerEvents="none">
      <Text style={styles.text}>
        {word} {meaning}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    alignItems: "center",
    zIndex: 20,
  },
  text: {
    backgroundColor: theme.colors.text,
    color: theme.colors.surface,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    ...theme.shadow.float,
  },
});
