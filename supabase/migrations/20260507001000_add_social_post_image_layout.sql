alter table public.social_posts
  add column if not exists image_layout text not null default 'auto';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'social_posts_image_layout_check'
      and conrelid = 'public.social_posts'::regclass
  ) then
    alter table public.social_posts
      add constraint social_posts_image_layout_check check (
        image_layout in (
          'auto',
          'stacked',
          'side_by_side',
          'featured_top',
          'featured_side',
          'mosaic_top',
          'mosaic_side'
        )
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
