create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text not null,
  description text not null default '',
  visibility text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint social_posts_caption_length_check check (
    char_length(btrim(caption)) between 1 and 280
  ),
  constraint social_posts_description_length_check check (
    char_length(btrim(description)) <= 2000
  ),
  constraint social_posts_visibility_check check (
    visibility in ('public')
  )
);

create index if not exists social_posts_public_created_idx
  on public.social_posts (created_at desc)
  where visibility = 'public' and deleted_at is null;

create index if not exists social_posts_user_created_idx
  on public.social_posts (user_id, created_at desc);

create or replace function public.set_social_posts_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_social_posts_updated_at on public.social_posts;

create trigger set_social_posts_updated_at
before update on public.social_posts
for each row
execute function public.set_social_posts_updated_at();

alter table public.social_posts enable row level security;

drop policy if exists "Public social posts are readable"
  on public.social_posts;

create policy "Public social posts are readable"
  on public.social_posts
  for select
  to anon, authenticated
  using (
    deleted_at is null
    and (
      visibility = 'public'
      or (select auth.uid()) = user_id
    )
  );

drop policy if exists "Users can create their own social posts"
  on public.social_posts;

create policy "Users can create their own social posts"
  on public.social_posts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own social posts"
  on public.social_posts;

create policy "Users can delete their own social posts"
  on public.social_posts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.social_post_anime (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  anime_id bigint not null,
  role text not null,
  episode integer,
  title_romaji text,
  title_english text,
  cover_image text,
  format text,
  season_year integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint social_post_anime_role_check check (
    role in ('primary', 'supporting')
  ),
  constraint social_post_anime_episode_check check (
    episode is null or episode >= 0
  ),
  constraint social_post_anime_sort_order_check check (sort_order >= 0),
  constraint social_post_anime_post_anime_unique unique (post_id, anime_id)
);

create unique index if not exists social_post_anime_one_primary_idx
  on public.social_post_anime (post_id)
  where role = 'primary';

create index if not exists social_post_anime_anime_idx
  on public.social_post_anime (anime_id, created_at desc);

alter table public.social_post_anime enable row level security;

drop policy if exists "Readable social post anime follow post visibility"
  on public.social_post_anime;

create policy "Readable social post anime follow post visibility"
  on public.social_post_anime
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.social_posts p
      where
        p.id = post_id
        and p.deleted_at is null
        and (
          p.visibility = 'public'
          or p.user_id = (select auth.uid())
        )
    )
  );

drop policy if exists "Users can create anime links for their posts"
  on public.social_post_anime;

create policy "Users can create anime links for their posts"
  on public.social_post_anime
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.social_posts p
      where p.id = post_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete anime links for their posts"
  on public.social_post_anime;

create policy "Users can delete anime links for their posts"
  on public.social_post_anime
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.social_posts p
      where p.id = post_id and p.user_id = (select auth.uid())
    )
  );

create table if not exists public.social_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  storage_provider text not null default 'r2',
  storage_key text not null,
  public_url text not null,
  mime_type text not null,
  size_bytes integer not null,
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint social_post_images_provider_check check (
    storage_provider in ('r2')
  ),
  constraint social_post_images_mime_type_check check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  constraint social_post_images_size_check check (size_bytes > 0),
  constraint social_post_images_sort_order_check check (sort_order >= 0),
  constraint social_post_images_storage_key_unique unique (storage_key)
);

create index if not exists social_post_images_post_sort_idx
  on public.social_post_images (post_id, sort_order);

alter table public.social_post_images enable row level security;

drop policy if exists "Readable social post images follow post visibility"
  on public.social_post_images;

create policy "Readable social post images follow post visibility"
  on public.social_post_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.social_posts p
      where
        p.id = post_id
        and p.deleted_at is null
        and (
          p.visibility = 'public'
          or p.user_id = (select auth.uid())
        )
    )
  );

drop policy if exists "Users can create images for their posts"
  on public.social_post_images;

create policy "Users can create images for their posts"
  on public.social_post_images
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.social_posts p
      where p.id = post_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete images for their posts"
  on public.social_post_images;

create policy "Users can delete images for their posts"
  on public.social_post_images
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.social_posts p
      where p.id = post_id and p.user_id = (select auth.uid())
    )
  );
