export type SocialPostAnimeRole = "primary" | "supporting";

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

export interface CreateSocialPostActionState {
  status: "idle" | "success" | "error";
  messageKey: string | null;
  fieldErrors: SocialPostFieldErrors;
  postId?: string;
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
  created_at: string;
  updated_at: string;
  author: SocialFeedAuthor;
  anime: SocialFeedAnime[];
  images: SocialFeedImage[];
}

export interface SocialFeedCursor {
  createdAt: string;
  id: string;
}

export interface SocialFeedPage {
  items: SocialFeedPost[];
  nextCursor: SocialFeedCursor | null;
}
