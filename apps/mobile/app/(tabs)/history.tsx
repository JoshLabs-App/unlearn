// 全部对话页面：参考网页版 dialogue.js 的设计——完整剧本总览，不跟玩家进度挂钩，
// 所有场景的台词按剧情顺序摊平列出来，从上往下一路滚（不是翻页/滑动卡片，那个交互
// 在主游戏页的"回顾模式"，见 index.tsx 的 browseIndex）。构建逻辑见
// lib/game/history.ts 的 buildFullScript（现算不存档）。
import { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useGame } from "@/contexts/GameContext";
import { buildFullScript, type HistoryEntry } from "@/lib/game/history";
import { playLine } from "@/lib/game/audio";
import { theme } from "@/lib/theme";

// PORTED from a-decade-apart/dialogue.js 的 GAP_MS：连续播放时每句放完之后停顿的
// 时长，不用手动点下一句。
const GAP_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 摊平成"一句一条"的播放列表——NPC 台词和玩家答对的那句是分开的两条，跟网页版
// ALL_LINES 一样的粒度（不是按 entry 一次放两句）。
interface PlaylistItem {
  entryIndex: number;
  isPlayer: boolean;
  text: string;
}

function buildPlaylist(entries: HistoryEntry[]): PlaylistItem[] {
  const list: PlaylistItem[] = [];
  entries.forEach((entry, entryIndex) => {
    list.push({ entryIndex, isPlayer: false, text: entry.npcEn });
    if (entry.answerEn) list.push({ entryIndex, isPlayer: true, text: entry.answerEn });
  });
  return list;
}

export default function HistoryScreen() {
  const { content, loading, hideZh, toggleZh } = useGame();

  const entries = useMemo(() => buildFullScript(content), [content]);
  const playlist = useMemo(() => buildPlaylist(entries), [entries]);

  // 当前播放到播放列表的第几条（不是 entries 的下标）：null = 没在放。跟网页版
  // playToken 一样，用递增 token 判断"这一轮还有没有效"，点停止/点别的地方都能
  // 干净打断，不会出现旧的一轮放完了才发现自己早就该停了。
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const playTokenRef = useRef(0);
  const isPlayingAll = playingIdx !== null;

  async function playAllFrom(startIdx: number) {
    const myToken = ++playTokenRef.current;
    for (let i = startIdx; i < playlist.length; i++) {
      if (myToken !== playTokenRef.current) return;
      setPlayingIdx(i);
      await playLine(playlist[i].text);
      if (myToken !== playTokenRef.current) return;
      await sleep(GAP_MS);
    }
    if (myToken === playTokenRef.current) setPlayingIdx(null);
  }

  function stopPlayback() {
    playTokenRef.current++;
    setPlayingIdx(null);
  }

  const playingEntryIndex = playingIdx !== null ? playlist[playingIdx].entryIndex : null;
  const playingIsPlayer = playingIdx !== null ? playlist[playingIdx].isPlayer : false;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text style={styles.title}>📖 全部对话</Text>
          <Text style={styles.subtitle}>{entries.length} 句 · 完整剧本总览</Text>
        </View>
        <Pressable style={styles.zhToggle} onPress={toggleZh}>
          <Text style={styles.zhToggleText}>{hideZh ? "显示中文" : "隐藏中文"}</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.playAllBtn, isPlayingAll && styles.playAllBtnPlaying]}
        onPress={() => (isPlayingAll ? stopPlayback() : void playAllFrom(0))}>
        <Text style={[styles.playAllBtnText, isPlayingAll && styles.playAllBtnTextPlaying]}>
          {isPlayingAll ? "⏹ 停止播放" : "▶ 连续播放全部对话"}
        </Text>
      </Pressable>

      {loading ? (
        <Text style={styles.empty}>加载中…</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, i) => `${item.sceneId}:${i}`}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <HistoryRow
              entry={item}
              showSceneHeader={index === 0 || entries[index - 1].sceneId !== item.sceneId}
              hideZh={hideZh}
              npcPlaying={playingEntryIndex === index && !playingIsPlayer}
              answerPlaying={playingEntryIndex === index && playingIsPlayer}
            />
          )}
        />
      )}
    </View>
  );
}

function HistoryRow({
  entry,
  showSceneHeader,
  hideZh,
  npcPlaying,
  answerPlaying,
}: {
  entry: HistoryEntry;
  showSceneHeader: boolean;
  hideZh: boolean;
  npcPlaying: boolean;
  answerPlaying: boolean;
}) {
  return (
    <View>
      {showSceneHeader ? (
        <View style={styles.sceneHeader}>
          <Text style={styles.sceneAvatar}>{entry.avatar}</Text>
          <View>
            <Text style={styles.sceneTitle}>{entry.sceneTitle}</Text>
            <Text style={styles.sceneSubtitle}>{entry.sceneSubtitle}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.npcRow}>
        {/* 对话人物图标：常驻显示在每一句 NPC 台词前面，不只是场景标题那一次——
            列表拉长之后场景标题早就滚出屏幕，光靠开头那一次没法一直认得出
            "这句是谁说的"。 */}
        <Text style={styles.lineAvatar}>{entry.avatar}</Text>
        <Pressable
          style={[styles.bubble, npcPlaying && styles.bubblePlaying]}
          onPress={() => void playLine(entry.npcEn)}>
          <Text style={styles.npcEn}>{entry.npcEn}</Text>
          {hideZh ? null : <Text style={styles.npcZh}>{entry.npcZh}</Text>}
        </Pressable>
      </View>
      {entry.answerEn ? (
        <Pressable
          style={[styles.answerBubble, answerPlaying && styles.answerBubblePlaying]}
          onPress={() => void playLine(entry.answerEn)}>
          <Text style={styles.answerEn}>你：{entry.answerEn}</Text>
          {hideZh ? null : <Text style={styles.answerZh}>{entry.answerZh}</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: theme.spacing.sm },
  flex1: { flex: 1 },
  title: { fontSize: 26, fontWeight: "800", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textMuted, marginBottom: theme.spacing.sm, marginTop: 2 },
  zhToggle: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
  },
  zhToggleText: { fontSize: 13, fontWeight: "700", color: theme.colors.text },
  playAllBtn: {
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 10,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.accentSoft,
  },
  playAllBtnPlaying: { backgroundColor: theme.colors.accent },
  playAllBtnText: { fontSize: 14, fontWeight: "800", color: theme.colors.accent },
  playAllBtnTextPlaying: { color: theme.colors.surface },
  empty: { color: theme.colors.textMuted, fontSize: 14, textAlign: "center", marginTop: theme.spacing.xl },
  list: { paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  sceneHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  sceneAvatar: {
    fontSize: 22,
    width: 40,
    height: 40,
    lineHeight: 40,
    textAlign: "center",
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 20,
  },
  sceneTitle: { fontSize: 17, fontWeight: "800", color: theme.colors.text },
  sceneSubtitle: { fontSize: 13, color: theme.colors.textMuted },
  npcRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  lineAvatar: {
    fontSize: 15,
    width: 26,
    height: 26,
    lineHeight: 26,
    textAlign: "center",
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 13,
    marginBottom: 8,
  },
  bubble: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm + 2,
    marginBottom: 8,
  },
  bubblePlaying: { borderColor: theme.colors.accent, borderWidth: 2 },
  npcEn: { fontSize: 19, lineHeight: 25, color: theme.colors.text, fontWeight: "600" },
  npcZh: { fontSize: 15, lineHeight: 20, color: theme.colors.textMuted, marginTop: 4 },
  answerBubble: {
    alignSelf: "flex-end",
    maxWidth: "88%",
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm + 2,
    marginBottom: theme.spacing.xs,
  },
  answerBubblePlaying: { borderWidth: 2, borderColor: theme.colors.accent },
  answerEn: { fontSize: 17, lineHeight: 23, color: theme.colors.accent, fontWeight: "600" },
  answerZh: { fontSize: 14, lineHeight: 19, color: theme.colors.accent, opacity: 0.8, marginTop: 4 },
});
