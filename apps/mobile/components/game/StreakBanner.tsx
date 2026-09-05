// 连续打卡横幅：网页版 style.css 的 .streak-banner 有呼吸光晕（streak-banner-pulse：
// box-shadow 0→8px 再变透明的 2s 循环），移动端 Phase 1 完全没搬这个组件——现在补上，
// RN 没有可动画的 box-shadow spread，改用一层同色半透明的"光晕环" View 做缩放+淡出
// 循环来模拟同样的呼吸效果。
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { theme } from "@/lib/theme";

export function StreakBanner({ text }: { text: string }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })),
      -1,
    );
  }, [pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.45 - pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.06 }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <View style={styles.banner}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.md },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
  },
  banner: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadow.card,
  },
  text: { color: theme.colors.surface, fontWeight: "800", fontSize: 15, textAlign: "center" },
});
