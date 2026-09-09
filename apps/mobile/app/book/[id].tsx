// 书籍详情页：点书架上一本还没读过的书时先来这里，看清楚"这本讲什么、多难、多长、
// 能学到什么、怎么读"，再决定要不要开。读过的书从书架直接进故事，不经过这里——
// 这些信息只在"选书"那一刻有用，每天都看到就成了噪音（首页要保持"继续读"的效率）。
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/game/PrimaryButton";
import { getBookContent, getBookMeta, MAIN_BOOK_ID } from "@/content/books";
import { useGame } from "@/contexts/GameContext";
import { corpusVocab } from "@/lib/game/progress";
import { theme } from "@/lib/theme";

const COVERS: Record<string, number> = {
  "a-decade-apart": require("@/assets/images/a-decade-apart-cover.jpg"),
  "baker-street": require("@/assets/images/baker-street-cover.jpg"),
  ruth: require("@/assets/images/ruth-cover.jpg"),
};

// 每本书的"读法"。结构固定成四条方便一眼扫完；文案按书写，因为连载和短篇集的
// 读法真的不一样（主线跳章看不懂，福尔摩斯从哪章读起都行）。
const HOW_TO_READ: Record<string, string[]> = {
  "a-decade-apart": [
    "一条故事线从头讲到尾，按顺序读，跳着读会看不懂前因后果。",
    "每一幕你就是主角本人，从几个选项里挑出该说的那句话。",
    "选错的句子会进复习队列，过些天用闪回的形式再考你一次。",
    "任何单词长按可以查中文释义、听发音，查过的词也进复习队列。",
  ],
  ruth: [
    "这本不改写，读的就是原文，没有简化、没有替换。",
    "中文对照可以整页开关。想先自己读懂就关掉，卡住了再打开。",
    "点任意一节的编号听那一节，点底部按钮整章连读。",
    "任何单词长按可以查中文释义、听发音，查过的词会进复习队列。",
  ],
  "baker-street": [
    "一章一个独立案子，从哪一章读起都行，隔多久回来都接得上。",
    "你扮演华生医生。福尔摩斯负责推理，你负责追问和反应。",
    "选错的句子会进复习队列，过些天用闪回的形式再考你一次。",
    "任何单词长按可以查中文释义、听发音，查过的词也进复习队列。",
  ],
};

// 这本书凭什么值得读。写给"要不要开这本"这个决定看，不是卖点堆砌。
const WHY: Record<string, string> = {
  "a-decade-apart":
    "从落地机场的第一句对话开始，一路租房、找工作、认识邻居、过节。你在故事里练的每一句，都是真到了国外要说的话。",
  ruth:
    "前面两本都是改写过的，这本不是。你读的每一个词都是原文，没有简化，没有替换。全书只有 85 节，短得可以一口气读完，故事却完整：失去、选择、劳作、被善待、重新有了家。只有三个地方涉及那个年代的规矩，都写在对应那一节下面了。",
  "baker-street":
    "柯南道尔的原著故事，用今天的英语重写。读的时候你不只在学英语，也在读一部人人都听说过、却很少有人真读完原文的经典。",
};

export default function BookDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, currentBookId, changeBook, jumpToScene } = useGame();

  const bookId = id ?? MAIN_BOOK_ID;
  const meta = getBookMeta(bookId);
  const isReading = meta.kind === "reading";
  const content = getBookContent(bookId);

  // 这本书总共会让你读到多少个不同词形。语料是静态的，算一次缓存住。
  // 阅读本的结构是「章 → 节」，没有 scenes/nodes，不能走 corpusVocab（那个只认
  // 课程结构，直接遍历会因为 content.scenes 是 undefined 整页崩掉）。
  const wordForms = useMemo(() => {
    if (isReading) {
      const chapters = (content as unknown as { chapters?: { verses?: { en: string }[] }[] }).chapters ?? [];
      const set = new Set<string>();
      for (const ch of chapters) {
        for (const v of ch.verses ?? []) {
          for (const w of v.en.toLowerCase().match(/[a-z]+'?[a-z]*/g) ?? []) set.add(w);
        }
      }
      return set.size;
    }
    return corpusVocab(content).size;
  }, [content, isReading]);
  const lessons = isReading ? meta.scenes : content.scenes.length;
  // 每课四五分钟。主线近千课，说"3792 分钟"没人读得进去，超过两小时就换成小时。
  const minutes = lessons * 4;
  const duration = minutes >= 120 ? `${Math.round(minutes / 60)} 小时` : `${minutes} 分钟`;

  const saved = state?.books?.[bookId];
  const isCurrent = bookId === currentBookId;
  const started = isCurrent || saved !== undefined;
  const at = isCurrent ? (state?.sceneIndex ?? 0) : (saved?.sceneIndex ?? 0);

  function start() {
    // 原文阅读本走阅读页，不参与"当前在读哪本"那套（它不碰 sceneIndex/XP/连胜）。
    if (isReading) return router.replace(`/read/${bookId}`);
    if (!isCurrent) changeBook(bookId);
    router.replace("/game");
  }

  // 从某一章读起。短篇集才给这个入口——连载跳章会看不懂前因后果。
  // 换书和跳幕是两步：changeBook 之后 state 才指向这本书，jumpToScene 依赖它。
  function startAt(startScene: number) {
    if (!isCurrent) {
      changeBook(bookId);
      setTimeout(() => jumpToScene(startScene), 0);
    } else {
      jumpToScene(startScene);
    }
    router.replace("/game");
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.spacing.sm, paddingBottom: insets.bottom + 40 },
      ]}>
      <Pressable style={styles.back} onPress={() => router.back()} hitSlop={10}>
        <Text style={styles.backText}>✕</Text>
      </Pressable>

      <View style={styles.headRow}>
        {COVERS[bookId] ? (
          <Image source={COVERS[bookId]} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverEmoji]}>
            <Text style={styles.coverEmojiText}>{meta.emoji}</Text>
          </View>
        )}
        <View style={styles.headBody}>
          <Text style={styles.tag}>{meta.tag}</Text>
          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.titleEn}>{meta.titleEn}</Text>
          {meta.basedOn ? <Text style={styles.basedOn}>{meta.basedOn}</Text> : null}
        </View>
      </View>

      <Text style={styles.blurb}>{meta.blurb}</Text>

      {/* 三个硬数字：多长、多难、能读到多少词。看完就够判断要不要开了。 */}
      <View style={styles.factRow}>
        <View style={styles.fact}>
          <Text style={styles.factValue}>{isReading ? meta.chapters : lessons}</Text>
          <Text style={styles.factLabel}>{isReading ? "章" : "课"}</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.factValue}>{meta.minLevel}</Text>
          <Text style={styles.factLabel}>起步难度</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.factValue}>{wordForms}</Text>
          <Text style={styles.factLabel}>会读到的词</Text>
        </View>
      </View>
      <Text style={styles.factHint}>
        {isReading
          ? `共 ${meta.scenes} 节原文。可以整章朗读，也可以点单独一节听。难度标签只是建议，任何时候都能读。`
          : `每课四五分钟，全部读完大约 ${duration}。难度标签只是建议，任何时候都能开。`}
      </Text>

      <Text style={styles.sectionTitle}>为什么读这本</Text>
      <Text style={styles.body}>{WHY[bookId] ?? meta.blurb}</Text>

      <Text style={styles.sectionTitle}>怎么读</Text>
      {(HOW_TO_READ[bookId] ?? []).map((line, i) => (
        <View key={line} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>{i + 1}</Text>
          <Text style={styles.bulletText}>{line}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>能学到什么程度</Text>
      <Text style={styles.body}>
        词汇量是全部书合起来算的，一个词不管在哪本书读到都只算一次，换书不会倒退。读完这本你会接触到约{" "}
        {wordForms} 个不同词形。真正算"掌握"的门槛更严：这个词要出现过五次以上，而且你在闪回里答对过。
        数字宁可小，也不虚报。
      </Text>

      {/* 章节列表：短篇集可以从任意一章读起，连载不给这个入口。 */}
      {!meta.serial && meta.chapterList.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>目录</Text>
          <Text style={styles.factHint}>点任意一章从那里读起，已经学过的词和复习记录都会保留。</Text>
          {meta.chapterList.map((ch) => {
            const reading = started && at >= ch.startScene && at < ch.startScene + ch.sceneCount;
            const done = started && at >= ch.startScene + ch.sceneCount;
            return (
              <Pressable
                key={ch.index}
                style={({ pressed }) => [
                  styles.chapterRow,
                  reading && styles.chapterRowActive,
                  pressed && styles.chapterRowPressed,
                ]}
                onPress={() => startAt(ch.startScene)}>
                <Text style={[styles.chapterNo, reading && styles.chapterNoActive]}>{ch.index}</Text>
                <View style={styles.flex1}>
                  <Text style={styles.chapterTitle}>{ch.title}</Text>
                  {ch.subtitle ? <Text style={styles.chapterSub}>{ch.subtitle}</Text> : null}
                </View>
                <Text style={styles.chapterMeta}>
                  {reading ? "在读" : done ? "读过" : `${ch.sceneCount} 课`}
                </Text>
              </Pressable>
            );
          })}
        </>
      ) : null}

      <View style={styles.cta}>
        <PrimaryButton
          label={
            isReading ? "开始读原文" : started ? `继续读 · 第 ${at + 1} / ${lessons} 幕` : "开始读这本书"
          }
          onPress={start}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  back: { alignSelf: "flex-end", padding: 6 },
  backText: { fontSize: 20, color: theme.colors.textMuted, fontWeight: "700" },
  headRow: { flexDirection: "row", gap: theme.spacing.md, alignItems: "flex-start" },
  cover: {
    width: 110,
    height: 165,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceDeep,
  },
  coverEmoji: { alignItems: "center", justifyContent: "center" },
  coverEmojiText: { fontSize: 48 },
  headBody: { flex: 1, paddingTop: 4 },
  tag: { fontSize: 12, fontWeight: "700", color: theme.colors.accent },
  title: { fontSize: 24, fontWeight: "800", color: theme.colors.text, marginTop: 4 },
  titleEn: { fontSize: 15, color: theme.colors.textMuted, marginTop: 2 },
  basedOn: { fontSize: 11, color: theme.colors.textMuted, marginTop: 8, lineHeight: 15 },
  blurb: { fontSize: 15, lineHeight: 23, color: theme.colors.text, marginTop: theme.spacing.md },
  factRow: { flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.md },
  fact: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  factValue: { fontSize: 20, fontWeight: "800", color: theme.colors.text },
  factLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  factHint: { fontSize: 12, color: theme.colors.textMuted, marginTop: 8, lineHeight: 18 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: 6,
  },
  body: { fontSize: 14, lineHeight: 22, color: theme.colors.text },
  bulletRow: { flexDirection: "row", gap: 10, marginTop: 8, alignItems: "flex-start" },
  bulletDot: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: "center",
    lineHeight: 20,
    overflow: "hidden",
  },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 21, color: theme.colors.text },
  cta: { marginTop: theme.spacing.lg },
  flex1: { flex: 1 },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    marginTop: 8,
  },
  chapterRowActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  chapterRowPressed: { opacity: 0.75 },
  chapterNo: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.textMuted,
    width: 26,
    textAlign: "center",
  },
  chapterNoActive: { color: theme.colors.accent },
  chapterTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  chapterSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  chapterMeta: { fontSize: 12, fontWeight: "700", color: theme.colors.textMuted },
});
