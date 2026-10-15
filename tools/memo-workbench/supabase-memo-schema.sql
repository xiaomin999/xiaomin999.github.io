-- ============================================================
-- 日迹 · 备忘录工作台  ——  云端建表脚本
-- ============================================================
-- 【在哪执行】Supabase 网页控制台 → 左侧 SQL Editor → New query → 整段粘贴 → Run
--            （注意：不是在本地终端执行）
--
-- 【安全性】本脚本只【新增】3 张 memo_ 开头的表，
--          不会修改、不会删除 couple-fatloss 用的 sync_state 表，
--          也不会动你库里任何现有数据。
--
-- 【回滚】如果哪天不想用了，执行下面这行即可彻底删除（你的减脂数据不受影响）：
--        drop table if exists public.memo_logs, public.memo_entries, public.memo_habits;
--
-- 【关于权限】你和另一半不用登录，共用一把 anon key，
--            所以 RLS 策略是"anon 可读写这 3 张表"。
--            含义：拿到这把 anon key 的人理论上能读到这 3 张表的内容（和 sync_state 同一模型）。
--            所以别把 key 发到公开仓库/群里。介意的话告诉我，我改成邮箱登录版。
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- 1. 固定习惯清单 ----------
create table if not exists public.memo_habits (
  id          uuid primary key default gen_random_uuid(),
  workspace   text        not null default 'memo-shared',
  name        text        not null,
  color       text        not null default '#378ADD',
  sort        integer     not null default 0,
  active      boolean     not null default true,
  author      text,
  updated_at  timestamptz not null default now()
);

-- ---------- 2. 习惯打卡（日历上的点主要来自这里）----------
create table if not exists public.memo_logs (
  id          uuid primary key default gen_random_uuid(),
  workspace   text        not null default 'memo-shared',
  habit_id    uuid        not null,
  day         date        not null,
  author      text,
  updated_at  timestamptz not null default now(),
  unique (habit_id, day)
);

-- ---------- 3. 每日流水（吃了什么 / 做了什么 / 心情 / 花费）----------
create table if not exists public.memo_entries (
  id          uuid primary key default gen_random_uuid(),
  workspace   text        not null default 'memo-shared',
  day         date        not null,
  kind        text        not null,          -- meal | activity | mood | expense
  slot        text,                          -- meal 专用：早餐/午餐/晚餐/加餐
  title       text        not null default '',
  note        text        not null default '',
  tags        text[]      not null default '{}',
  amount      numeric,                       -- expense 专用
  payload     jsonb       not null default '{}'::jsonb,   -- mood: {mood,energy,sleep}
  author      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists memo_entries_ws_day_idx on public.memo_entries (workspace, day desc);
create index if not exists memo_logs_ws_day_idx    on public.memo_logs    (workspace, day desc);
create index if not exists memo_habits_ws_idx      on public.memo_habits  (workspace, sort);

-- ---------- 行级安全 ----------
alter table public.memo_habits  enable row level security;
alter table public.memo_logs    enable row level security;
alter table public.memo_entries enable row level security;

drop policy if exists memo_habits_all  on public.memo_habits;
drop policy if exists memo_logs_all    on public.memo_logs;
drop policy if exists memo_entries_all on public.memo_entries;

create policy memo_habits_all  on public.memo_habits  for all to anon, authenticated using (true) with check (true);
create policy memo_logs_all    on public.memo_logs    for all to anon, authenticated using (true) with check (true);
create policy memo_entries_all on public.memo_entries for all to anon, authenticated using (true) with check (true);

-- ---------- 实时同步（删除时需要旧值，故用 full）----------
alter table public.memo_entries replica identity full;
alter table public.memo_logs    replica identity full;
alter table public.memo_habits  replica identity full;

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.memo_habits';  exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.memo_logs';    exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.memo_entries'; exception when others then null; end;
end $$;

-- ---------- 第一批默认习惯（和前端内置的一致，可重复执行不重复插）----------
insert into public.memo_habits (workspace, name, color, sort)
select 'memo-shared', v.name, v.color, v.sort
from (values
  ('运动', '#378ADD', 1),
  ('早睡', '#1D9E75', 2),
  ('读书', '#EF9F27', 3),
  ('喝水 2L', '#85B7EB', 4),
  ('护肤', '#D4537E', 5)
) as v(name, color, sort)
where not exists (
  select 1 from public.memo_habits h where h.workspace = 'memo-shared'
);

-- ---------- 完成 ----------
-- 执行完应当看到类似 "Success. No rows returned"。
-- 回到工作台点【设置 → 立即同步】即可拉取。
