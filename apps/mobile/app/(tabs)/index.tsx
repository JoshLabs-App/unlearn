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
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedProgressBar } from "@/components/game/AnimatedProgressBar";
import { PrimaryButton } from "@/components/game/PrimaryButton";
import { getBookContent, getBookMeta } from "@/content/books";
import { useGame } from "@/contexts/GameContext";
import { MAX_HEARTS } from "@/lib/game/hearts";
import {
  CEFR_VOCAB_THRESHOLDS,
  computeLevelProgress,
  computePlayerLevel,
  computeVocabStatsAcrossBooks,
  learnedVocabCountAcrossBooks,
  totalXpAcrossBooks,
} from "@/lib/game/progress";
import { DAILY_GOAL, localDateStr } from "@/lib/game/streak";
import { theme } from "@/lib/theme";

const COVER = require("@/assets/images/a-decade-apart-cover.jpg");
const COVER_BAKER = require("@/assets/images/baker-street-cover.jpg");
const COVER_RUTH = require("@/assets/images/ruth-cover.jpg");

// 书架条目来自 content/books.ts（BOOKS）——加新书只要往 a-decade-apart/content/books/
// 放章节文件、重跑打包脚本，这里不用改。封面图只有主线有，其他书用 emoji 卡片。
const COVERS: Record<string, number> = {
  "a-decade-apart": COVER,
  "baker-street": COVER_BAKER,
  ruth: COVER_RUTH,
};

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
  const { content, state, loading, hearts, books, currentBookId } = useGame();

  const total = content.scenes.length;
  const played = state ? Math.min(state.sceneIndex, total) : 0;
  const pct = total > 0 ? Math.round((played / total) * 100) : 0;
  const started = played > 0 || (state?.nodeId != null && state.nodeId !== content.scenes[0]?.startNode);
  const finished = !!state?.finished;
  // 当前这一幕：sceneIndex 通关后会等于 total，要夹回最后一幕。
  const currentScene = content.scenes[Math.min(played, total - 1)];
  // 主卡上那行章节名要跟着当前读到第几幕走。content.chapterTitle 是书级的固定值
  // （永远是第一章的标题），跳到第三章还显示"第一章"就对不上了。
  const bookMetaNow = getBookMeta(currentBookId);
  const currentChapter = bookMetaNow.chapterList.find(
    (c) => played >= c.startScene && played < c.startScene + c.sceneCount,
  );
  const chapterLine = currentChapter?.title ?? content.chapterTitle;
  const scenePalette = theme.scenePalette[played % theme.scenePalette.length];

  const today = localDateStr();
  const dailyCount = state ? (state.dailyCorrectDate === today ? state.dailyCorrectCount || 0 : 0) : 0;
  const dailyDone = dailyCount >= DAILY_GOAL;
  const dailyLeft = Math.max(0, DAILY_GOAL - dailyCount);
  const streak = state?.streak ?? 0;
  const totalXp = totalXpAcrossBooks(state);
  const level = computePlayerLevel(totalXp).level;
  // 已学词汇跨书合计——切到新书那一刻不该从 21 掉回 0（词汇量是平台级资产）。
  const vocabCount = learnedVocabCountAcrossBooks(state);
  // CEFR 进度：跟游戏页顶部同一个口径（掌握的词元数，不是答对过的句子数），
  // 让"我学到什么程度"在日常界面里就有答案，而不是进了游戏才看得到。
  // 扫全部内容比较重（主线近千幕），按幕号/产出量缓存，不每次渲染都算。
  const vocabStats = useMemo(() => {
    if (!state) return { encountered: 0, mastered: 0 };
    const entries = [
      { content, upToSceneIndex: state.sceneIndex, learnedVocab: state.learnedVocab },
      ...Object.entries(state.books ?? {}).map(([id, p]) => ({
        content: getBookContent(id),
        upToSceneIndex: p.sceneIndex,
        learnedVocab: p.learnedVocab,
      })),
    ];
    return computeVocabStatsAcrossBooks(entries, state.confirmedWords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, state?.sceneIndex, state?.learnedVocab.length, state?.confirmedWords?.length, state?.books]);
  const cefr = computeLevelProgress(vocabStats.mastered);
  // computeLevelProgress 的 level 是"当前正在攻克的这一档"，target 是攻克它需要的词数。
  // 所以文案里"再掌握 N 个词进入 X"的 X 是下一档，不是 cefr.level 本身。
  const cefrIdx = CEFR_VOCAB_THRESHOLDS.findIndex((t) => t.level === cefr.level);
  const nextLevel = cefrIdx >= 0 ? (CEFR_VOCAB_THRESHOLDS[cefrIdx + 1]?.level ?? "B2 以上") : cefr.level;
  // 当前这一档走了多少：A1 是 0 到 500，A2 是 500 到 1100，以此类推。
  const cefrFloor = CEFR_VOCAB_THRESHOLDS.filter((t) => t.words <= vocabStats.mastered).pop()?.words ?? 0;
  const cefrPct = Math.max(
    2,
    Math.min(100, Math.round(((vocabStats.mastered - cefrFloor) / (cefr.target - cefrFloor)) * 100)),
  );

  // "今天该干嘛"一句话——取代原来那句固定副标题。
  let nudge: string;
  let ctaLabel: string;
  if (finished) {
    nudge = "整个故事已经读完了，随时可以从头再来一遍。";
    ctaLabel = "再读一遍";
  } else if (!started) {
    nudge = `《${getBookMeta(currentBookId).title}》还没开始——第一句台词在「${content.scenes[0]?.subtitle ?? ""}」等你。`;
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
      contentContainerStyle={[
        styles.content,
        // 底部留出 tab bar 的高度——书架从一本变成多本后，最后一张卡会被 tab bar 压住，
        // 光靠 styles.content 里的固定 paddingBottom 不够。
        { paddingTop: insets.top + theme.spacing.md, paddingBottom: insets.bottom + 96 },
      ]}>
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
          {COVERS[currentBookId] ? (
            <Image source={COVERS[currentBookId]} style={styles.heroCover} resizeMode="cover" />
          ) : (
            <View style={[styles.heroCover, styles.shelfCoverEmoji]}>
              <Text style={styles.heroCoverEmojiText}>{getBookMeta(currentBookId).emoji}</Text>
            </View>
          )}
          <View style={styles.heroBody}>
            <Text style={styles.heroEyebrow} numberOfLines={1}>
              {chapterLine}
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

      {/* —— 词汇量走到哪一档 —— */}
      <Pressable style={styles.cefrCard} onPress={() => router.navigate("/(tabs)/growth")}>
        <View style={styles.cefrTop}>
          <Text style={styles.cefrLevel}>{cefr.level}</Text>
          <Text style={styles.cefrCount}>
            掌握 {vocabStats.mastered} 词 · 接触 {vocabStats.encountered}
          </Text>
        </View>
        <View style={styles.cefrTrack}>
          <View style={[styles.cefrFill, { width: `${cefrPct}%` }]} />
        </View>
        <Text style={styles.cefrHint}>
          再掌握 {Math.max(0, cefr.target - vocabStats.mastered)} 个词进入 {nextLevel}
        </Text>
      </Pressable>

      {/* —— 书架 —— */}
      <Text style={styles.sectionTitle}>书架</Text>
      {books.map((book) => {
        const active = book.id === currentBookId;
        const saved = state?.books?.[book.id];
        const at = active ? (state?.sceneIndex ?? 0) : saved?.sceneIndex;
        const started = active || saved !== undefined;
        const cover = COVERS[book.id];
        return (
          <Pressable
            key={book.id}
            style={({ pressed }) => [
              styles.shelfCard,
              active && styles.shelfCardActive,
              pressed && styles.shelfCardPressed,
            ]}
            disabled={loading}
            // 书架卡片一律进详情页：那里有简介、难度、目录，短篇集还能挑一章读起。
            // 日常"接着上次读"走上面主卡那个大按钮，不经过这里，效率不受影响。
            onPress={() => router.push(`/book/${book.id}`)}>
            {cover ? (
              <Image source={cover} style={styles.shelfCover} resizeMode="cover" />
            ) : (
              <View style={[styles.shelfCover, styles.shelfCoverEmoji]}>
                <Text style={styles.shelfCoverEmojiText}>{book.emoji}</Text>
              </View>
            )}
            <View style={styles.shelfBody}>
              <View style={styles.shelfTagRow}>
                <Text style={styles.shelfTag}>{book.tag}</Text>
                {active ? <Text style={styles.shelfBadge}>在读</Text> : null}
              </View>
              <Text style={styles.shelfTitle}>
                {book.title} <Text style={styles.shelfTitleEn}>{book.titleEn}</Text>
              </Text>
              <Text style={styles.shelfBlurb} numberOfLines={3}>
                {book.blurb}
              </Text>
              <Text style={styles.shelfProgress}>
                {started ? `读到第 ${(at ?? 0) + 1} / ${book.scenes} 幕` : `${book.scenes} 幕 · 未开始`}
              </Text>
            </View>
          </Pressable>
        );
      })}
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

  cefrCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    gap: 8,
    ...theme.shadow.card,
  },
  cefrTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  cefrLevel: { fontSize: 20, fontWeight: "800", color: theme.colors.accent },
  cefrCount: { fontSize: 13, fontWeight: "600", color: theme.colors.textMuted },
  cefrTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceDeep,
    overflow: "hidden",
  },
  cefrFill: { height: "100%", borderRadius: 999, backgroundColor: theme.colors.accent },
  cefrHint: { fontSize: 12, color: theme.colors.textMuted },
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
  shelfCardActive: { borderColor: theme.colors.accent, borderWidth: 1.5 },
  shelfCoverEmoji: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceDeep,
  },
  shelfCoverEmojiText: { fontSize: 40 },
  heroCoverEmojiText: { fontSize: 56 },
  shelfTagRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  shelfBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.accent,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  shelfProgress: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, fontWeight: "600" },
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
