// 每日目标达成庆祝：彩纸屑爆发。照抄网页版 style.css 的 confetti-fall 思路（纯代码
// 生成随机位置/颜色/延迟的小方块，播完自己清掉，不引入图片/Lottie 素材），只是从
// CSS keyframe 换成 Reanimated。挂在 GrowthScreen 的目标卡片上方，绝对定位铺满卡片。
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { theme } from "@/lib/theme";

const COLORS = [theme.colors.accent, theme.colors.gold, theme.colors.correct, "#a8477a", "#6a5acd"];
// 之前 22 片、放不到 1.3 秒——现在这个组件不只是"每日目标达成"一个场合用了，
// 破连击纪录/升级/解锁成就这些"大事件"也复用它，得更热闹、更久一点才配得上
// 那些时刻的分量。
const PARTICLE_COUNT = 34;

function ConfettiPiece({ index, onFinished }: { index: number; onFinished?: () => void }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  const angle = (index / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.6;
  const distance = 50 + Math.random() * 100;
  const dx = Math.cos(angle) * distance;
  const fallY = 170 + Math.random() * 130;
  const duration = 1000 + Math.random() * 600;
  const delay = Math.random() * 150;
  const color = COLORS[index % COLORS.length];
  const leftPct = 38 + Math.random() * 24;

  useEffect(() => {
    translateX.value = withDelay(delay, withTiming(dx, { duration, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(delay, withTiming(fallY, { duration, easing: Easing.in(Easing.quad) }));
    rotate.value = withDelay(delay, withTiming(500 + Math.random() * 400, { duration }));
    opacity.value = withDelay(
      delay + duration * 0.55,
      withTiming(0, { duration: duration * 0.45 }, (finished) => {
        if (finished && index === 0 && onFinished) runOnJS(onFinished)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时播一次
  }, []);

  const style = useAnimatedStyle(() => ({
    left: `${leftPct}%`,
    backgroundColor: color,
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return <Animated.View style={[styles.piece, style]} />;
}

export function ConfettiBurst({ onFinished }: { onFinished?: () => void }) {
  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <ConfettiPiece key={i} index={i} onFinished={onFinished} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "visible",
    zIndex: 20,
  },
  piece: { position: "absolute", top: 0, width: 7, height: 7, borderRadius: 2 },
});
