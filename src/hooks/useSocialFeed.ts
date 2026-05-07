"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { SocialFeedCursor, SocialFeedPage } from "@/types/social";

const DEFAULT_FEED_LIMIT = 12;
const SOCIAL_FEED_STALE_TIME = 45_000;

async function fetchSocialFeedPage({
  cursor,
  limit = DEFAULT_FEED_LIMIT,
}: {
  cursor: SocialFeedCursor | null;
  limit?: number;
}) {
  const params = new URLSearchParams({ limit: String(limit) });

  if (cursor) {
    params.set("cursorCreatedAt", cursor.createdAt);
    params.set("cursorId", cursor.id);
  }

  const response = await fetch(`/api/feed?${params.toString()}`);
  const data = (await response.json()) as SocialFeedPage | { message?: string };

  if (!response.ok) {
    throw new Error("message" in data && data.message ? data.message : "Unable to load feed.");
  }

  return data as SocialFeedPage;
}

export function useSocialFeed(locale: string) {
  return useInfiniteQuery({
    queryKey: ["social-feed", locale],
    queryFn: ({ pageParam }) => fetchSocialFeedPage({ cursor: pageParam }),
    initialPageParam: null as SocialFeedCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: SOCIAL_FEED_STALE_TIME,
  });
}
