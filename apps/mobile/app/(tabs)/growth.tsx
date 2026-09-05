// Character growth / skill panel screen. Ported from a-decade-apart's sidebar
// (#skill-panel / #daily-goal-card, main.js renderSkillPanel()/renderDailyGoal()).
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useRouter } from "expo-router";

import { AnimatedProgressBar } from "@/components/game/AnimatedProgressBar";
import { ConfettiBurst } from "@/components/game/ConfettiBurst";
import { LeaderboardBoard } from "@/components/LeaderboardBoard";
import { StreakCalendar } from "@/components/game/StreakCalendar";
import { useGame } from "@/contexts/GameContext";
import { DAILY_GOAL, localDateStr } from "@/lib/game/streak";
import { theme } from "@/lib/theme";

export default function GrowthScreen() {
  const router = useRouter();
  const { content, skillMax, state, loading } = useGame();
  const [showConfetti, setShowConfetti] = useState(false);
  const wasCompleteRef = useRef<boolean | null>(null);
  const pulse = useSharedValue(1);

  const today = localDateStr();
  const dailyCount = state ? (state.dailyCorrectDate === today ? state.dailyCorrectCount || 0 : 0) : 0;
  const dailyPct = Math.min(100, Math.round((dailyCount / DAILY_GOAL) * 100));
  const isComplete = dailyCount >= DAILY_GOAL;

  // 目标条完成脉冲 + 彩纸屑：照抄网页版 style.css 的 goal-pulse（scaleY 1→1.8→1）+
  // celebrateDailyGoal 的彩纸屑。只在"从没完成变成完成"这一刻触发一次，不是每次
  // 渲染都放（比如切到这个 tab 时目标已经完成了，就不该重放一遍庆祝）。
  useEffect(() => {
    if (wasCompleteRef.current === null) {
      wasCompleteRef.current = isComplete;
      return;
    }
    if (isComplete && !wasCompleteRef.current) {
      pulse.value = withSequence(
        withTiming(1.8, { duration: 240 }),
        withTiming(1, { duration: 260 }),
      );
      setShowConfetti(true);
    }
    wasCompleteRef.current = isComplete;
  }, [isComplete, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: pulse.value }] }));

  if (loading || !state) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  const totalXp = Object.values(state.skills).reduce((a, b) => a + b, 0);
  const checkedInToday = state.lastStreakDate === today;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.sectionTitle}>Character Growth <Text style={styles.zh}>角色成长</Text></Text>

      <View style={styles.skillPanel}>
        {Object.entries(content.skillMeta).map(([key, meta], i) => {
          const xp = state.skills[key] || 0;
          const max = skillMax[key] || 1;
          const pct = Math.min(100, Math.round((xp / max) * 100));
          // 每个技能自己的颜色（循环取用 theme.skillPalette），而不是清一色品牌绿——
          // 视觉上更像"收集了好几种不同的技能徽章"，而不是同一条进度条复制了六遍。
          const skillColor = theme.skillPalette[i % theme.skillPalette.length];
          return (
            // 点进去看这个分类下全部场景摊平出来的例句——PORTED from
            // a-decade-apart/category.js 那套"点分类看词表"的交互，之前只能看到
            // 一条进度条，看不到具体学了哪些词句。
            <Pressable
              key={key}
              style={styles.skillRow}
              onPress={() => router.push({ pathname: "/category/[skill]", params: { skill: key } })}>
              <View style={styles.skillLabelRow}>
                <View style={[styles.skillIconBadge, { backgroundColor: `${skillColor}22`, borderColor: skillColor }]}>
                  <Text style={styles.skillIcon}>{meta.icon}</Text>
                </View>
                <Text style={styles.skillLabel}>
                  {meta.labelEn} <Text style={styles.zh}>{meta.label}</Text>
                </Text>
                <Text style={styles.skillChevron}>›</Text>
              </View>
              <AnimatedProgressBar pct={pct} height={9} color={skillColor} />
              <Text style={styles.skillXp}>
                {xp}/{max}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Total XP <Text style={styles.zh}>总经验值</Text></Text>
        <Text style={styles.statValue}>{totalXp}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Vocabulary Learned <Text style={styles.zh}>已学词汇</Text></Text>
        <Text style={styles.statValue}>{state.learnedVocab.length}</Text>
      </View>

      <View style={[styles.card, isComplete && styles.cardComplete]}>
        {showConfetti ? <ConfettiBurst onFinished={() => setShowConfetti(false)} /> : null}
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>🎯 Daily Goal <Text style={styles.zh}>今日目标</Text></Text>
          <Text style={[styles.cardCount, isComplete && styles.cardCountComplete]}>
            {isComplete ? "✅ " : ""}
            {Math.min(dailyCount, DAILY_GOAL)}/{DAILY_GOAL}
          </Text>
        </View>
        <Animated.View style={pulseStyle}>
          <AnimatedProgressBar pct={dailyPct} height={9} color={theme.colors.correct} />
        </Animated.View>
      </View>

      <View style={[styles.card, { borderColor: theme.colors.gold }]}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>🔥 Streak <Text style={styles.zh}>连续打卡</Text></Text>
          {state.streakFreezes > 0 ? (
            <Text style={styles.freezeBadge}>🧊 x{state.streakFreezes}</Text>
          ) : null}
        </View>
        <Text style={[styles.statBig, { color: theme.colors.goldDeep }]}>{state.streak || 0} 天</Text>
        {!checkedInToday ? (
          <Text style={styles.streakHint}>今天还没打卡，去主线答对一题吧</Text>
        ) : null}
        <StreakCalendar streak={state.streak || 0} />
      </View>

      <View style={[styles.card, { borderColor: theme.skillPalette[1] }]}>
        <Text style={styles.cardTitle}>🧳 待复习 <Text style={styles.zh}>Review Queue</Text></Text>
        <Text style={[styles.statBig, { color: theme.skillPalette[1] }]}>{state.reviewQueue.length} 条</Text>
      </View>

      {/* 排行榜原来是底部标签页，后来改成点卡片跳转的二级页——现在直接摊开嵌在
          "角色成长"页面下方，不用再跳一次，用总经验值这个已经在本页展示的数字
          去跟别人比较，放在这儿顺理成章。 */}
      <View style={styles.leaderboardSection}>
        <LeaderboardBoard />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  sectionTitle: { fontSize: 25, fontWeight: "800", color: theme.colors.text, marginBottom: theme.spacing.sm },
  zh: { fontSize: 14, color: theme.colors.textMuted, fontWeight: "400" },
  skillPanel: { gap: theme.spacing.md, marginBottom: theme.spacing.md },
  skillRow: { gap: 6 },
  skillLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  skillIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  skillIcon: { fontSize: 15 },
  skillLabel: { flex: 1, fontSize: 16, color: theme.colors.text, fontWeight: "700" },
  skillChevron: { fontSize: 20, color: theme.colors.textMuted, fontWeight: "700" },
  skillXp: { fontSize: 13, color: theme.colors.textMuted, alignSelf: "flex-end", fontWeight: "600" },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statLabel: { fontSize: 16, color: theme.colors.text, fontWeight: "600" },
  statValue: { fontSize: 18, fontWeight: "800", color: theme.colors.accent },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    ...theme.shadow.card,
  },
  cardComplete: { borderColor: theme.colors.correct },
  cardHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: theme.spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  cardCount: { fontSize: 15, color: theme.colors.textMuted, fontWeight: "600" },
  cardCountComplete: { color: theme.colors.correct, fontWeight: "800" },
  freezeBadge: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.goldDeep,
    backgroundColor: theme.colors.goldSoft,
    borderRadius: theme.radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statBig: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  streakHint: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  leaderboardSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
