"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2Icon, RefreshCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import SocialPostCard, { SocialPostCardSkeleton } from "@/components/social/feed/SocialPostCard";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type {
  SocialFeedAnime,
  SocialFeedAuthor,
  SocialFeedImage,
  SocialFeedPost,
  SocialPostImageLayout,
} from "@/types/social";
import type { UserProfile } from "@/types/profile";

const PROFILE_POST_PAGE_SIZE = 12;
const PROFILE_POST_SELECT_WITH_LAYOUT = `
  id,
  caption,
  description,
  image_layout,
  created_at,
  updated_at,
  social_post_anime (
    anime_id,
    role,
    episode,
    title_romaji,
    title_english,
    cover_image,
    format,
    season_year,
    sort_order,
    created_at
  ),
  social_post_images (
    id,
    public_url,
    width,
    height,
    sort_order,
    created_at
  )
`;
const PROFILE_POST_SELECT_LEGACY = `
  id,
  caption,
  description,
  created_at,
  updated_at,
  social_post_anime (
    anime_id,
    role,
    episode,
    title_romaji,
    title_english,
    cover_image,
    format,
    season_year,
    sort_order,
    created_at
  ),
  social_post_images (
    id,
    public_url,
    width,
    height,
    sort_order,
    created_at
  )
`;

interface ProfilePostsListProps {
  profile: UserProfile;
}

interface ProfilePostsPage {
  items: SocialFeedPost[];
  nextOffset: number | null;
}

interface ProfilePostAnimeRow extends SocialFeedAnime {
  created_at?: string;
}

interface ProfilePostImageRow extends SocialFeedImage {
  created_at?: string;
}

interface ProfilePostLikeRow {
  post_id: string;
  user_id: string;
}

interface ProfilePostLikeSummary {
  likeCount: number;
  likedByCurrentUser: boolean;
}

interface ProfilePostCommentRow {
  post_id: string;
}

interface ProfilePostRow {
  id: string;
  caption: string;
  description: string;
  image_layout?: SocialPostImageLayout | null;
  created_at: string;
  updated_at: string;
  social_post_anime: ProfilePostAnimeRow[] | null;
  social_post_images: ProfilePostImageRow[] | null;
}

interface ProfilePostQueryResult {
  count: number | null;
  data: ProfilePostRow[] | null;
  error: { code?: string; message: string } | null;
}

function isMissingImageLayoutError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42703" ||
    error?.message?.toLowerCase().includes("image_layout") ||
    false
  );
}

function isMissingLikesTableError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    error?.message?.toLowerCase().includes("social_post_likes") ||
    false
  );
}

function isMissingCommentsTableError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    error?.message?.toLowerCase().includes("social_post_comments") ||
    false
  );
}

async function queryProfilePosts({
  authorId,
  from,
  select,
  to,
}: {
  authorId: string;
  from: number;
  select: string;
  to: number;
}): Promise<ProfilePostQueryResult> {
  const supabase = createClient();
  const result = await supabase
    .from("social_posts")
    .select(select, { count: "exact" })
    .eq("user_id", authorId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    count: result.count,
    data: (result.data ?? null) as ProfilePostRow[] | null,
    error: result.error,
  };
}

async function queryProfilePostLikes(postIds: string[]) {
  if (postIds.length === 0) return [] as ProfilePostLikeRow[];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("social_post_likes")
    .select("post_id, user_id")
    .in("post_id", postIds);

  if (isMissingLikesTableError(error)) {
    return [] as ProfilePostLikeRow[];
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProfilePostLikeRow[];
}

async function queryProfilePostComments(postIds: string[]) {
  if (postIds.length === 0) return [] as ProfilePostCommentRow[];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("social_post_comments")
    .select("post_id")
    .in("post_id", postIds)
    .is("deleted_at", null);

  if (isMissingCommentsTableError(error)) {
    return [] as ProfilePostCommentRow[];
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProfilePostCommentRow[];
}

function getLikeSummaries({
  currentUserId,
  likes,
  postIds,
}: {
  currentUserId: string | null;
  likes: ProfilePostLikeRow[];
  postIds: string[];
}) {
  const summaries = new Map<string, ProfilePostLikeSummary>();

  for (const postId of postIds) {
    summaries.set(postId, {
      likeCount: 0,
      likedByCurrentUser: false,
    });
  }

  for (const like of likes) {
    const summary = summaries.get(like.post_id);
    if (!summary) continue;

    summary.likeCount += 1;
    if (currentUserId && like.user_id === currentUserId) {
      summary.likedByCurrentUser = true;
    }
  }

  return summaries;
}

function getCommentCounts({
  comments,
  postIds,
}: {
  comments: ProfilePostCommentRow[];
  postIds: string[];
}) {
  const counts = new Map<string, number>();

  for (const postId of postIds) {
    counts.set(postId, 0);
  }

  for (const comment of comments) {
    counts.set(comment.post_id, (counts.get(comment.post_id) ?? 0) + 1);
  }

  return counts;
}

function normalizeProfilePost(
  row: ProfilePostRow,
  author: SocialFeedAuthor,
  likeSummary: ProfilePostLikeSummary | undefined,
  commentCount: number | undefined
): SocialFeedPost {
  return {
    id: row.id,
    caption: row.caption,
    description: row.description,
    image_layout: row.image_layout ?? "auto",
    like_count: likeSummary?.likeCount ?? 0,
    liked_by_current_user: likeSummary?.likedByCurrentUser ?? false,
    comment_count: commentCount ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author,
    anime: [...(row.social_post_anime ?? [])].sort((first, second) => first.sort_order - second.sort_order),
    images: [...(row.social_post_images ?? [])].sort((first, second) => first.sort_order - second.sort_order),
  };
}

async function fetchProfilePostsPage({
  author,
  currentUserId,
  offset,
}: {
  author: SocialFeedAuthor;
  currentUserId: string | null;
  offset: number;
}): Promise<ProfilePostsPage> {
  const from = offset;
  const to = offset + PROFILE_POST_PAGE_SIZE - 1;
  let result = await queryProfilePosts({
    authorId: author.user_id,
    from,
    select: PROFILE_POST_SELECT_WITH_LAYOUT,
    to,
  });

  if (isMissingImageLayoutError(result.error)) {
    result = await queryProfilePosts({
      authorId: author.user_id,
      from,
      select: PROFILE_POST_SELECT_LEGACY,
      to,
    });
  }

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data ?? []) as ProfilePostRow[];
  const postIds = rows.map((row) => row.id);
  const likeSummaries = getLikeSummaries({
    currentUserId,
    likes: await queryProfilePostLikes(postIds),
    postIds,
  });
  const commentCounts = getCommentCounts({
    comments: await queryProfilePostComments(postIds),
    postIds,
  });
  const items = rows.map((row) =>
    normalizeProfilePost(row, author, likeSummaries.get(row.id), commentCounts.get(row.id))
  );
  const loadedCount = offset + items.length;

  return {
    items,
    nextOffset:
      result.count === null
        ? items.length === PROFILE_POST_PAGE_SIZE
          ? loadedCount
          : null
        : loadedCount < result.count
          ? loadedCount
          : null,
  };
}

export default function ProfilePostsList({ profile }: ProfilePostsListProps) {
  const t = useTranslations("profile");
  const { user } = useAuth();
  const author = useMemo<SocialFeedAuthor>(
    () => ({
      user_id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    }),
    [profile.avatar_url, profile.display_name, profile.id, profile.username]
  );
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      "profile-posts",
      profile.id,
      profile.username,
      profile.display_name,
      profile.avatar_url,
      user?.id ?? null,
    ],
    queryFn: ({ pageParam }) =>
      fetchProfilePostsPage({ author, currentUserId: user?.id ?? null, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 45_000,
  });
  const posts = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <SocialPostCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded border border-red-500/30 bg-red-500/10 px-5 py-5">
        <h2 className="text-lg font-black text-white">{t("postsLoadFailed")}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-red-200">
          {error instanceof Error ? error.message : t("postsLoadFailed")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded border border-red-400/40 px-4 text-sm font-black text-red-100 transition-colors hover:border-red-300 hover:text-white"
        >
          <RefreshCcwIcon className="size-4" />
          {t("retry")}
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded border border-[#1a1a24] bg-[#111118] px-5 py-12 text-center">
        <p className="text-sm font-semibold text-[#9ca3af]">{t("emptyPosts")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <SocialPostCard key={post.id} currentUserId={user?.id ?? null} post={post} />
      ))}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="inline-flex h-10 items-center gap-2 rounded border border-[#1a1a24] bg-[#111118] px-4 text-sm font-black text-white transition-colors hover:border-[#f49e0b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetchingNextPage && <Loader2Icon className="size-4 animate-spin text-[#f49e0b]" />}
            {t("loadMorePosts")}
          </button>
        </div>
      )}
    </div>
  );
}
