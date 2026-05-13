drop policy if exists "Users can update their own social posts"
  on public.social_posts;

create policy "Users can update their own social posts"
  on public.social_posts
  for update
  to authenticated
  using ((select auth.uid()) = user_id and deleted_at is null)
  with check ((select auth.uid()) = user_id and deleted_at is null);
