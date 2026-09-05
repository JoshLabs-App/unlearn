// 分类词表页：从"角色成长"页点某个技能分类进来，把该分类下全部场景的正确答案
// 例句摊平列出来。PORTED from a-decade-apart/category.js（collectCategorySentences/
// wrapWordsHTML/showWordPopup），点词查释义 + 收藏进复习队列的逻辑跟主线剧情复用
// 同一套 useGame() 接口，不用另外实现一份。
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { WordPopup } from "@/components/game/WordPopup";
import { WordText } from "@/components/game/WordText";
import { useGame } from "@/contexts/GameContext";
import { playLine, playWord } from "@/lib/game/audio";
import { collectCategorySentences, isContentWord, type CategorySentence } from "@/lib/game/category";
import { lookupWord } from "@/lib/game/dictionary";
import { theme } from "@/lib/theme";

function CategoryRow({
  sentence,
  isKnownWord,
  onWordPress,
}: {
  sentence: CategorySentence;
  isKnownWord: (word: string) => boolean;
  onWordPress: (word: string, event: GestureResponderEvent, sentenceEn: string, sentenceZh: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  function handlePlay() {
    setRevealed(true);
    void playLine(sentence.en);
  }

  return (
    <View style={styles.row}>
      <Pressable style={styles.playBtn} onPress={handlePlay} hitSlop={8}>
        <Text style={styles.playIcon}>▶</Text>
      </Pressable>
      <View style={styles.textCol}>
        <WordText
          text={sentence.en}
          style={styles.en}
          onWordPress={(word, e) => onWordPress(word, e, sentence.en, sentence.zh)}
          highlightWord={(word) => isContentWord(word) || isKnownWord(word)}
        />
        {revealed ? <Text style={styles.zh}>{sentence.zh}</Text> : null}
      </View>
    </View>
  );
}

export default function CategoryScreen() {
  const { skill } = useLocalSearchParams<{ skill: string }>();
  const { content, state, queueWordForReview } = useGame();
  const meta = skill ? content.skillMeta[skill] : undefined;

  const sentences = useMemo(
    () => (skill ? collectCategorySentences(content, skill) : []),
    [content, skill],
  );

  // 已经点查过、收藏进复习队列的词常驻染色——跟"内容词"提示是两回事：这个是
  // "你查过"的个人记录，全站统一同一套绿色。
  const knownWords = useMemo(
    () => new Set((state?.reviewQueue ?? []).filter((r) => r.kind === "word").map((r) => r.en.toLowerCase())),
    [state],
  );
  const isKnownWord = (word: string) => knownWords.has(word.toLowerCase());

  const [wordPopup, setWordPopup] = useState<
    { key: number; word: string; meaning: string; anchorY: number } | null
  >(null);

  function handleWordPress(
    rawWord: string,
    event: GestureResponderEvent,
    sentenceEn: string,
    sentenceZh: string,
  ) {
    const lower = rawWord.toLowerCase();
    const meaning = lookupWord(lower);
    if (!meaning) return;
    setWordPopup({ key: Date.now(), word: rawWord, meaning, anchorY: event.nativeEvent.pageY });
    void playWord(lower);
    queueWordForReview(lower, meaning, sentenceEn, sentenceZh);
  }

  if (!meta) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>没找到这个分类</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: meta.labelEn }} />
      <View style={styles.container}>
        <Text style={styles.title}>
          {meta.icon} {meta.labelEn} <Text style={styles.zhTitle}>{meta.label}</Text>
        </Text>
        <Text style={styles.subtitle}>共 {sentences.length} 句</Text>

        {sentences.length === 0 ? (
          <Text style={styles.empty}>这个分类暂时还没有例句</Text>
        ) : (
          <FlatList
            data={sentences}
            keyExtractor={(item, i) => `${item.en}:${i}`}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <CategoryRow sentence={item} isKnownWord={isKnownWord} onWordPress={handleWordPress} />
            )}
          />
        )}
      </View>

      {wordPopup ? (
        <WordPopup
          key={wordPopup.key}
          word={wordPopup.word}
          meaning={wordPopup.meaning}
          anchorY={wordPopup.anchorY}
          onDone={() => setWordPopup(null)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  title: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
  zhTitle: { fontSize: 14, color: theme.colors.textMuted, fontWeight: "400" },
  subtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2, marginBottom: theme.spacing.sm },
  empty: { color: theme.colors.textMuted, fontSize: 15, textAlign: "center", marginTop: theme.spacing.xl },
  list: { paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm + 2,
    ...theme.shadow.card,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { fontSize: 13, color: theme.colors.accent },
  textCol: { flex: 1 },
  en: { fontSize: 18, lineHeight: 24, color: theme.colors.text, fontWeight: "600" },
  zh: { fontSize: 14, lineHeight: 19, color: theme.colors.textMuted, marginTop: 4 },
});
