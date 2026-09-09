// 删除账号（App Store Guideline 5.1.1(v)）。
//
// 真正的删除动作在 Supabase 那边的 delete_own_account() RPC 里——见
// supabase/migrations/20260909000000_delete_own_account.sql。这里只负责调它，
// 因为客户端只有 anon key，删 auth.users 需要 service_role，那个不能进 App。
// RPC 认的是 auth.uid()，所以调用方不用（也不能）传 user id 进去。
import { getSupabase } from "./client";

export async function deleteOwnAccount(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("未配置云端账号服务");

  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw error;
}
