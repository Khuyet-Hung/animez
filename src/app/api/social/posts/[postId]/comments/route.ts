import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SocialFeedAuthor, SocialPostComment } from "@/types/social";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SocialPostCommentRpcRow {
  id: string;
  post_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  author: SocialFeedAuthor;
}

function normalizeComments(rows: SocialPostCommentRpcRow[]) {
  const commentsById = new Map<string, SocialPostComment>();
  const roots: SocialPostComment[] = [];

  rows.forEach((row) => {
    commentsById.set(row.id, {
      id: row.id,
      post_id: row.post_id,
      parent_id: row.parent_id,
      body: row.body,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: row.author,
      replies: [],
    });
  });

  commentsById.forEach((comment) => {
    if (!comment.parent_id) {
      roots.push(comment);
      return;
    }

    const parent = commentsById.get(comment.parent_id);
    if (parent && !parent.parent_id) {
      parent.replies.push(comment);
    }
  });

  return roots;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  const { postId } = await context.params;

  if (!UUID_PATTERN.test(postId)) {
    return NextResponse.json({ comments: [] }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_social_post_comments", {
    target_post_id: postId,
  });

  if (error) {
    console.error("Failed to load social post comments", error);
    return NextResponse.json(
      { comments: [], message: "Unable to load comments." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    comments: normalizeComments((data ?? []) as SocialPostCommentRpcRow[]),
  });
}
