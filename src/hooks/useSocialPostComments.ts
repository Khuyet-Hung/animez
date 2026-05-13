"use client";

import { useQuery } from "@tanstack/react-query";
import type { SocialPostComment } from "@/types/social";

interface SocialPostCommentsResponse {
  comments: SocialPostComment[];
  message?: string;
}

async function fetchSocialPostComments(postId: string) {
  const response = await fetch(`/api/social/posts/${postId}/comments`);
  const data = (await response.json()) as SocialPostCommentsResponse;

  if (!response.ok) {
    throw new Error(data.message ?? "Unable to load comments.");
  }

  return data.comments;
}

export function useSocialPostComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["social-post-comments", postId],
    queryFn: () => fetchSocialPostComments(postId),
    enabled,
    staleTime: 20_000,
  });
}
