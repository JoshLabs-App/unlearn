// 原文阅读页：给 kind === "reading" 的书用，跟游戏页是两种东西。
//
// 游戏页是"选台词 → 答错进复习"的产出训练；这一页没有任何产出环节，只有输入：
// 英文原文一节一节排下来，中文对照可以整页开关，点任意一节朗读，长按单词查释义。
// 所以它不碰 GameState 的 sceneIndex/skills/reviewQueue，只用 AsyncStorage 记
// "读到第几章第几节"——这本书不参与 XP、等级、连胜，是安安静静读的东西。
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlayPauseIcon } from "@/components/PlayPauseIcon";
import { WordPopup } from "@/components/game/WordPopup";
import { WordText } from "@/components/game/WordText";
import { getBookMeta } from "@/content/books";
import { useGame } from "@/contexts/GameContext";
import { playLine, playWord, stopPlayback } from "@/lib/game/audio";
import { lookupWord } from "@/lib/game/dictionary";
import type { ReviewItem } from "@/lib/game/types";
import { theme } from "@/lib/theme";

import ruth from "@/content/books/ruth.json";

interface Verse {
  n: number;
  en: string;
  zh: string;
  /** 读原文绕不开的文化背景（拾穗律、至近亲属、脱鞋立约），一两句话，跟在那一节下面。 */
  note?: string;
}
interface ReadingChapter {
  n: number;
  title: string;
  titleEn: string;
  summary: string;
  verses: Verse[];
}
interface ReadingBook {
  bookId: string;
  bookTitle: string;
  bookTitleEn: string;
  source: string;
  sourceZh: string;
  chapters: ReadingChapter[];
}

const READING_BOOKS: Record<string, ReadingBook> = {
  ruth: ruth as unknown as ReadingBook,
};

const POS_KEY = "reading-pos:";

export default function ReadingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, hideZh, toggleZh, queueWordForReview } = useGame();

  const bookId = id ?? "ruth";
  const book = READING_BOOKS[bookId];
  const meta = getBookMeta(bookId);

  const [chapterIdx, setChapterIdx] = useState(0);
  const [playingVerse, setPlayingVerse] = useState<number | null>(null);
  // 停下来的时候读到第几节（0 基下标）。再点播放从这里接着读，不是从头来。
  const [pausedAt, setPausedAt] = useState(0);
  // 单句复读：开着的时候当前这一节读完再读一遍，一直到关掉或点别处。
  const [loopOne, setLoopOne] = useState(false);
  // 整章读完自动从头再来。
  const [loopChapter, setLoopChapter] = useState(false);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [popup, setPopup] = useState<{ key: number; word: string; meaning: string; anchorY: number } | null>(
    null,
  );
  const scrollRef = useRef<ScrollView>(null);
  // 每一节在内容里的 y 坐标 + 可视区高度：朗读时把当前节滚到屏幕中间要用。
  const verseYRef = useRef<Record<number, number>>({});
  const viewportRef = useRef(0);

  // 上次读到哪一章。只记章不记节——一章几十节，滚动位置记了反而容易跳错地方。
  useEffect(() => {
    void AsyncStorage.getItem(POS_KEY + bookId).then((v) => {
      const n = v ? parseInt(v, 10) : 0;
      if (!Number.isNaN(n) && book && n >= 0 && n < book.chapters.length) setChapterIdx(n);
    });
  }, [bookId, book]);

  const stopReading = useCallback(() => {
    readSessionRef.current += 1; // 让所有在跑的循环失效
    readingRef.current = false;
    stopPlayback();
    setPlayingVerse(null);
  }, []);

  const goChapter = useCallback(
    (i: number) => {
      stopReading(); // 换章前先掐掉上一章的连读，否则旧循环会继续念旧章
      setPausedAt(0); // 换了章，"接着上次"的位置也要跟着回到开头
      setChapterIdx(i);
      void AsyncStorage.setItem(POS_KEY + bookId, String(i)).catch(() => {});
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [bookId, stopReading],
  );

  const chapter = book?.chapters[chapterIdx];

  // 整章连读。用递增的 session id 而不是 boolean 标志：连点两下按钮时，第一轮
  // 循环还卡在 await playLine 上，boolean 会被设 false 再设 true，于是第二个循环
  // 启动、两轮同时在播（三星机上就是这样"多音重叠"的）。改成每次开始都拿一个
  // 新号码，循环每跑一步先确认号码还是自己的，不是就立刻退出。
  const readSessionRef = useRef(0);
  const readingRef = useRef(false);
  // 两个开关在循环里读，必须走 ref——循环是一个长跑的闭包，直接读 state
  // 会一直拿到开始那一刻的旧值。
  const loopOneRef = useRef(false);
  const loopChapterRef = useRef(false);
  useEffect(() => {
    loopOneRef.current = loopOne;
  }, [loopOne]);
  useEffect(() => {
    loopChapterRef.current = loopChapter;
  }, [loopChapter]);

  // 读一句，读不出声就重试一次（首次读某章时音频要现下载，偶尔会加载超时）。
  // 返回 false 表示这句真的没响。
  const speak = useCallback(async (text: string, session: number) => {
    let played = await playLine(text);
    if (!played && readSessionRef.current === session) played = await playLine(text);
    return played;
  }, []);

  // 从第 fromIndex 节开始往下读。暂停后再播放传的就是停下时那一节，
  // 所以是"接着读"而不是"从头读"。
  const readFrom = useCallback(
    async (fromIndex: number) => {
      if (!chapter) return;
      const session = (readSessionRef.current += 1);
      readingRef.current = true;
      let i = Math.max(0, Math.min(fromIndex, chapter.verses.length - 1));
      while (i < chapter.verses.length) {
        if (readSessionRef.current !== session) return; // 被暂停/切章/退出接管了
        const v = chapter.verses[i];
        setPlayingVerse(v.n);
        setPausedAt(i);
        const played = await speak(v.en, session);
        if (readSessionRef.current !== session) return;
        if (!played) {
          // 两次都没放出声（缺音频/断网）：停在这句，不要装作在读把整章翻完。
          readingRef.current = false;
          setPlayingVerse(null);
          return;
        }
        // 单句复读开着就停在原地重读，不往下走。
        if (loopOneRef.current) continue;
        i += 1;
      }
      if (readSessionRef.current !== session) return;
      // 整章读完：循环开着就从头再来，否则收工。
      if (loopChapterRef.current) {
        setPausedAt(0);
        void readFrom(0);
        return;
      }
      readingRef.current = false;
      setPlayingVerse(null);
      setPausedAt(0);
    },
    [chapter, speak],
  );

  const toggleRead = useCallback(() => {
    if (readingRef.current) {
      stopReading(); // stopReading 不动 pausedAt，所以下次接着这一节读
      return;
    }
    void readFrom(pausedAt);
  }, [pausedAt, readFrom, stopReading]);

  // 离开这一页时把声音掐掉，不然退出后还在响。
  useEffect(() => stopReading, [stopReading]);

  // 长按查词：跟游戏页同一套（释义气泡浮在触摸点上方 + 读一遍这个词 + 进复习队列）。
  const onWord = useCallback(
    (raw: string, event: GestureResponderEvent, verse: Verse) => {
      const w = raw.toLowerCase();
      const meaning = lookupWord(w);
      if (!meaning) return;
      setActiveWord(w);
      setPopup({ key: Date.now(), word: raw, meaning, anchorY: event.nativeEvent.pageY });
      void playWord(w);
      queueWordForReview(w, meaning, verse.en, verse.zh);
    },
    [queueWordForReview],
  );

  // 朗读到哪一节，就把那一节滚到屏幕中间——不然读着读着就跑到屏幕外面去了，
  // 还得自己手动追着滚。减去 viewport 的一半再往回补一点，让当前节落在偏中上，
  // 下一节也能露出来。
  useEffect(() => {
    if (playingVerse == null) return;
    const y = verseYRef.current[playingVerse];
    if (y == null || viewportRef.current === 0) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, y - viewportRef.current / 2 + 40),
      animated: true,
    });
  }, [playingVerse]);

  const chapterTabs = useMemo(() => book?.chapters ?? [], [book]);

  // 这一章里查过几个词。正文不给底色——一页几十节，标记一多整页就花得读不下去了
  // （Josh 2026-09-07 试过之后否掉）。改成只在底部显示一个计数入口，点了去复习页。
  const tappedInChapter = useMemo(() => {
    if (!chapter) return 0;
    const inQueue = new Set<string>();
    const collect = (q?: ReviewItem[]) => {
      for (const r of q ?? []) if (r.kind === "word") inQueue.add(r.en.toLowerCase());
    };
    collect(state?.reviewQueue);
    for (const b of Object.values(state?.books ?? {})) collect(b.reviewQueue);
    const here = new Set<string>();
    for (const v of chapter.verses) {
      for (const w of v.en.toLowerCase().match(/[a-z]+'?[a-z]*/g) ?? []) {
        if (inQueue.has(w)) here.add(w);
      }
    }
    return here.size;
  }, [chapter, state?.reviewQueue, state?.books]);

  if (!book || !chapter) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>这本书还没有原文内容。</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 顶栏：关闭、书名、中文开关 */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.topBtn}>
          <Text style={styles.topBtnText}>✕</Text>
        </Pressable>
        <View style={styles.topTitleWrap}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {book.bookTitle}
          </Text>
          <Text style={styles.topSub} numberOfLines={1}>
            {meta.minLevel} · 原文阅读
          </Text>
        </View>
        <Pressable onPress={toggleZh} hitSlop={10} style={[styles.topBtn, styles.zhBtn]}>
          <Text style={styles.zhBtnText}>{hideZh ? "中" : "中"}</Text>
          <View style={[styles.zhDot, !hideZh && styles.zhDotOn]} />
        </Pressable>
      </View>

      {/* 章切换 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsWrap}
        contentContainerStyle={styles.tabs}>
        {chapterTabs.map((c, i) => (
          <Pressable
            key={c.n}
            onPress={() => goChapter(i)}
            style={[styles.tab, i === chapterIdx && styles.tabOn]}>
            <Text style={[styles.tabText, i === chapterIdx && styles.tabTextOn]}>第 {c.n} 章</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        style={styles.body}
        onLayout={(e) => {
          viewportRef.current = e.nativeEvent.layout.height;
        }}
        contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 90 }}>
        <Text style={styles.chapterTitle}>{chapter.title}</Text>
        <Text style={styles.chapterTitleEn}>{chapter.titleEn}</Text>
        <Text style={styles.summary}>{chapter.summary}</Text>

        {chapter.verses.map((v, idx) => (
          <View
            key={v.n}
            onLayout={(e) => {
              verseYRef.current[v.n] = e.nativeEvent.layout.y;
            }}
            style={[styles.verse, playingVerse === v.n && styles.verseOn]}>
            <Pressable
              onPress={() => {
                // 点节号＝从这一节开始往下读，同时把"接着上次"的位置挪到这里。
                // 听到一半想回去重听，点一下那个节号就行。
                stopReading();
                setPausedAt(idx);
                void readFrom(idx);
              }}
              hitSlop={6}>
              <Text style={[styles.verseNo, playingVerse === v.n && styles.verseNoOn]}>{v.n}</Text>
            </Pressable>
            <View style={styles.verseBody}>
              <WordText
                text={v.en}
                style={styles.en}
                activeWord={activeWord}
                onWordPress={(w, e) => onWord(w, e, v)}
              />
              {!hideZh ? <Text style={styles.zh}>{v.zh}</Text> : null}
              {v.note ? (
                <View style={styles.note}>
                  <Text style={styles.noteText}>{v.note}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}

        <Text style={styles.source}>{book.sourceZh}</Text>
      </ScrollView>

      {/* 底部控制栏：上下章 / 播放暂停（接着上次的位置）/ 单句复读 / 整章循环 */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          style={[styles.navBtn, chapterIdx === 0 && styles.navBtnOff]}
          disabled={chapterIdx === 0}
          onPress={() => goChapter(chapterIdx - 1)}>
          <Text style={styles.navBtnText}>上章</Text>
        </Pressable>

        <Pressable style={styles.playBtn} onPress={toggleRead}>
          <View style={styles.playBtnInner}>
            <PlayPauseIcon mode={playingVerse !== null ? "pause" : "play"} color="#fff" size={13} />
            <Text style={styles.playBtnText}>
              {playingVerse !== null
                ? `第 ${playingVerse} 节`
                : pausedAt > 0
                  ? `接着第 ${chapter.verses[pausedAt]?.n ?? 1} 节`
                  : "整章朗读"}
            </Text>
          </View>
        </Pressable>

        {/* 单句复读：开着就把当前这一节反复读，练跟读用 */}
        <Pressable
          style={[styles.toggleBtn, loopOne && styles.toggleBtnOn]}
          onPress={() => setLoopOne((v) => !v)}>
          <Text style={[styles.toggleText, loopOne && styles.toggleTextOn]}>单句</Text>
        </Pressable>

        {/* 整章循环：读完最后一节从头再来 */}
        <Pressable
          style={[styles.toggleBtn, loopChapter && styles.toggleBtnOn]}
          onPress={() => setLoopChapter((v) => !v)}>
          <Text style={[styles.toggleText, loopChapter && styles.toggleTextOn]}>循环</Text>
        </Pressable>

        <Pressable
          style={[styles.navBtn, chapterIdx === chapterTabs.length - 1 && styles.navBtnOff]}
          disabled={chapterIdx === chapterTabs.length - 1}
          onPress={() => goChapter(chapterIdx + 1)}>
          <Text style={styles.navBtnText}>下章</Text>
        </Pressable>
      </View>

      {popup ? (
        <WordPopup
          key={popup.key}
          word={popup.word}
          meaning={popup.meaning}
          anchorY={popup.anchorY}
          onDone={() => {
            setPopup(null);
            setActiveWord(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { alignItems: "center", justifyContent: "center" },
  muted: { color: theme.colors.textMuted },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  topBtn: { padding: 6, minWidth: 40 },
  topBtnText: { fontSize: 20, color: theme.colors.textMuted, fontWeight: "700" },
  topTitleWrap: { flex: 1, alignItems: "center" },
  topTitle: { fontSize: 17, fontWeight: "800", color: theme.colors.text },
  topSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  zhBtn: { flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "flex-end" },
  zhBtnText: { fontSize: 15, fontWeight: "800", color: theme.colors.text },
  zhDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.border },
  zhDotOn: { backgroundColor: theme.colors.accent },
  tabsWrap: { flexGrow: 0 },
  tabs: { paddingHorizontal: theme.spacing.md, gap: 8, paddingBottom: theme.spacing.sm },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tabOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  tabText: { fontSize: 13, fontWeight: "700", color: theme.colors.textMuted },
  tabTextOn: { color: "#fff" },
  body: { flex: 1 },
  chapterTitle: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
  chapterTitleEn: { fontSize: 14, color: theme.colors.textMuted, marginTop: 2 },
  summary: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  verse: {
    flexDirection: "row",
    gap: 10,
    marginBottom: theme.spacing.md,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginHorizontal: -8, // 抵消 padding，不给底色的那些节保持原来的左右位置
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  // 正在朗读的那一节：淡底色 + 左边一条竖线。配合自动滚到屏幕中间，
  // 眼睛不用找就知道读到哪儿了。
  verseOn: { backgroundColor: theme.colors.accentSoft, borderLeftColor: theme.colors.accent },
  verseNo: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.accent,
    minWidth: 22,
    paddingTop: 4,
    textAlign: "right",
  },
  verseNoOn: { color: theme.colors.accentDeep, fontSize: 14 },
  verseBody: { flex: 1 },
  en: { fontSize: 17, lineHeight: 27, color: theme.colors.text },
  zh: { fontSize: 14, lineHeight: 22, color: theme.colors.textMuted, marginTop: 5 },
  note: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.gold,
  },
  noteText: { fontSize: 12, lineHeight: 19, color: theme.colors.textMuted },
  source: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.lg,
    lineHeight: 17,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  navBtn: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  navBtnOff: { opacity: 0.35 },
  navBtnText: { fontSize: 12, fontWeight: "700", color: theme.colors.text },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleBtnOn: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
  toggleText: { fontSize: 12, fontWeight: "700", color: theme.colors.textMuted },
  toggleTextOn: { color: theme.colors.accentDeep },
  playBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
  },
  playBtnInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  playBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
