// "完美通关"提示：某一幕从头到尾没答错过，离开这一幕时弹一下。故意不做成
// LevelUpOverlay 那种带遮罩的全屏打断——升级是"整局游戏"级别的里程碑，配得上
// 打断玩家；完美通关是"这一幕"级别的小奖励，做成不遮挡内容、自己淡出的悬浮
// 条幅更合适，跟 XpToast/ComboBadge 一样不打断阅读节奏。
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

import { theme } from "@/lib/theme";

export function FlawlessBadge({ onDone }: { onDone: () => void }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const rotate = useSharedValue(-8);

  useEffect(() => {
    // 同一个 shared value 不能分两次同步赋值（第二次会直接顶掉第一次，淡入动画
    // 连一帧都跑不到）——必须用 withSequence 把"淡入 → 停留 → 淡出"合成一次赋值。
    scale.value = withSequence(
      withSpring(1.15, { damping: 7, stiffness: 240 }),
      withSpring(1, { damping: 11, stiffness: 200 }),
    );
    rotate.value = withSpring(0, { damping: 8, stiffness: 200 });
    opacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withDelay(
        1600,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished) runOnJS(onDone)();
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时播一次
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.wrap, style]} pointerEvents="none">
      <Text style={styles.text}>✨ Flawless · 全对通关！</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 100,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    alignItems: "center",
    zIndex: 20,
  },
  text: {
    backgroundColor: theme.colors.text,
    color: theme.colors.gold,
    fontWeight: "800",
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
  },
});
