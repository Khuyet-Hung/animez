create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text not null default '',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format_check check (username ~ '^[a-z0-9_-]{3,24}$'),
  constraint profiles_username_reserved_check check (
    username not in ('profile', 'login', 'register', 'search', 'anime', 'admin', 'api')
  ),
  constraint profiles_display_name_length_check check (
    char_length(display_name) between 1 and 40
  ),
  constraint profiles_bio_length_check check (char_length(bio) <= 160)
);

create index if not exists profiles_public_username_idx
  on public.profiles (username)
  where is_public = true;

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Profiles are readable by owner or when public"
  on public.profiles;

create policy "Profiles are readable by owner or when public"
  on public.profiles
  for select
  to anon, authenticated
  using (is_public or (select auth.uid()) = id);

drop policy if exists "Users can create their own profile"
  on public.profiles;

create policy "Users can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile"
  on public.profiles;

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.get_public_profile(profile_username text)
returns table (
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_public boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.username,
    case when p.is_public then p.display_name else null end as display_name,
    case when p.is_public then p.avatar_url else null end as avatar_url,
    case when p.is_public then p.bio else '' end as bio,
    p.is_public,
    p.created_at
  from public.profiles p
  where p.username = profile_username
  limit 1;
$$;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text)
  to anon, authenticated;

create or replace function public.get_public_anime_list(
  profile_username text,
  entry_status text default null,
  limit_count integer default 50,
  offset_count integer default 0
)
returns table (
  anime_id bigint,
  status text,
  score smallint,
  progress_episodes integer,
  total_episodes integer,
  title_romaji text,
  title_english text,
  cover_image text,
  format text,
  season_year integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.anime_id,
    e.status,
    e.score,
    e.progress_episodes,
    e.total_episodes,
    e.title_romaji,
    e.title_english,
    e.cover_image,
    e.format,
    e.season_year,
    e.updated_at
  from public.profiles p
  join public.anime_list_entries e on e.user_id = p.id
  where
    p.username = profile_username
    and p.is_public = true
    and (
      entry_status is null
      or e.status = entry_status
    )
  order by e.updated_at desc
  limit least(greatest(limit_count, 1), 100)
  offset greatest(offset_count, 0);
$$;

revoke all on function public.get_public_anime_list(text, text, integer, integer) from public;
grant execute on function public.get_public_anime_list(text, text, integer, integer)
  to anon, authenticated;

create or replace function public.get_public_profile_stats(profile_username text)
returns table (
  total_anime bigint,
  watching bigint,
  completed bigint,
  on_hold bigint,
  dropped bigint,
  plan_to_watch bigint,
  average_score double precision,
  watched_episodes bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(e.id) as total_anime,
    count(e.id) filter (where e.status = 'watching') as watching,
    count(e.id) filter (where e.status = 'completed') as completed,
    count(e.id) filter (where e.status = 'on_hold') as on_hold,
    count(e.id) filter (where e.status = 'dropped') as dropped,
    count(e.id) filter (where e.status = 'plan_to_watch') as plan_to_watch,
    coalesce(avg(e.score) filter (where e.score > 0), 0)::double precision as average_score,
    coalesce(sum(e.progress_episodes), 0)::bigint as watched_episodes
  from public.profiles p
  left join public.anime_list_entries e on e.user_id = p.id
  where p.username = profile_username and p.is_public = true;
$$;

revoke all on function public.get_public_profile_stats(text) from public;
grant execute on function public.get_public_profile_stats(text)
  to anon, authenticated;
