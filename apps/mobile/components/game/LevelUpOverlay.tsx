// 升级时刻：computeLevelProgress 算出的 CEFR 等级（A1→A2→B1→B2）跨过门槛时全屏轻量
// 闪现一下。这是纯粹给已有计算结果加一层反馈——网页版本来就没有这个组件，等级只是
// 安静地在进度条上变化，这里是移动端新加的"游戏时刻"。
import { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { theme } from "@/lib/theme";

interface Props {
  level: string;
  onDone: () => void;
}

export function LevelUpOverlay({ level, onDone }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const rotate = useSharedValue(-6);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 150 });
    // 升级是整局游戏级别的里程碑，弹得比其它 toast 都夸张一点——从很小猛地弹到
    // 超过目标值再回落，加一点点旋转，停留也更久，跟"随手一答对"的日常反馈
    // 拉开明显的分量差距。
    scale.value = withSequence(
      withSpring(1.25, { damping: 6, stiffness: 220 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    rotate.value = withSpring(0, { damping: 7, stiffness: 200 });
    const t = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
    }, 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时播一次
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.backdrop, backdropStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone} />
      <Animated.View style={[styles.card, cardStyle]} pointerEvents="none">
        <Text style={styles.title}>🎉 LEVEL UP!</Text>
        <Text style={styles.level}>{level}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(43,36,32,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl * 1.5,
    alignItems: "center",
    gap: theme.spacing.xs,
    ...theme.shadow.float,
  },
  title: { fontSize: 20, fontWeight: "800", color: theme.colors.gold },
  level: { fontSize: 32, fontWeight: "800", color: theme.colors.accent },
});
