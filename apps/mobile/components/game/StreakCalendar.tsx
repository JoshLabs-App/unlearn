// "打卡日历"：本来想做真正对齐星期几的周历，但存档只记了 lastStreakDate/streak
// 这个连续天数，没有存"哪几天具体打卡过"的历史，硬凑一个看起来像日历、实际数据
// 是编的东西反而会误导人（不对齐真实星期、也补不出连胜开始前的空档）。改成诚实地
// 展示"距下一个连胜保护还差几天"——STREAK_FREEZE_MILESTONE 天一循环，数据完全来自
// 已经在存的 state.streak，没有编造任何历史。
import { StyleSheet, Text, View } from "react-native";

import { STREAK_FREEZE_MILESTONE } from "@/lib/game/streak";
import { theme } from "@/lib/theme";

export function StreakCalendar({ streak }: { streak: number }) {
  const filled = streak > 0 && streak % STREAK_FREEZE_MILESTONE === 0 ? STREAK_FREEZE_MILESTONE : streak % STREAK_FREEZE_MILESTONE;

  return (
    <View>
      <View style={styles.row}>
        {Array.from({ length: STREAK_FREEZE_MILESTONE }, (_, i) => (
          <View key={i} style={[styles.dot, i < filled && styles.dotFilled]}>
            <Text style={styles.dotText}>{i < filled ? "🔥" : ""}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>
        再连续打卡 {STREAK_FREEZE_MILESTONE - filled} 天，获得一个 🧊 连胜保护
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, marginTop: theme.spacing.sm },
  dot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dotFilled: { backgroundColor: theme.colors.goldSoft, borderColor: theme.colors.gold },
  dotText: { fontSize: 13 },
  hint: { fontSize: 12, color: theme.colors.textMuted, marginTop: 6 },
});
