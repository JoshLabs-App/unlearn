// 飘字提示：从原来"瞬间出现/消失的方框"换成"飘字上升+缩放+淡出"，照抄网页版
// style.css 的 xp-rise / xp-rise-bonus keyframe（gold 版本额外放大+发光，一眼能
// 看出"这次不一样"，网页版注释也这么说——不能做得太克制）。
// 泛化成接受任意 label 文本（原来只认 amount/isBonus），这样 XP 飘字、连击奖励、
// 连胜保护获得/消耗几种事件能共用同一套动画和视觉语言，不用每种事件各写一个
// 组件——调用方（index.tsx）负责把具体文案拼好传进来。
//
// gold 版本（连击破纪录/连胜保护/大奖励）不再是缩小版的小角标——这类"大事发生了"
// 的时刻在大多数游戏里都会占屏幕更大比例、停留更久，改成居中大字 + 一圈扩散光晕，
// 分量上跟 accent 版（日常 +XP，还是小角标）拉开差距。
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { theme } from "@/lib/theme";

interface Props {
  label: string;
  tone?: "accent" | "gold";
  onFinished: () => void;
}

export function XpToast({ label, tone = "accent", onFinished }: Props) {
  const isGold = tone === "gold";
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isGold ? 0.4 : 1);
  const opacity = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const rotate = useSharedValue(isGold ? -4 : 0);

  useEffect(() => {
    // 同一个 shared value 不能分两次同步赋值（第二次会直接顶掉第一次，淡入动画
    // 连一帧都跑不到）——必须用 withSequence 把"淡入 → 停留 → 淡出"合成一次赋值，
    // 不能像之前那样先赋一次 withTiming(1) 再单独赋一次 withDelay(...)。
    if (isGold) {
      translateY.value = withSequence(
        withSpring(-16, { damping: 8, stiffness: 200 }),
        withDelay(1050, withTiming(-70, { duration: 350, easing: Easing.in(Easing.cubic) })),
      );
      scale.value = withSequence(
        withSpring(1.15, { damping: 6, stiffness: 220 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
      rotate.value = withSequence(
        withSpring(3, { damping: 5, stiffness: 260 }),
        withSpring(0, { damping: 8, stiffness: 200 }),
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(
          1250,
          withTiming(0, { duration: 350 }, (finished) => {
            if (finished) runOnJS(onFinished)();
          }),
        ),
      );
      // 光晕：一圈色块从中心往外扩散、边淡出——纯 View + scale/opacity 做的
      // "冲击波"，不需要引入额外的动效/图形库。
      ringScale.value = withTiming(2.2, { duration: 700, easing: Easing.out(Easing.quad) });
      ringOpacity.value = withSequence(
        withTiming(0.5, { duration: 100 }),
        withTiming(0, { duration: 600 }),
      );
    } else {
      translateY.value = withTiming(-40, { duration: 900, easing: Easing.out(Easing.cubic) });
      opacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withDelay(
          520,
          withTiming(0, { duration: 300 }, (finished) => {
            if (finished) runOnJS(onFinished)();
          }),
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时播一次
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  if (isGold) {
    return (
      <Animated.View style={styles.goldWrap} pointerEvents="none">
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={[styles.toastGold, style]}>
          <Text style={styles.textGold}>{label}</Text>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.toast, style]} pointerEvents="none">
      <Text style={styles.text}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 80,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    ...theme.shadow.float,
  },
  text: { color: theme.colors.surface, fontWeight: "800", fontSize: 15 },
  // 大事件版：不再是右上角小角标，挪到屏幕偏上居中，占的视觉比例大得多，
  // 停留也更久——匹配"像很多游戏那样，大动效、停留久"的要求。
  goldWrap: {
    position: "absolute",
    top: "22%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 35,
  },
  ring: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.gold,
  },
  toastGold: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 26,
    ...theme.shadow.float,
  },
  textGold: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.surface,
    textAlign: "center",
  },
});
