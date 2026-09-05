// 排行榜内容。数据层（pushLeaderboardDebounced/fetchLeaderboard）Phase 1 就写好了
// ——GameContext 的 mutate() 每次答对都会推一份"昵称+总经验值"到 english_game_
// leaderboard 表。原本是独立页面（先是底部标签页，后来改成二级页面），现在直接
// 嵌进"角色成长"页面里——不用 ScrollView/下拉刷新（外层 growth.tsx 已经是一个
// ScrollView，嵌套滚动容器手势会打架），改成一个手动的"刷新"按钮。
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useGame } from "@/contexts/GameContext";
import { computePlayerLevel } from "@/lib/game/progress";
import { fetchLeaderboard, fetchMyRank, type LeaderboardRow, type MyRankInfo } from "@/lib/supabase/gameSync";
import { theme } from "@/lib/theme";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardBoard() {
  const { user } = useAuth();
  const { state } = useGame();
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [myRankInfo, setMyRankInfo] = useState<MyRankInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchLeaderboard(50);
    setRows(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const myTotalXp = state ? Object.values(state.skills).reduce((a, b) => a + b, 0) : 0;
  const myRank = rows && user ? rows.findIndex((r) => r.user_id === user.id) : -1;

  // 不在前 50 名可见榜单里时，另外查一下真实全局名次——玩家多了之后不可能把
  // 所有人都拉下来找自己排第几，两个 count-only 查询（见 fetchMyRank）不管
  // 玩家规模多大都只是常数开销。
  useEffect(() => {
    if (!user || rows === null) {
      setMyRankInfo(null);
      return;
    }
    if (rows.some((r) => r.user_id === user.id)) {
      setMyRankInfo(null);
      return;
    }
    void fetchMyRank(myTotalXp).then(setMyRankInfo);
  }, [user, rows, myTotalXp]);

  return (
    <View>
      <View style={styles.headRow}>
        <Text style={styles.title}>🏆 排行榜 <Text style={styles.zh}>Leaderboard</Text></Text>
        <Pressable onPress={() => void onRefresh()} disabled={refreshing} hitSlop={8}>
          <Text style={styles.refreshText}>{refreshing ? "刷新中…" : "🔄 刷新"}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>按总经验值排名 · 公开可见，登录后才会上榜</Text>

      {!user ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>你还没登录，答题不会计入排行榜，但可以看看别人的成绩</Text>
        </View>
      ) : myRank === -1 && rows !== null ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {myRankInfo
              ? `你排第 ${myRankInfo.rank} 名（共 ${myRankInfo.totalPlayers} 位玩家）· ${myTotalXp} XP`
              : `你的 ${myTotalXp} XP 还没上榜，去答几题吧`}
          </Text>
        </View>
      ) : null}

      {rows === null ? (
        <ActivityIndicator color={theme.colors.accent} style={styles.loading} />
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>还没有人上榜，当第一个吧</Text>
      ) : (
        <View style={styles.list}>
          {rows.map((row, i) => {
            const isMe = user && row.user_id === user.id;
            // 没有单独的头像图片系统——每一行的"头像"直接用这个人的玩家等级
            // 代替（跟首页 HUD 那个 ⭐ Lv.N 是同一套算法），一眼能看出排在
            // 前面的人是靠等级堆上去的还是靠稳定作答攒经验的。
            const rowLevel = computePlayerLevel(row.total_xp);
            return (
              <View key={row.user_id} style={[styles.row, isMe && styles.rowMe]}>
                <Text style={styles.rank}>{MEDALS[i] ?? `#${i + 1}`}</Text>
                <View style={styles.rowAvatar}>
                  <Text style={styles.rowAvatarText}>{rowLevel.level}</Text>
                </View>
                <Text style={[styles.nickname, isMe && styles.nicknameMe]} numberOfLines={1}>
                  {row.nickname || "Anonymous"}
                  {isMe ? " (你)" : ""}
                </Text>
                <Text style={styles.xp}>{row.total_xp} XP</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "800", color: theme.colors.text },
  zh: { fontSize: 14, color: theme.colors.textMuted, fontWeight: "400" },
  refreshText: { fontSize: 13, fontWeight: "700", color: theme.colors.accent },
  subtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2, marginBottom: theme.spacing.md },
  notice: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  noticeText: { color: theme.colors.accent, fontSize: 13, fontWeight: "600" },
  loading: { marginTop: theme.spacing.lg },
  empty: { color: theme.colors.textMuted, fontSize: 14, textAlign: "center", marginTop: theme.spacing.lg },
  list: { gap: theme.spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    ...theme.shadow.card,
  },
  rowMe: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  rank: { fontSize: 18, width: 34, textAlign: "center" },
  rowAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAvatarText: { fontSize: 12, fontWeight: "800", color: theme.colors.goldDeep },
  nickname: { flex: 1, fontSize: 15, fontWeight: "700", color: theme.colors.text },
  nicknameMe: { color: theme.colors.accent },
  xp: { fontSize: 14, fontWeight: "800", color: theme.colors.goldDeep },
});
