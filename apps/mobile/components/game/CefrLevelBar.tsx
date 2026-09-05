// CEFR 词汇量进度条：在 AnimatedProgressBar 基础上叠一层"每个等级在哪"的刻度和
// 图例——之前这条条只是一截纯进度，看不出 A1/A2/B1/B2 各自的分界在哪、要多少词，
// 只能靠下面一行动态文字猜。刻度线和图例格子都用 flex 权重（每档词量差）分段，不用
// 算百分比/像素位置——权重跟真实词量成正比，不管屏幕多宽都天然对得上。
import { StyleSheet, Text, View } from "react-native";

import { AnimatedProgressBar } from "@/components/game/AnimatedProgressBar";
import { CEFR_VOCAB_THRESHOLDS } from "@/lib/game/progress";
import { theme } from "@/lib/theme";

export function CefrLevelBar({ pct, height = 12 }: { pct: number; height?: number }) {
  const segments = CEFR_VOCAB_THRESHOLDS.map((tier, i) => ({
    level: tier.level,
    from: i === 0 ? 0 : CEFR_VOCAB_THRESHOLDS[i - 1].words,
    to: tier.words,
  }));

  return (
    <View>
      <View style={styles.barWrap}>
        <AnimatedProgressBar
          pct={pct}
          height={height}
          gradient={theme.levelGradient}
          trackColor={theme.colors.surfaceDeep}
        />
        {/* 分界刻度：跟条本身叠在一起，靠 flex 权重摆到每档词量的真实边界上——
            不含最后一段的右边框，那条边就是整个条自己的右端，不需要再画一条线。 */}
        <View style={[styles.ticksRow, { height }]} pointerEvents="none">
          {segments.map((seg, i) => (
            <View
              key={seg.level}
              style={[
                styles.tickSeg,
                { flex: seg.to - seg.from },
                i < segments.length - 1 && styles.tickDivider,
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.legendRow}>
        {segments.map((seg) => (
          <View key={seg.level} style={[styles.legendSeg, { flex: seg.to - seg.from }]}>
            <Text style={styles.legendLevel}>{seg.level}</Text>
            <Text style={styles.legendWords} numberOfLines={1}>
              {seg.to}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barWrap: { position: "relative" },
  ticksRow: { position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row" },
  tickSeg: { height: "100%" },
  tickDivider: { borderRightWidth: 1.5, borderRightColor: "rgba(255,255,255,0.65)" },
  legendRow: { flexDirection: "row", marginTop: 3 },
  legendSeg: { alignItems: "center" },
  legendLevel: { fontSize: 10, fontWeight: "800", color: theme.colors.textMuted },
  legendWords: { fontSize: 9, color: theme.colors.textMuted },
});
