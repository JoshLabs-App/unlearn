// 通用动画进度条：等级条/技能条/每日目标条共用。渐变实现照抄网页版 style.css 的
// .level-bar 手法的思路，但换了一种裁剪方式（见下面 fillClip 的注释）。纯色场景
// （技能条/目标条）走同一组件的 fill 分支，用 Reanimated 把宽度变化过渡掉，不是
// 网页版 CSS transition 那种瞬间 width 跳变。
import { useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { theme } from "@/lib/theme";

interface Props {
  pct: number; // 0-100
  height?: number;
  gradient?: readonly string[];
  color?: string;
  trackColor?: string;
  // 玩家等级条这种想更抓眼球的场合才开——一圈静态柔光描边，不带任何循环动画
  // （之前试过循环扫光/呼吸光晕，反馈都是"一直在闪"很扰人，去掉了，只留这层
  // 不动的光）。
  glow?: boolean;
}

export function AnimatedProgressBar({
  pct,
  height = 8,
  gradient,
  color = theme.colors.accent,
  trackColor = theme.colors.border,
  glow = false,
}: Props) {
  const clamped = Math.max(0, Math.min(100, pct));
  const progress = useSharedValue(clamped);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 450 });
  }, [clamped, progress]);

  const fillClipStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const radius = height / 2;

  function onTrackLayout(e: LayoutChangeEvent) {
    setTrackWidth(e.nativeEvent.layout.width);
  }

  if (gradient && gradient.length > 0) {
    return (
      <View style={glow ? styles.glowWrap : undefined}>
        {glow ? (
          <View
            style={[
              styles.glowRing,
              { height: height + 10, borderRadius: radius + 5, shadowColor: gradient[0] },
            ]}
            pointerEvents="none"
          />
        ) : null}
        <View
          style={[styles.track, { height, borderRadius: radius, backgroundColor: trackColor }]}
          onLayout={onTrackLayout}>
          {/* 圆角要长在"已完成"这一段的尾端，不是长在轨道中间那条移动分界线的两侧
              （那样会出现圆角缺口，参见旧版注释）。做法是反过来：渐变条本身按
              轨道的整宽渲染、位置固定不跟着进度变形，套一层宽度=进度百分比、
              四角都圆的裁剪容器盖在它外面——裁剪容器的右边缘随进度移动，天然
              就是"已完成那段"自己的圆角收尾，未完成的部分则单纯是底下 track
              的背景色，没有第二层在跟它抢角。 */}
          <Animated.View style={[styles.fillClip, { borderRadius: radius }, fillClipStyle]}>
            {trackWidth > 0 ? (
              <View style={[styles.gradientRow, { width: trackWidth }]}>
                {gradient.map((c, i) => (
                  <View key={i} style={[styles.gradientSeg, { backgroundColor: c }]} />
                ))}
              </View>
            ) : null}
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.track, { height, borderRadius: radius, backgroundColor: trackColor }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color, borderRadius: radius }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: "hidden", position: "relative" },
  fill: { height: "100%" },
  fillClip: { position: "absolute", left: 0, top: 0, bottom: 0, overflow: "hidden" },
  gradientRow: { flexDirection: "row", height: "100%" },
  gradientSeg: { flex: 1 },
  glowWrap: { position: "relative" },
  glowRing: {
    position: "absolute",
    left: -5,
    right: -5,
    top: -5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
});
