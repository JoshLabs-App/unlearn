// Account + extension points for Phase 2 features (achievements wall, leaderboard,
// avatar upload/crop, dialogue history replay — a-decade-apart/main.js has all four,
// none are ported yet). Kept as simple "coming soon" stubs per the Phase 1 plan so the
// tab exists and the navigation shape is already in place for Phase 2 to fill in.
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AnimatedProgressBar } from "@/components/game/AnimatedProgressBar";
import { PrimaryButton } from "@/components/game/PrimaryButton";
import { useAuth } from "@/contexts/AuthContext";
import { useGame } from "@/contexts/GameContext";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { computePlayerLevel, totalXpAcrossBooks } from "@/lib/game/progress";
import { theme } from "@/lib/theme";

// 待复习、对话回放现在是底部独立的标签页了，不再需要这里的入口卡片——排行榜挪到
// "角色成长"页里去了（不再单占一个底部标签位）——成就墙数据/页面也已经接上。
// 头像上传裁剪不做了：没有单独的头像图片系统，"头像"直接用玩家等级代替
// （见下面账号卡片里的 ⭐ Lv.N 徽章），不需要这个占位卡。

export default function MoreScreen() {
  const router = useRouter();
  const { user, loading, signOut, deleteAccount } = useAuth();
  const { state, resetGame, hideZh, toggleZh, setPlayerName } = useGame();
  const unlocked = new Set(state?.unlockedAchievements ?? []);

  const totalXp = totalXpAcrossBooks(state);
  const playerLevel = computePlayerLevel(totalXp);

  // 改昵称：没有跨平台的系统弹窗输入框（Alert.prompt 只有 iOS 有），改成点铅笔图标
  // 切进一个内联编辑态，输入框+确定/取消按钮都是自己画的。
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(state?.playerName ?? "");
  useEffect(() => {
    if (!editingName) setNameInput(state?.playerName ?? "");
  }, [state?.playerName, editingName]);

  function saveName() {
    setPlayerName(nameInput);
    setEditingName(false);
  }

  function confirmReset() {
    Alert.alert("重新开始", "会清空本地进度（云端存档下次登录同步时也会被覆盖），确定吗？", [
      { text: "取消", style: "cancel" },
      { text: "确定", style: "destructive", onPress: () => void resetGame() },
    ]);
  }

  // 删除账号（App Store Guideline 5.1.1(v)：支持注册就必须支持在 App 内删号）。
  // 两级确认——第一级讲清后果，第二级才是真的按下去，Apple 允许加确认步骤防误触。
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function runDeleteAccount() {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      // 云端删干净之后再清本地，否则本地清了、云端删失败，人还登着账号但进度没了。
      await resetGame();
      Alert.alert("账号已删除", "你的账号、学习进度和排行榜成绩已经从云端永久清除。");
    } catch (e) {
      Alert.alert(
        "删除失败",
        `${e instanceof Error ? e.message : "请检查网络后重试"}。如果一直不成功，可以发邮件到 josh.zeng.ca@gmail.com 找我处理。`,
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "删除账号",
      "删除后，你的学习进度、词汇记录和排行榜成绩会从云端永久清除，无法恢复；这台设备上的本地进度也会一并清空。",
      [
        { text: "取消", style: "cancel" },
        { text: "继续", style: "destructive", onPress: confirmDeleteAccountFinal },
      ],
    );
  }

  function confirmDeleteAccountFinal() {
    Alert.alert("确认永久删除账号？", "这一步无法撤销。", [
      { text: "取消", style: "cancel" },
      { text: "永久删除", style: "destructive", onPress: () => void runDeleteAccount() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.sectionTitle}>账号</Text>
      <View style={styles.card}>
        {/* "头像"不是图片，是玩家等级徽章——跟排行榜/首页 HUD 那个 ⭐ Lv.N 是
            同一个数字，不用另外维护一套头像上传/裁剪系统。 */}
        <View style={styles.profileRow}>
          <View style={styles.avatarLevel}>
            <Text style={styles.avatarLevelText}>⭐{"\n"}Lv.{playerLevel.level}</Text>
          </View>
          <View style={styles.flex1}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="起个昵称"
                  placeholderTextColor={theme.colors.textMuted}
                  maxLength={20}
                  autoFocus
                  onSubmitEditing={saveName}
                />
                <Pressable style={styles.nameEditBtn} onPress={saveName} hitSlop={8}>
                  <Text style={styles.nameEditBtnText}>✓</Text>
                </Pressable>
                <Pressable
                  style={styles.nameEditBtn}
                  onPress={() => setEditingName(false)}
                  hitSlop={8}>
                  <Text style={styles.nameEditBtnText}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.nameRow} onPress={() => setEditingName(true)}>
                <Text style={styles.nickname} numberOfLines={1}>
                  {state?.playerName ?? "…"}
                </Text>
                <Text style={styles.nameEditIcon}>✏️</Text>
              </Pressable>
            )}
            {loading ? (
              <Text style={styles.hint}>加载中…</Text>
            ) : user ? (
              <Text style={styles.accountEmail} numberOfLines={1} ellipsizeMode="middle">
                {user.email ?? "已登录"}
              </Text>
            ) : (
              <Text style={styles.hint}>登录后进度可跨设备同步</Text>
            )}
          </View>
        </View>
        {/* Lv.N 单独摆着看不出任何信息——computePlayerLevel 早就把 xpIntoLevel/
            xpForNext 算好了，这里把它显示出来，等级才有了"离下一级还有多远"的
            上下文。数字直接来自真实 XP，不做任何美化（设计原则 7：度量要诚实，
            进度条虚了整个卖点就是负资产）。 */}
        <View style={styles.levelProgress}>
          <AnimatedProgressBar pct={playerLevel.pct} height={7} gradient={theme.levelGradient} glow />
          <Text style={styles.levelProgressText}>
            {playerLevel.xpIntoLevel}/{playerLevel.xpForNext} XP
            <Text style={styles.levelProgressMuted}>
              {"  ·  还差 " + (playerLevel.xpForNext - playerLevel.xpIntoLevel) + " 升到 Lv." + (playerLevel.level + 1)}
            </Text>
          </Text>
        </View>

        {loading ? null : user ? (
          <>
            <PrimaryButton label="退出登录" variant="surface" onPress={() => void signOut()} />
            <Pressable
              style={styles.deleteAccountBtn}
              disabled={deletingAccount}
              onPress={confirmDeleteAccount}>
              <Text style={styles.deleteAccountText}>
                {deletingAccount ? "正在删除…" : "删除账号"}
              </Text>
            </Pressable>
          </>
        ) : (
          <PrimaryButton label="登录账号" onPress={() => router.push("/auth")} />
        )}
      </View>

      <Text style={styles.sectionTitle}>显示设置</Text>
      <View style={styles.card}>
        <Pressable style={styles.settingRow} onPress={toggleZh}>
          <Text style={styles.settingLabel}>对话中文翻译</Text>
          <Text style={styles.settingValue}>{hideZh ? "隐藏" : "显示"}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>
        🏆 成就墙 <Text style={styles.sectionCount}>{unlocked.size}/{ACHIEVEMENTS.length}</Text>
      </Text>
      <View style={styles.stubGrid}>
        {ACHIEVEMENTS.map((a) => {
          const done = unlocked.has(a.id);
          return (
            <View key={a.id} style={[styles.achieveCard, done && styles.achieveCardDone]}>
              <View style={[styles.achieveIconBadge, done && styles.achieveIconBadgeDone]}>
                <Text style={styles.achieveIcon}>{done ? a.icon : "🔒"}</Text>
              </View>
              <Text style={[styles.achieveTitle, !done && styles.achieveTitleLocked]}>{a.title}</Text>
              <Text style={styles.achieveDesc}>{a.desc}</Text>
            </View>
          );
        })}
      </View>

      <Pressable style={styles.guideCard} onPress={() => router.push("/guide")}>
        <Text style={styles.guideIcon}>📖</Text>
        <View style={styles.flex1}>
          <Text style={styles.guideTitle}>重播开场序章</Text>
          <Text style={styles.guideSubtitle}>选一遍就懂——这个游戏为什么这样设计</Text>
        </View>
        <Text style={styles.guideArrow}>›</Text>
      </Pressable>

      {/* 破坏性操作单独垫底，并且给一圈描边——之前是一行孤零零的红字，既没有
          边界感也容易在滑动时误触。它清的是本机进度，跟账号卡片里那个"删除账号"
          （连云端一起删）不是一回事，所以两者分开放、措辞也写清楚。 */}
      <Pressable style={styles.dangerButton} onPress={confirmReset}>
        <Text style={styles.dangerButtonText}>重新开始游戏</Text>
      </Pressable>
      <Text style={styles.dangerHint}>只清空这台设备上的进度，不会删除账号</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow.card,
  },
  guideCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    padding: theme.spacing.md,
  },
  guideIcon: { fontSize: 24 },
  guideTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  guideSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  guideArrow: { fontSize: 22, color: theme.colors.accent, fontWeight: "700" },
  sectionCount: { fontSize: 14, color: theme.colors.textMuted, fontWeight: "600" },
  hint: { color: theme.colors.textMuted, fontSize: 15 },
  accountEmail: { color: theme.colors.text, fontSize: 16, fontWeight: "700" },
  // 删号入口做成弱视觉的文字按钮：Apple 要求它在 App 内可达，但它不该跟"退出登录"
  // 抢注意力——真要删的人找得到，误触的人碰不着。
  deleteAccountBtn: { alignItems: "center", paddingVertical: 12, marginTop: 2 },
  deleteAccountText: { color: theme.colors.wrong, fontSize: 13, fontWeight: "700" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  avatarLevel: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLevelText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.goldDeep,
    textAlign: "center",
    lineHeight: 14,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nickname: { fontSize: 18, fontWeight: "800", color: theme.colors.text, flexShrink: 1 },
  nameEditIcon: { fontSize: 14 },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  nameEditBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accentSoft,
  },
  nameEditBtnText: { fontSize: 15, fontWeight: "800", color: theme.colors.accent },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingLabel: { color: theme.colors.text, fontSize: 15, fontWeight: "600" },
  settingValue: { color: theme.colors.accent, fontSize: 15, fontWeight: "700" },
  flex1: { flex: 1 },
  stubGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  // 已解锁的成就卡跟"敬请期待"卡共用一套网格布局，但视觉反过来：解锁的用实心
  // 金色描边+彩色图标底庆祝一下，没解锁的保持中性灰，一眼能分清哪些拿到了。
  achieveCard: {
    width: "47%",
    // 描述文字有一行有两行，不给最小高度的话同一行的两张卡会一高一矮。
    // justifyContent 让内容在等高的卡里垂直居中，而不是顶着上边缘。
    minHeight: 132,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: 2,
  },
  achieveCardDone: { borderColor: theme.colors.gold, ...theme.shadow.card },
  achieveIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  achieveIconBadgeDone: { backgroundColor: theme.colors.goldSoft },
  achieveIcon: { fontSize: 20 },
  achieveTitle: { fontSize: 14, fontWeight: "800", color: theme.colors.text },
  achieveTitleLocked: { color: theme.colors.textMuted },
  achieveDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 15,
  },
  dangerButton: {
    marginTop: theme.spacing.lg,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.wrong,
    backgroundColor: theme.colors.surface,
  },
  dangerButtonText: { color: theme.colors.wrong, fontWeight: "700", fontSize: 15 },
  dangerHint: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  levelProgress: { gap: 5, marginTop: 2 },
  levelProgressText: { fontSize: 12, fontWeight: "800", color: theme.colors.goldDeep },
  levelProgressMuted: { fontWeight: "600", color: theme.colors.textMuted },
});
