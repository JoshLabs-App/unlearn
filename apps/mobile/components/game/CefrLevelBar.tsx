// CEFR 词汇量进度条：在 AnimatedProgressBar 基础上叠一层"每个等级在哪"的刻度和
// 图例——之前这条条只是一截纯进度，看不出 A1/A2/B1/B2 各自的分界在哪、要多少词，
// 只能靠下面一行动态文字猜。刻度线和图例格子都用 flex 权重（每档词量差）分段，不用
// 算百分比/像素位置——权重跟真实词量成正比，不管屏幕多宽都天然对得上。
//
// 2026-09-07：只画"掌握"一条，"接触过"的词完全没地方看——玩家读了 195 个词、
// 真正掌握 13 个，条上却只有 13 那一点点，看着像"没在涨"。改成两层叠在同一条轴
// 上：底层浅色是"接触过"（seenPct），上层深色渐变是"掌握"（pct，即 mastered）。
// mastered 恒 ≤ encountered，深色层天然叠在浅色层前面一截，一眼能看出"读了多少、
// 真会了多少"两个数分别在哪。
import { StyleSheet, Text, View } from "react-native";

import { AnimatedProgressBar } from "@/components/game/AnimatedProgressBar";
import { CEFR_VOCAB_THRESHOLDS } from "@/lib/game/progress";
import { theme } from "@/lib/theme";

export function CefrLevelBar({
  pct,
  seenPct = 0,
  height = 12,
}: {
  pct: number;
  seenPct?: number;
  height?: number;
}) {
  const segments = CEFR_VOCAB_THRESHOLDS.map((tier, i) => ({
    level: tier.level,
    from: i === 0 ? 0 : CEFR_VOCAB_THRESHOLDS[i - 1].words,
    to: tier.words,
  }));

  return (
    <View>
      <View style={styles.barWrap}>
        <AnimatedProgressBar
          pct={Math.max(seenPct, pct)}
          height={height}
          color={theme.colors.accentSoft}
          trackColor={theme.colors.surfaceDeep}
        />
        {/* 掌握层绝对定位叠在接触层正上方——自己的 track 设成透明，只露出渐变
            填充那一截，底下浅色的"接触过"部分才能透出来。 */}
        <View style={StyleSheet.absoluteFill}>
          <AnimatedProgressBar
            pct={pct}
            height={height}
            gradient={theme.levelGradient}
            trackColor="transparent"
          />
        </View>
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
