create table if not exists public.anime_recommendation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  profile_snapshot jsonb not null default '{}',
  search_fields jsonb not null default '{}',
  current_rank integer not null default 1,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint anime_recommendation_sessions_status_check check (
    status in ('active', 'completed', 'replaced', 'exhausted')
  )
);

create unique index if not exists anime_recommendation_sessions_one_active_per_user_idx
  on public.anime_recommendation_sessions (user_id)
  where status = 'active';

create index if not exists anime_recommendation_sessions_user_created_idx
  on public.anime_recommendation_sessions (user_id, created_at desc);

create table if not exists public.anime_recommendation_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.anime_recommendation_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id bigint not null,
  rank integer not null,
  match_score numeric not null default 0,
  state text not null default 'pending',
  state_changed_at timestamptz,
  reason jsonb not null default '{}',
  title_romaji text,
  title_english text,
  cover_image text,
  format text,
  episodes integer,
  season_year integer,
  average_score integer,
  popularity integer,
  genres text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint anime_recommendation_items_state_check check (
    state in ('pending', 'not_interested', 'marked_completed', 'added_plan_to_watch', 'skipped')
  ),
  constraint anime_recommendation_items_session_anime_unique unique (session_id, anime_id),
  constraint anime_recommendation_items_session_rank_unique unique (session_id, rank)
);

create index if not exists anime_recommendation_items_user_state_idx
  on public.anime_recommendation_items (user_id, state, rank);

create index if not exists anime_recommendation_items_session_state_rank_idx
  on public.anime_recommendation_items (session_id, state, rank);

create table if not exists public.anime_not_interested (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id bigint not null,
  title_romaji text,
  title_english text,
  cover_image text,
  format text,
  created_at timestamptz not null default now(),
  constraint anime_not_interested_user_anime_unique unique (user_id, anime_id)
);

create index if not exists anime_not_interested_user_created_idx
  on public.anime_not_interested (user_id, created_at desc);

create or replace function public.set_anime_recommendation_sessions_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_anime_recommendation_sessions_updated_at on public.anime_recommendation_sessions;

create trigger set_anime_recommendation_sessions_updated_at
before update on public.anime_recommendation_sessions
for each row
execute function public.set_anime_recommendation_sessions_updated_at();

alter table public.anime_recommendation_sessions enable row level security;
alter table public.anime_recommendation_items enable row level security;
alter table public.anime_not_interested enable row level security;

create policy "Users can read their own recommendation sessions"
  on public.anime_recommendation_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own recommendation sessions"
  on public.anime_recommendation_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own recommendation sessions"
  on public.anime_recommendation_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own recommendation items"
  on public.anime_recommendation_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own recommendation items"
  on public.anime_recommendation_items
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own recommendation items"
  on public.anime_recommendation_items
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own not interested anime"
  on public.anime_not_interested
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own not interested anime"
  on public.anime_not_interested
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own not interested anime"
  on public.anime_not_interested
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
