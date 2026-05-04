create table if not exists public.anime_list_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id bigint not null,
  status text not null default 'plan_to_watch',
  score smallint not null default 0,
  progress_episodes integer not null default 0,
  total_episodes integer,
  started_at date,
  finished_at date,
  is_rewatching boolean not null default false,
  rewatch_count integer not null default 0,
  rewatch_value smallint not null default 0,
  priority smallint not null default 0,
  tags text[] not null default '{}',
  notes text not null default '',
  title_romaji text,
  title_english text,
  cover_image text,
  format text,
  season text,
  season_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anime_list_entries_user_anime_unique unique (user_id, anime_id),
  constraint anime_list_entries_status_check check (
    status in ('watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch')
  ),
  constraint anime_list_entries_score_check check (score between 0 and 10),
  constraint anime_list_entries_progress_check check (progress_episodes >= 0),
  constraint anime_list_entries_total_episodes_check check (
    total_episodes is null or total_episodes >= 0
  ),
  constraint anime_list_entries_progress_total_check check (
    total_episodes is null or progress_episodes <= total_episodes
  ),
  constraint anime_list_entries_rewatch_count_check check (rewatch_count >= 0),
  constraint anime_list_entries_rewatch_value_check check (rewatch_value between 0 and 5),
  constraint anime_list_entries_priority_check check (priority between 0 and 2)
);

create index if not exists anime_list_entries_user_status_updated_idx
  on public.anime_list_entries (user_id, status, updated_at desc);

create or replace function public.set_anime_list_entries_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_anime_list_entries_updated_at on public.anime_list_entries;

create trigger set_anime_list_entries_updated_at
before update on public.anime_list_entries
for each row
execute function public.set_anime_list_entries_updated_at();

alter table public.anime_list_entries enable row level security;

create policy "Users can read their own anime list entries"
  on public.anime_list_entries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own anime list entries"
  on public.anime_list_entries
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own anime list entries"
  on public.anime_list_entries
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own anime list entries"
  on public.anime_list_entries
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
