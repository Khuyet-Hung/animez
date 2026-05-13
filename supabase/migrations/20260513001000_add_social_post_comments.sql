create table if not exists public.social_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.social_post_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint social_post_comments_body_length_check check (
    char_length(btrim(body)) between 1 and 1000
  )
);

create index if not exists social_post_comments_post_created_idx
  on public.social_post_comments (post_id, created_at asc)
  where deleted_at is null;

create index if not exists social_post_comments_parent_created_idx
  on public.social_post_comments (parent_id, created_at asc)
  where deleted_at is null;

create index if not exists social_post_comments_user_created_idx
  on public.social_post_comments (user_id, created_at desc);

create or replace function public.set_social_post_comments_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_social_post_comments_updated_at on public.social_post_comments;

create trigger set_social_post_comments_updated_at
before update on public.social_post_comments
for each row
execute function public.set_social_post_comments_updated_at();

alter table public.social_post_comments enable row level security;

drop policy if exists "Readable social post comments follow post visibility"
  on public.social_post_comments;

create policy "Readable social post comments follow post visibility"
  on public.social_post_comments
  for select
  to anon, authenticated
  using (
    deleted_at is null
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

drop policy if exists "Users can comment on readable social posts"
  on public.social_post_comments;

create policy "Users can comment on readable social posts"
  on public.social_post_comments
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

drop function if exists public.get_social_post_comments(uuid);

create function public.get_social_post_comments(target_post_id uuid)
returns table (
  id uuid,
  post_id uuid,
  parent_id uuid,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  author jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.post_id,
    c.parent_id,
    c.body,
    c.created_at,
    c.updated_at,
    jsonb_build_object(
      'user_id', c.user_id,
      'username', pr.username,
      'display_name', pr.display_name,
      'avatar_url', pr.avatar_url
    ) as author
  from public.social_post_comments c
  join public.social_posts p on p.id = c.post_id
  left join public.profiles pr on pr.id = c.user_id
  where
    c.post_id = target_post_id
    and c.deleted_at is null
    and p.deleted_at is null
    and (
      p.visibility = 'public'
      or p.user_id = (select auth.uid())
    )
  order by c.created_at asc, c.id asc;
$$;

revoke all on function public.get_social_post_comments(uuid) from public;
grant execute on function public.get_social_post_comments(uuid)
  to anon, authenticated;

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
  comment_count integer,
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
    coalesce(comment_rows.comment_count, 0) as comment_count,
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
    select count(*)::integer as comment_count
    from public.social_post_comments spc
    where spc.post_id = sp.id and spc.deleted_at is null
  ) comment_rows on true
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
