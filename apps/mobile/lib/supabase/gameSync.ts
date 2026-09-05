// PORTED from a-decade-apart/auth.js:59-116 (pushSave/pullSave/pushLeaderboard/
// fetchLeaderboard) — same tables, same debounce windows, same upsert shape. The web
// version reads `currentUser` off a module-level GameAuth singleton; here the caller
// (contexts/GameContext.tsx) already knows the signed-in user id from AuthContext, so
// these take it as a parameter instead.
import { getSupabase } from "./client";
import type { GameState } from "@/lib/game/types";

const SAVE_TABLE = "english_game_saves";
const PUSH_DEBOUNCE_MS = 1200;

// 排行榜走独立的小表，只装"昵称+总分"，跟 english_game_saves（含复习队列等更细的
// 学习数据）分开——那张表按单用户设计的 RLS 不开放跨用户读，这张表反过来：
// 谁都能 SELECT，但只能 upsert 自己那一行（auth.uid() = user_id）。
const LEADERBOARD_TABLE = "english_game_leaderboard";
const LEADERBOARD_PUSH_DEBOUNCE_MS = 1500;

export async function pushSaveNow(userId: string, state: GameState): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from(SAVE_TABLE).upsert({
    user_id: userId,
    state,
    updated_at: new Date().toISOString(),
  });
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function pushSaveDebounced(userId: string | null, state: GameState): void {
  if (!userId) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushSaveNow(userId, state), PUSH_DEBOUNCE_MS);
}

export async function pullSave(userId: string): Promise<GameState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(SAVE_TABLE)
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.state as GameState;
}

export interface LeaderboardEntry {
  nickname: string;
  totalXp: number;
}

export async function pushLeaderboardNow(userId: string, entry: LeaderboardEntry): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from(LEADERBOARD_TABLE).upsert({
    user_id: userId,
    nickname: entry.nickname,
    total_xp: entry.totalXp,
    updated_at: new Date().toISOString(),
  });
}

let leaderboardTimer: ReturnType<typeof setTimeout> | null = null;
export function pushLeaderboardDebounced(userId: string | null, entry: LeaderboardEntry): void {
  if (!userId) return;
  if (leaderboardTimer) clearTimeout(leaderboardTimer);
  leaderboardTimer = setTimeout(
    () => void pushLeaderboardNow(userId, entry),
    LEADERBOARD_PUSH_DEBOUNCE_MS,
  );
}

export interface LeaderboardRow {
  user_id: string;
  nickname: string;
  total_xp: number;
}

// 公开榜单，不需要登录也能查——未登录用户看得到榜但不上榜。
export async function fetchLeaderboard(limit = 10): Promise<LeaderboardRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(LEADERBOARD_TABLE)
    .select("user_id, nickname, total_xp")
    .order("total_xp", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export interface MyRankInfo {
  rank: number; // 1-based
  totalPlayers: number;
}

// 玩家数一大就不可能把所有人都拉下来找自己排第几——用两个 count-only 查询
// （只要行数，不要行内容）算名次：比我分高的人数 + 1 = 我的名次。哪怕以后有
// 几十万玩家，这两个查询也只是索引上的计数，不会因为榜单变长而变慢。
export async function fetchMyRank(myTotalXp: number): Promise<MyRankInfo | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const [{ count: ahead }, { count: total }] = await Promise.all([
    supabase
      .from(LEADERBOARD_TABLE)
      .select("user_id", { count: "exact", head: true })
      .gt("total_xp", myTotalXp),
    supabase.from(LEADERBOARD_TABLE).select("user_id", { count: "exact", head: true }),
  ]);
  if (ahead === null || total === null) return null;
  return { rank: ahead + 1, totalPlayers: total };
}
