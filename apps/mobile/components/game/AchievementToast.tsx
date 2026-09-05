// 成就解锁提示：跟 FlawlessBadge 一样是不挡内容的悬浮条幅，但份量更重一点
// （图标+标题+描述两行文字，停留更久）——解锁成就是"永久记录"级别的里程碑，
// 比一次性的 XP/连击提示更值得多看一眼，但还没到 LevelUpOverlay 那种要专门
// 用整屏遮罩打断玩家的程度。
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import type { AchievementDef } from "@/lib/game/achievements";
import { theme } from "@/lib/theme";

export function AchievementToast({ achievement, onDone }: { achievement: AchievementDef; onDone: () => void }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-24);
  const scale = useSharedValue(0.7);
  const iconScale = useSharedValue(0.5);

  useEffect(() => {
    // 同一个 shared value 不能分两次同步赋值（第二次会直接顶掉第一次，淡入动画
    // 连一帧都跑不到）——必须用 withSequence 把"淡入 → 停留 → 淡出"合成一次赋值。
    translateY.value = withSpring(0, { damping: 10, stiffness: 200 });
    scale.value = withSequence(
      withSpring(1.06, { damping: 8, stiffness: 220 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    // 图标单独错开一点点再弹，比整个条幅同时一起动更有"层次"，像是奖杯先蹦
    // 出来打了个招呼，后面的文字才跟上。
    iconScale.value = withDelay(80, withSpring(1, { damping: 6, stiffness: 260 }));
    opacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(
        2000,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished) runOnJS(onDone)();
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时播一次
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  return (
    <Animated.View style={[styles.wrap, style]} pointerEvents="none">
      <Animated.Text style={[styles.icon, iconStyle]}>{achievement.icon}</Animated.Text>
      <View style={styles.textCol}>
        <Text style={styles.label}>🏆 成就解锁</Text>
        <Text style={styles.title}>{achievement.title}</Text>
        <Text style={styles.desc}>{achievement.desc}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 100,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.text,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    zIndex: 25,
    ...theme.shadow.float,
  },
  icon: {
    fontSize: 30,
    width: 44,
    height: 44,
    lineHeight: 44,
    textAlign: "center",
    backgroundColor: theme.colors.goldSoft,
    borderRadius: 22,
  },
  textCol: { flex: 1 },
  label: { color: theme.colors.gold, fontSize: 11, fontWeight: "800" },
  title: { color: theme.colors.surface, fontSize: 16, fontWeight: "800" },
  desc: { color: theme.colors.surface, fontSize: 12, opacity: 0.8, marginTop: 1 },
});
