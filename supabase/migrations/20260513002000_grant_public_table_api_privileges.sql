grant select, insert, update, delete
  on public.anime_list_entries
  to authenticated;

grant all
  on public.anime_list_entries
  to service_role;

grant select
  on public.profiles
  to anon;

grant select, insert, update
  on public.profiles
  to authenticated;

grant all
  on public.profiles
  to service_role;

grant select
  on public.social_posts
  to anon;

grant select, insert, update, delete
  on public.social_posts
  to authenticated;

grant all
  on public.social_posts
  to service_role;

grant select
  on public.social_post_anime
  to anon;

grant select, insert, delete
  on public.social_post_anime
  to authenticated;

grant all
  on public.social_post_anime
  to service_role;

grant select
  on public.social_post_images
  to anon;

grant select, insert, delete
  on public.social_post_images
  to authenticated;

grant all
  on public.social_post_images
  to service_role;

grant select
  on public.social_post_likes
  to anon;

grant select, insert, delete
  on public.social_post_likes
  to authenticated;

grant all
  on public.social_post_likes
  to service_role;

grant select
  on public.social_post_comments
  to anon;

grant select, insert
  on public.social_post_comments
  to authenticated;

grant all
  on public.social_post_comments
  to service_role;
