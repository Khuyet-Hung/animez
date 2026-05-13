export type SocialPostAnimeRole = "primary" | "supporting";
export type SocialPostImageLayout =
  | "auto"
  | "stacked"
  | "side_by_side"
  | "featured_top"
  | "featured_side"
  | "mosaic_top"
  | "mosaic_side";

export interface SocialPostAnimeDraft {
  anime_id: number;
  episode: number | null;
  title_romaji: string | null;
  title_english: string | null;
  cover_image: string | null;
  format: string | null;
  season_year: number | null;
}

export interface SocialPostFieldErrors {
  caption?: string;
  description?: string;
  primaryAnime?: string;
  supportingAnime?: string;
  images?: string;
}

export type SocialPostFieldErrorValues = Partial<
  Record<keyof SocialPostFieldErrors, Record<string, string | number>>
>;

export interface CreateSocialPostActionState {
  status: "idle" | "success" | "error";
  messageKey: string | null;
  fieldErrors: SocialPostFieldErrors;
  fieldErrorValues?: SocialPostFieldErrorValues;
  postId?: string;
}

export type UpdateSocialPostActionState = CreateSocialPostActionState;

export interface DeleteSocialPostActionState {
  status: "success" | "error";
  messageKey: string;
  postId?: string;
}

export interface ToggleSocialPostLikeActionState {
  status: "success" | "error";
  messageKey: string;
  postId?: string;
  liked?: boolean;
  likeCount?: number;
}

export interface CreateSocialPostCommentActionState {
  status: "success" | "error";
  messageKey: string;
  postId?: string;
  commentId?: string;
}

export interface SocialFeedAuthor {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface SocialFeedAnime {
  anime_id: number;
  role: SocialPostAnimeRole;
  episode: number | null;
  title_romaji: string | null;
  title_english: string | null;
  cover_image: string | null;
  format: string | null;
  season_year: number | null;
  sort_order: number;
}

export interface SocialFeedImage {
  id: string;
  public_url: string;
  width: number | null;
  height: number | null;
  sort_order: number;
}

export interface SocialFeedPost {
  id: string;
  caption: string;
  description: string;
  image_layout: SocialPostImageLayout;
  like_count: number;
  liked_by_current_user: boolean;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author: SocialFeedAuthor;
  anime: SocialFeedAnime[];
  images: SocialFeedImage[];
}

export interface SocialPostComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  author: SocialFeedAuthor;
  replies: SocialPostComment[];
}

export interface SocialFeedCursor {
  createdAt: string;
  id: string;
}

export interface SocialFeedPage {
  items: SocialFeedPost[];
  nextCursor: SocialFeedCursor | null;
}
