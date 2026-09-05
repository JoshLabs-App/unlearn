// 首页 · "继续读故事"仪表盘 + 书架。
//
// 之前的首页是"选一个故事开始"标题 + 一句解释玩法的副标题 + 一张封面卡——对一个
// 只有一部故事、而且玩家每天都要回来的 App 来说，"选故事"是个伪任务，"解释玩法"
// 也只对第一次打开的人有用（新手引导 guide.tsx 已经把玩法演过一遍了）。重新设计
// 成三段：
//   1. 问候行：按时段打招呼 + 昵称，右边两枚状态小签（连胜🔥 / 生命❤️），下面一行
//      "今天该干嘛"的动态提示——代替原来那句固定副标题，内容跟着存档变：没开始/
//      今天还差几题打卡/已打卡/已通关，每种状态一句话。
//   2. 主卡：封面 + 当前读到哪一幕（幕的英文标题 + 中文副标题 + 该幕的 emoji 头像，
//      配色跟游戏页的 scenePalette 同步）+ 进度条 + 一个大按钮直接进故事。
//   3. 今日三格（打卡进度 / 已学词汇 / 等级）和"书架"——书架保留列表形状，往后加
//      新故事只用往 STORIES 里多塞一项，末尾留一个"即将上架"的虚线空位。
// 游戏本体仍在 tabs 组外面的 app/game.tsx，从这里的按钮/卡片点进去，退出时用页面
// 左上角的 ✕ 键回到这里。
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedProgressBar } from "@/components/game/AnimatedProgressBar";
import { PrimaryButton } from "@/components/game/PrimaryButton";
import { useGame } from "@/contexts/GameContext";
import { MAX_HEARTS } from "@/lib/game/hearts";
import { computePlayerLevel } from "@/lib/game/progress";
import { DAILY_GOAL, localDateStr } from "@/lib/game/streak";
import { theme } from "@/lib/theme";

const COVER = require("@/assets/images/a-decade-apart-cover.jpg");

// 书架条目。目前只有一部，形状按列表设计（见文件头注释）。
const STORIES = [
  {
    id: "a-decade-apart",
    cover: COVER,
    tag: "第一部 · A1 起步",
    title: "十年之约",
    titleEn: "A Decade Apart",
    blurb: "十年前的一封信、一个旧地址。你落地多伦多，从海关的第一句对话开始，一路找到那个等着被找到的人。",
  },
] as const;

// 按小时打招呼——比固定的"你好"多一点"App 知道现在几点"的活气，成本几乎为零。
function greetingByHour(hour: number): string {
  if (hour < 5) return "夜深了";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { content, state, loading, hearts } = useGame();

  const total = content.scenes.length;
  const played = state ? Math.min(state.sceneIndex, total) : 0;
  const pct = total > 0 ? Math.round((played / total) * 100) : 0;
  const started = played > 0 || (state?.nodeId != null && state.nodeId !== content.scenes[0]?.startNode);
  const finished = !!state?.finished;
  // 当前这一幕：sceneIndex 通关后会等于 total，要夹回最后一幕。
  const currentScene = content.scenes[Math.min(played, total - 1)];
  const scenePalette = theme.scenePalette[played % theme.scenePalette.length];

  const today = localDateStr();
  const dailyCount = state ? (state.dailyCorrectDate === today ? state.dailyCorrectCount || 0 : 0) : 0;
  const dailyDone = dailyCount >= DAILY_GOAL;
  const dailyLeft = Math.max(0, DAILY_GOAL - dailyCount);
  const streak = state?.streak ?? 0;
  const totalXp = state ? Object.values(state.skills).reduce((a, b) => a + b, 0) : 0;
  const level = computePlayerLevel(totalXp).level;
  const vocabCount = state?.learnedVocab.length ?? 0;

  // "今天该干嘛"一句话——取代原来那句固定副标题。
  let nudge: string;
  let ctaLabel: string;
  if (finished) {
    nudge = "整个故事已经读完了，随时可以从头再来一遍。";
    ctaLabel = "再读一遍";
  } else if (!started) {
    nudge = "你的故事还没开始——第一句台词在多伦多海关等你。";
    ctaLabel = "开始读故事";
  } else if (dailyDone) {
    nudge = "今天的打卡已经完成，想读就接着往下读。";
    ctaLabel = "继续读故事";
  } else {
    nudge = `今天再答对 ${dailyLeft} 题就完成打卡，接着上次的地方读。`;
    ctaLabel = "继续读故事";
  }

  const goPlay = () => router.push("/game");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}>
      {/* —— 问候行 —— */}
      <View style={styles.greetRow}>
        <View style={styles.greetTextWrap}>
          <Text style={styles.greetHello}>{greetingByHour(new Date().getHours())}</Text>
          <Text style={styles.greetName} numberOfLines={1}>
            {state?.playerName ?? "旅人"}
          </Text>
        </View>
        <View style={styles.chipRow}>
          <View style={[styles.chip, styles.chipStreak]}>
            <Text style={styles.chipText}>🔥 {streak}</Text>
          </View>
          <View style={[styles.chip, styles.chipHearts]}>
            <Text style={styles.chipText}>
              ❤️ {hearts}/{MAX_HEARTS}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.nudge}>{nudge}</Text>

      {/* —— 主卡：当前进度 + 进入故事 —— */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Image source={COVER} style={styles.heroCover} resizeMode="cover" />
          <View style={styles.heroBody}>
            <Text style={styles.heroEyebrow} numberOfLines={1}>
              {content.chapterTitle}
            </Text>
            <View style={styles.sceneRow}>
              <View style={[styles.sceneAvatar, { backgroundColor: scenePalette.bg }]}>
                <Text style={styles.sceneAvatarText}>{currentScene?.avatar ?? "📖"}</Text>
              </View>
              <View style={styles.sceneTextWrap}>
                <Text style={styles.sceneTitle} numberOfLines={2}>
                  {currentScene?.title ?? content.chapterSubtitle}
                </Text>
                <Text style={styles.sceneSubtitle} numberOfLines={2}>
                  {currentScene?.subtitle ?? ""}
                </Text>
              </View>
            </View>
            <View style={styles.heroProgressWrap}>
              <AnimatedProgressBar
                pct={finished ? 100 : pct}
                height={8}
                color={scenePalette.tint}
                trackColor={theme.colors.surfaceDeep}
              />
              <Text style={styles.heroProgressLabel}>
                {finished ? "🏅 已通关" : started ? `第 ${played + 1} / ${total} 幕` : `共 ${total} 幕 · 还没开始`}
              </Text>
            </View>
          </View>
        </View>
        <PrimaryButton label={ctaLabel} onPress={goPlay} disabled={loading} style={styles.heroBtn} />
      </View>

      {/* —— 今日三格 —— */}
      <View style={styles.statRow}>
        <Pressable style={[styles.stat, dailyDone && styles.statDone]} onPress={() => router.navigate("/(tabs)/growth")}>
          <Text style={styles.statIcon}>{dailyDone ? "✅" : "🎯"}</Text>
          <Text style={styles.statValue}>
            {Math.min(dailyCount, DAILY_GOAL)}/{DAILY_GOAL}
          </Text>
          <Text style={styles.statLabel}>今日打卡</Text>
        </Pressable>
        <Pressable style={styles.stat} onPress={() => router.navigate("/(tabs)/growth")}>
          <Text style={styles.statIcon}>📚</Text>
          <Text style={styles.statValue}>{vocabCount}</Text>
          <Text style={styles.statLabel}>已学词汇</Text>
        </Pressable>
        <Pressable style={styles.stat} onPress={() => router.navigate("/(tabs)/growth")}>
          <Text style={styles.statIcon}>⭐</Text>
          <Text style={styles.statValue}>Lv.{level}</Text>
          <Text style={styles.statLabel}>等级</Text>
        </Pressable>
      </View>

      {/* —— 书架 —— */}
      <Text style={styles.sectionTitle}>书架</Text>
      {STORIES.map((story) => (
        <Pressable
          key={story.id}
          style={({ pressed }) => [styles.shelfCard, pressed && styles.shelfCardPressed]}
          disabled={loading}
          onPress={goPlay}>
          <Image source={story.cover} style={styles.shelfCover} resizeMode="cover" />
          <View style={styles.shelfBody}>
            <Text style={styles.shelfTag}>{story.tag}</Text>
            <Text style={styles.shelfTitle}>
              {story.title} <Text style={styles.shelfTitleEn}>{story.titleEn}</Text>
            </Text>
            <Text style={styles.shelfBlurb} numberOfLines={3}>
              {story.blurb}
            </Text>
          </View>
        </Pressable>
      ))}
      <View style={styles.shelfPlaceholder}>
        <View style={styles.shelfPlaceholderCover} />
        <View style={styles.shelfBody}>
          <Text style={styles.shelfPlaceholderTitle}>即将上架</Text>
          <Text style={styles.shelfPlaceholderDesc}>每一本都是独立的故事，也是独立的一段完整课程。</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },

  greetRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  greetTextWrap: { flex: 1, marginRight: theme.spacing.sm },
  greetHello: { fontSize: 14, fontWeight: "600", color: theme.colors.textMuted },
  greetName: { fontSize: 26, fontWeight: "800", color: theme.colors.text },
  chipRow: { flexDirection: "row", gap: theme.spacing.sm, paddingBottom: 4 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  chipStreak: { backgroundColor: theme.colors.goldSoft, borderColor: theme.colors.gold },
  chipHearts: { backgroundColor: theme.colors.wrongSoft, borderColor: "#f1c4c4" },
  chipText: { fontSize: 13, fontWeight: "700", color: theme.colors.text },
  nudge: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },

  hero: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadow.card,
  },
  heroTop: { flexDirection: "row", gap: theme.spacing.md },
  heroCover: {
    width: 96,
    aspectRatio: 2 / 3,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceDeep,
  },
  heroBody: { flex: 1, justifyContent: "space-between", gap: theme.spacing.sm },
  heroEyebrow: { fontSize: 12, fontWeight: "700", color: theme.colors.accent, letterSpacing: 0.3 },
  sceneRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  sceneAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sceneAvatarText: { fontSize: 24 },
  sceneTextWrap: { flex: 1 },
  sceneTitle: { fontSize: 17, fontWeight: "800", color: theme.colors.text, lineHeight: 22 },
  sceneSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, lineHeight: 16 },
  heroProgressWrap: { gap: 6 },
  heroProgressLabel: { fontSize: 12, color: theme.colors.textMuted },
  heroBtn: { alignSelf: "stretch" },

  statRow: { flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.md },
  stat: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
  },
  statDone: { backgroundColor: theme.colors.correctSoft, borderColor: theme.colors.correct },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 17, fontWeight: "800", color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textMuted },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  shelfCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    marginBottom: theme.spacing.sm,
    ...theme.shadow.card,
  },
  shelfCardPressed: { opacity: 0.85 },
  shelfCover: { width: 72, aspectRatio: 2 / 3, backgroundColor: theme.colors.surfaceDeep },
  shelfBody: { flex: 1, padding: theme.spacing.md, gap: theme.spacing.xs, justifyContent: "center" },
  shelfTag: { fontSize: 12, fontWeight: "700", color: theme.colors.accent },
  shelfTitle: { fontSize: 17, fontWeight: "800", color: theme.colors.text },
  shelfTitleEn: { fontSize: 13, fontWeight: "600", color: theme.colors.textMuted },
  shelfBlurb: { fontSize: 12, lineHeight: 17, color: theme.colors.textMuted },
  shelfPlaceholder: {
    flexDirection: "row",
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.borderDeep,
    overflow: "hidden",
  },
  shelfPlaceholderCover: {
    width: 72,
    aspectRatio: 2 / 3,
    backgroundColor: theme.colors.surfaceDeep,
    opacity: 0.6,
  },
  shelfPlaceholderTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.textMuted },
  shelfPlaceholderDesc: { fontSize: 12, lineHeight: 17, color: theme.colors.textMuted },
});
