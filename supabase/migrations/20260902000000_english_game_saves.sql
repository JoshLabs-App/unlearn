-- English Game (十年之约) 云端存档：一人一行，state 存整份游戏进度 JSON。
-- 复用 josh-apps 共享 Supabase 项目，按现有惯例（如 askbible_profiles）加前缀表 + RLS 只认自己。

create table if not exists public.english_game_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  schema_version integer not null default 1,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.english_game_saves enable row level security;

drop policy if exists "english_game_saves_select_own" on public.english_game_saves;
create policy "english_game_saves_select_own"
  on public.english_game_saves
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "english_game_saves_insert_own" on public.english_game_saves;
create policy "english_game_saves_insert_own"
  on public.english_game_saves
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "english_game_saves_update_own" on public.english_game_saves;
create policy "english_game_saves_update_own"
  on public.english_game_saves
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
