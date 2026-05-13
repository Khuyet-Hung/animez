alter table public.social_posts
  add column if not exists shared_post_id uuid references public.social_posts(id) on delete set null;

create index if not exists social_posts_shared_post_idx
  on public.social_posts (shared_post_id)
  where shared_post_id is not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'social_posts_caption_length_check'
      and conrelid = 'public.social_posts'::regclass
  ) then
    alter table public.social_posts
      drop constraint social_posts_caption_length_check;
  end if;

  alter table public.social_posts
    add constraint social_posts_caption_length_check check (
      (
        shared_post_id is null
        and char_length(btrim(caption)) between 1 and 280
      )
      or (
        shared_post_id is not null
        and char_length(btrim(caption)) <= 280
      )
    );

  if not exists (
    select 1
    from pg_constraint
    where conname = 'social_posts_no_self_share_check'
      and conrelid = 'public.social_posts'::regclass
  ) then
    alter table public.social_posts
      add constraint social_posts_no_self_share_check check (
        shared_post_id is null or shared_post_id <> id
      );
  end if;
end $$;

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
  share_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  author jsonb,
  anime jsonb,
  images jsonb,
  shared_post jsonb
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
    coalesce(share_rows.share_count, 0) as share_count,
    sp.created_at,
    sp.updated_at,
    jsonb_build_object(
      'user_id', sp.user_id,
      'username', pr.username,
      'display_name', pr.display_name,
      'avatar_url', pr.avatar_url
    ) as author,
    coalesce(anime_rows.items, '[]'::jsonb) as anime,
    coalesce(image_rows.items, '[]'::jsonb) as images,
    case
      when shared.id is null then null
      else jsonb_build_object(
        'id', shared.id,
        'caption', shared.caption,
        'description', shared.description,
        'image_layout', shared.image_layout,
        'like_count', coalesce(shared_like_rows.like_count, 0),
        'liked_by_current_user', coalesce(shared_like_rows.liked_by_current_user, false),
        'comment_count', coalesce(shared_comment_rows.comment_count, 0),
        'share_count', coalesce(shared_share_rows.share_count, 0),
        'created_at', shared.created_at,
        'updated_at', shared.updated_at,
        'author', jsonb_build_object(
          'user_id', shared.user_id,
          'username', shared_pr.username,
          'display_name', shared_pr.display_name,
          'avatar_url', shared_pr.avatar_url
        ),
        'anime', coalesce(shared_anime_rows.items, '[]'::jsonb),
        'images', coalesce(shared_image_rows.items, '[]'::jsonb)
      )
    end as shared_post
  from selected_posts sp
  left join public.profiles pr on pr.id = sp.user_id
  left join public.social_posts shared
    on shared.id = sp.shared_post_id
    and shared.visibility = 'public'
    and shared.deleted_at is null
  left join public.profiles shared_pr on shared_pr.id = shared.user_id
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
    select count(*)::integer as share_count
    from public.social_posts shares
    where shares.shared_post_id = sp.id
      and shares.visibility = 'public'
      and shares.deleted_at is null
  ) share_rows on true
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
  left join lateral (
    select
      count(*)::integer as like_count,
      coalesce(
        bool_or(spl.user_id = (select auth.uid())),
        false
      ) as liked_by_current_user
    from public.social_post_likes spl
    where spl.post_id = shared.id
  ) shared_like_rows on true
  left join lateral (
    select count(*)::integer as comment_count
    from public.social_post_comments spc
    where spc.post_id = shared.id and spc.deleted_at is null
  ) shared_comment_rows on true
  left join lateral (
    select count(*)::integer as share_count
    from public.social_posts shares
    where shares.shared_post_id = shared.id
      and shares.visibility = 'public'
      and shares.deleted_at is null
  ) shared_share_rows on true
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
    where spa.post_id = shared.id
  ) shared_anime_rows on true
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
    where spi.post_id = shared.id
  ) shared_image_rows on true
  order by sp.created_at desc, sp.id desc;
$$;

revoke all on function public.get_public_social_feed(timestamptz, uuid, integer) from public;
grant execute on function public.get_public_social_feed(timestamptz, uuid, integer)
  to anon, authenticated;
