-- ============================================================
-- 灵感匣 (Linggan Xia) · Supabase 建表脚本
-- 在 Supabase 后台 → SQL Editor 中一次性执行本脚本即可。
-- 复用你现有的 Supabase 项目，仅新建一个 ideas 表。
-- ============================================================

-- 1) 主表
create table if not exists public.ideas (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null default '',
  content     text        not null default '',
  source_url  text,
  source_type text        not null default 'manual', -- wechat | xiaohongshu | web | manual | other
  category    text        not null default '其他',
  tags        text[]      not null default '{}',
  starred     boolean     not null default false,
  status      text        not null default 'idea',   -- idea | doing | done | archived
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) 行级安全（只让自己看/改自己的数据）
alter table public.ideas enable row level security;

drop policy if exists "ideas_select_own" on public.ideas;
create policy "ideas_select_own" on public.ideas
  for select using (auth.uid() = user_id);

drop policy if exists "ideas_insert_own" on public.ideas;
create policy "ideas_insert_own" on public.ideas
  for insert with check (auth.uid() = user_id);

drop policy if exists "ideas_update_own" on public.ideas;
create policy "ideas_update_own" on public.ideas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ideas_delete_own" on public.ideas;
create policy "ideas_delete_own" on public.ideas
  for delete using (auth.uid() = user_id);

-- 3) 索引（加速按用户+时间查询）
create index if not exists ideas_user_created_idx on public.ideas (user_id, created_at desc);
create index if not exists ideas_user_category_idx on public.ideas (user_id, category);

-- 4) 自动维护 updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ideas_set_updated_at on public.ideas;
create trigger ideas_set_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();
