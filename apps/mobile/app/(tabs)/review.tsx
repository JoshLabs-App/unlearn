// 待复习页面：state.reviewQueue 之前只在闪回复习小游戏里出现，没有一个能直接浏览
// 的列表页——这里把它摊开展示，kind==="word" 的条目摆回收藏时那句台词里（词本身
// 标绿），不是干巴巴地列一个孤立的单词；kind==="sentence" 的条目本来就是完整的
// 一句话（答错时记的是那句正确答案），直接显示即可。
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

import { useGame } from "@/contexts/GameContext";
import { playLine, playWord } from "@/lib/game/audio";
import type { ReviewItem } from "@/lib/game/types";
import { theme } from "@/lib/theme";

function HighlightedSentence({
  sentence,
  word,
  style,
  highlightStyle,
}: {
  sentence: string;
  word: string;
  style: StyleProp<TextStyle>;
  highlightStyle: StyleProp<TextStyle>;
}) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = sentence.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.toLowerCase() === word.toLowerCase() ? (
          <Text key={i} style={highlightStyle}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

function ReviewRow({ item }: { item: ReviewItem }) {
  const isWord = item.kind === "word";
  const sentence = isWord ? item.sentence : item.en;
  const sentenceZh = isWord ? item.sentenceZh : item.zh;
  // 复习页的解释跟"更多"页那个全局隐藏中文的开关脱钩——那个开关管的是主线剧情
  // 阅读时要不要显示翻译，这里的诉求完全相反：本来就是来看释义的，只是不希望
  // 进页面就一次性铺满一整屏中文，改成点一下才展开，点的同时顺便读一遍发音。
  const [revealed, setRevealed] = useState(false);

  function handlePress() {
    setRevealed(true);
    void (isWord ? playWord(item.en) : playLine(item.en));
  }

  return (
    <Pressable
      style={[styles.row, item.status === "pendingFinal" ? styles.rowMastered : styles.rowLearning]}
      onPress={handlePress}>
      {isWord ? null : (
        <View style={styles.rowHead}>
          <Text style={styles.kindBadge}>💬 句</Text>
        </View>
      )}

      {sentence ? (
        <HighlightedSentence
          sentence={sentence}
          word={item.en}
          style={styles.sentenceEn}
          highlightStyle={styles.wordHighlight}
        />
      ) : (
        <Text style={[styles.sentenceEn, styles.wordHighlight]}>{item.en}</Text>
      )}
      {revealed ? (
        <Text style={styles.sentenceZh}>
          {isWord ? `${item.en} — ${item.zh}` : sentenceZh || item.zh}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function ReviewScreen() {
  const { state } = useGame();
  // 不会的生词排上面（更需要马上看到），已经连对两次、只差最终确认的排下面——
  // 不用文字标注"待最终确认"，靠 ReviewRow 的框底色区分两类就够了。sort 是稳定
  // 排序，同一类内部保持原本入队顺序。
  const items = useMemo(() => {
    const queue = state?.reviewQueue ?? [];
    return [...queue].sort((a, b) => {
      const aMastered = a.status === "pendingFinal" ? 1 : 0;
      const bMastered = b.status === "pendingFinal" ? 1 : 0;
      return aMastered - bMastered;
    });
  }, [state]);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{items.length} 条</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>还没有待复习的内容——答错的题、点查过的词都会出现在这里</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => `${item.kind}:${item.en}:${i}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ReviewRow item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  subtitle: { fontSize: 14, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  empty: { color: theme.colors.textMuted, fontSize: 15, textAlign: "center", marginTop: theme.spacing.xl },
  list: { paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm + 2,
    ...theme.shadow.card,
  },
  // 不用文字标"待最终确认"，靠框的底色分两类：还在学的用默认白底，连对两次
  // 只差最终确认的换成 correct 同色系的浅绿底——跟主线答对时同一套"绿=学会了"
  // 的语义，一眼扫过去就知道哪些快毕业了，不用逐条读文字。
  rowLearning: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  rowMastered: { backgroundColor: theme.colors.correctSoft, borderColor: theme.colors.correct },
  rowHead: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, marginBottom: 4 },
  kindBadge: { fontSize: 12, fontWeight: "700", color: theme.colors.textMuted },
  sentenceEn: { fontSize: 18, lineHeight: 24, color: theme.colors.text, fontWeight: "600" },
  wordHighlight: { color: theme.colors.correct, fontWeight: "800" },
  sentenceZh: { fontSize: 14, lineHeight: 19, color: theme.colors.textMuted, marginTop: 4 },
});
