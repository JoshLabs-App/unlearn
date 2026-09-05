// 连击徽章：常驻在 HUD 里（不是 toast），连对每+1 就弹一下，连击数越高颜色越"热"
// （绿→金→红），答错清零时整体缩小消失。做成常驻徽章而不是飘字，是因为连击是
// "当前状态"而不是"发生过一次的事件"——玩家应该随时能瞄一眼知道自己连了几个，
// 跟 XP 飘字（一次性通知）是两种不同性质的反馈，所以没有塞进 XpToast 里复用。
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { theme } from "@/lib/theme";

// 连击数到这几档，颜色换一次，越往后越"燃"——单纯数字上涨不够有冲击力，
// 颜色跟着升温才有"越来越猛"的感觉。
function comboColor(combo: number): { bg: string; fg: string } {
  if (combo >= 8) return { bg: theme.colors.wrongSoft, fg: theme.colors.wrong };
  if (combo >= 5) return { bg: theme.colors.goldSoft, fg: theme.colors.goldDeep };
  return { bg: theme.colors.accentSoft, fg: theme.colors.accent };
}

export function ComboBadge({ combo }: { combo: number }) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (combo <= 0) return;
    // 连击数越高，这一下"炸"得越猛——不再是固定弹一下，越往后的连击视觉上
    // 也越有分量，跟颜色升温（comboColor）是同一个"越打越燃"的思路。
    const kick = combo >= 8 ? 1.35 : combo >= 5 ? 1.25 : 1.15;
    scale.value = withSequence(
      withSpring(kick, { damping: 5, stiffness: 260 }),
      withSpring(1, { damping: 6, stiffness: 200 }),
    );
    rotate.value = withSequence(
      withSpring(combo % 2 === 0 ? -6 : 6, { damping: 4, stiffness: 300 }),
      withSpring(0, { damping: 6, stiffness: 200 }),
    );
  }, [combo, scale, rotate]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  if (combo < 2) return null;

  const { bg, fg } = comboColor(combo);
  const big = combo >= 5;

  return (
    <Animated.View
      style={[
        styles.badge,
        big && styles.badgeBig,
        { backgroundColor: bg, borderColor: fg },
        style,
      ]}>
      <Text style={[styles.text, big && styles.textBig, { color: fg }]}>⚡ {combo} 连击</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 现在是悬浮在内容上方的徽章（见 index.tsx 的 comboFloat），不是嵌在文档流里的
  // 一块背景色小标签了，需要自己的投影才能跟底下的卡片/按钮分开，不然容易被
  // 盖在下面的内容"吃掉"存在感。
  badge: {
    borderWidth: 1.5,
    borderRadius: theme.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.float,
  },
  badgeBig: { borderWidth: 2, paddingVertical: 7, paddingHorizontal: 16 },
  text: { fontSize: 14, fontWeight: "800" },
  textBig: { fontSize: 15 },
});
