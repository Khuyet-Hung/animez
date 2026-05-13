import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  SocialFeedAnime,
  SocialFeedAuthor,
  SocialFeedImage,
  SocialFeedPage,
  SocialFeedPost,
  SocialSharedPost,
} from "@/types/social";

const DEFAULT_LIMIT = 12;
const MIN_LIMIT = 1;
const MAX_LIMIT = 30;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SocialFeedRpcRow {
  id: string;
  caption: string;
  description: string;
  image_layout?: SocialFeedPost["image_layout"] | null;
  like_count?: number | null;
  liked_by_current_user?: boolean | null;
  comment_count?: number | null;
  share_count?: number | null;
  created_at: string;
  updated_at: string;
  author: SocialFeedAuthor;
  anime: SocialFeedAnime[];
  images: SocialFeedImage[];
  shared_post?: SocialFeedRpcSharedPost | null;
}

interface SocialFeedRpcSharedPost extends Omit<SocialFeedRpcRow, "shared_post"> {
  shared_post?: null;
}

function clampLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;

  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.trunc(parsed)));
}

function getCursor(searchParams: URLSearchParams) {
  const cursorCreatedAt = searchParams.get("cursorCreatedAt");
  const cursorId = searchParams.get("cursorId");

  if (!cursorCreatedAt || !cursorId) {
    return { cursorCreatedAt: null, cursorId: null };
  }

  const cursorDate = new Date(cursorCreatedAt);
  if (Number.isNaN(cursorDate.getTime()) || !UUID_PATTERN.test(cursorId)) {
    return { cursorCreatedAt: null, cursorId: null };
  }

  return { cursorCreatedAt: cursorDate.toISOString(), cursorId };
}

function normalizeSharedPost(row: Omit<SocialFeedRpcRow, "shared_post"> | null | undefined): SocialSharedPost | null {
  if (!row) return null;

  return {
    id: row.id,
    caption: row.caption,
    description: row.description,
    image_layout: row.image_layout ?? "auto",
    like_count: row.like_count ?? 0,
    liked_by_current_user: row.liked_by_current_user ?? false,
    comment_count: row.comment_count ?? 0,
    share_count: row.share_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: row.author,
    anime: row.anime,
    images: row.images,
  };
}

function normalizePost(row: SocialFeedRpcRow): SocialFeedPost {
  const normalized = normalizeSharedPost(row)!;

  return {
    ...normalized,
    shared_post: normalizeSharedPost(row.shared_post),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get("limit"));
  const { cursorCreatedAt, cursorId } = getCursor(url.searchParams);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_social_feed", {
    cursor_created_at: cursorCreatedAt,
    cursor_id: cursorId,
    limit_count: limit,
  });

  if (error) {
    console.error("Failed to load social feed", error);
    return NextResponse.json({ items: [], nextCursor: null, message: "Unable to load feed." }, { status: 500 });
  }

  const items = ((data ?? []) as SocialFeedRpcRow[]).map(normalizePost);
  const lastItem = items.at(-1);
  const page: SocialFeedPage = {
    items,
    nextCursor:
      items.length < limit || !lastItem
        ? null
        : {
            createdAt: lastItem.created_at,
            id: lastItem.id,
          },
  };

  return NextResponse.json(page);
}
