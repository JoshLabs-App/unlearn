// 心数：从原来 "❤️".repeat() 的一整段文本换成可单独动画的心形组件——扣血时那颗心
// 晃一下再变灰，回血时新满的那颗心弹一下，而不是数字瞬间跳变（网页版这里也只是
// 瞬间换 emoji，这是移动端在原逻辑基础上加的"手感"）。
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type ChangeKind = "gained" | "lost" | null;

function HeartIcon({ filled, changed }: { filled: boolean; changed: ChangeKind }) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (changed === "gained") {
      scale.value = withSequence(
        withTiming(1.5, { duration: 140 }),
        withSpring(1, { damping: 6, stiffness: 180 }),
      );
    } else if (changed === "lost") {
      rotate.value = withSequence(
        withTiming(-10, { duration: 55 }),
        withTiming(9, { duration: 55 }),
        withTiming(-6, { duration: 55 }),
        withTiming(4, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
      scale.value = withSequence(withTiming(1.25, { duration: 90 }), withTiming(1, { duration: 160 }));
    }
  }, [changed, scale, rotate]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return <Animated.Text style={[styles.heart, style]}>{filled ? "❤️" : "🖤"}</Animated.Text>;
}

export function HeartsRow({ hearts, max }: { hearts: number; max: number }) {
  const prevRef = useRef(hearts);
  const [change, setChange] = useState<{ index: number; kind: ChangeKind } | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === hearts) return;
    prevRef.current = hearts;
    if (hearts < prev) {
      setChange({ index: hearts, kind: "lost" });
    } else {
      setChange({ index: hearts - 1, kind: "gained" });
    }
    const t = setTimeout(() => setChange(null), 450);
    return () => clearTimeout(t);
  }, [hearts]);

  return (
    <View style={styles.row}>
      {Array.from({ length: max }, (_, i) => (
        <HeartIcon key={i} filled={i < hearts} changed={change?.index === i ? change.kind : null} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
  heart: { fontSize: 18 },
});
