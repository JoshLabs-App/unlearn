-- 账号删除（App Store 审核 Guideline 5.1.1(v) 要求：支持注册就必须支持删号）。
--
-- 客户端拿的是 anon key，删 auth.users 需要 service_role，那个绝不能进 App 包里。
-- 所以走这个 security definer 的 RPC：函数以属主（postgres）权限执行，但只认
-- auth.uid()——调用者只能删掉自己那一个账号，传不了别人的 id 进来。
--
-- english_game_saves 那张表本来就带 on delete cascade，删 auth.users 会自动带走；
-- 排行榜表建在共享项目里、这个仓库没有它的迁移文件，不确定有没有外键，所以下面
-- 显式先删一遍。多删一次是幂等的，漏删会在排行榜上留下一行没主的昵称。
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.english_game_leaderboard where user_id = uid;
  delete from public.english_game_saves where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

-- 只有登录用户能调；匿名和公开角色一律拒绝。
revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
