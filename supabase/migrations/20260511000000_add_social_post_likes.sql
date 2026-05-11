create table if not exists public.social_post_likes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists social_post_likes_post_created_idx
  on public.social_post_likes (post_id, created_at desc);

create index if not exists social_post_likes_user_created_idx
  on public.social_post_likes (user_id, created_at desc);

alter table public.social_post_likes enable row level security;

drop policy if exists "Readable social post likes follow post visibility"
  on public.social_post_likes;

create policy "Readable social post likes follow post visibility"
  on public.social_post_likes
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

drop policy if exists "Users can like readable social posts"
  on public.social_post_likes;

create policy "Users can like readable social posts"
  on public.social_post_likes
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
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

drop policy if exists "Users can remove their own social post likes"
  on public.social_post_likes;

create policy "Users can remove their own social post likes"
  on public.social_post_likes
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop function if exists public.get_public_social_feed(timestamptz, uuid, integer);

create function public.get_public_social_feed(
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  limit_count integer default 20
)
returns table (
  id uuid,
  caption text,
  description text,
  image_layout text,
  like_count integer,
  liked_by_current_user boolean,
  created_at timestamptz,
  updated_at timestamptz,
  author jsonb,
  anime jsonb,
  images jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with selected_posts as (
    select p.*
    from public.social_posts p
    where
      p.visibility = 'public'
      and p.deleted_at is null
      and (
        cursor_created_at is null
        or cursor_id is null
        or (p.created_at, p.id) < (cursor_created_at, cursor_id)
      )
    order by p.created_at desc, p.id desc
    limit least(greatest(limit_count, 1), 30)
  )
  select
    sp.id,
    sp.caption,
    sp.description,
    sp.image_layout,
    coalesce(like_rows.like_count, 0) as like_count,
    coalesce(like_rows.liked_by_current_user, false) as liked_by_current_user,
    sp.created_at,
    sp.updated_at,
    jsonb_build_object(
      'user_id', sp.user_id,
      'username', pr.username,
      'display_name', pr.display_name,
      'avatar_url', pr.avatar_url
    ) as author,
    coalesce(anime_rows.items, '[]'::jsonb) as anime,
    coalesce(image_rows.items, '[]'::jsonb) as images
  from selected_posts sp
  left join public.profiles pr on pr.id = sp.user_id
  left join lateral (
    select
      count(*)::integer as like_count,
      coalesce(
        bool_or(spl.user_id = (select auth.uid())),
        false
      ) as liked_by_current_user
    from public.social_post_likes spl
    where spl.post_id = sp.id
  ) like_rows on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'anime_id', spa.anime_id,
        'role', spa.role,
        'episode', spa.episode,
        'title_romaji', spa.title_romaji,
        'title_english', spa.title_english,
        'cover_image', spa.cover_image,
        'format', spa.format,
        'season_year', spa.season_year,
        'sort_order', spa.sort_order
      )
      order by spa.sort_order asc, spa.created_at asc
    ) as items
    from public.social_post_anime spa
    where spa.post_id = sp.id
  ) anime_rows on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', spi.id,
        'public_url', spi.public_url,
        'width', spi.width,
        'height', spi.height,
        'sort_order', spi.sort_order
      )
      order by spi.sort_order asc, spi.created_at asc
    ) as items
    from public.social_post_images spi
    where spi.post_id = sp.id
  ) image_rows on true
  order by sp.created_at desc, sp.id desc;
$$;

revoke all on function public.get_public_social_feed(timestamptz, uuid, integer) from public;
grant execute on function public.get_public_social_feed(timestamptz, uuid, integer)
  to anon, authenticated;
