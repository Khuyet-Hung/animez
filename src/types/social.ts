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
