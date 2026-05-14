export type RecommendationSessionStatus = "active" | "completed" | "replaced" | "exhausted";

export type RecommendationItemState =
  | "pending"
  | "not_interested"
  | "marked_completed"
  | "added_plan_to_watch"
  | "skipped";

export type RecommendationConfidence = "low" | "medium" | "high";

export interface RecommendationSearchFields {
  genres: string[];
  formats: string[];
  yearRange: {
    from: number | null;
    to: number | null;
  };
  sortCandidates: string[];
  confidence: RecommendationConfidence;
}

export interface RecommendationProfileSnapshot {
  inputCount: number;
  usefulWeight: number;
  topGenres: { name: string; score: number }[];
  topFormats: { name: string; score: number }[];
  yearRange: { from: number | null; to: number | null };
  excludedAnimeIds: number[];
  confidence: RecommendationConfidence;
}

export interface RecommendationSession {
  id: string;
  user_id: string;
  status: RecommendationSessionStatus;
  profile_snapshot: RecommendationProfileSnapshot;
  search_fields: RecommendationSearchFields;
  current_rank: number;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface RecommendationItem {
  id: string;
  session_id: string;
  user_id: string;
  anime_id: number;
  rank: number;
  match_score: number;
  state: RecommendationItemState;
  state_changed_at: string | null;
  reason: {
    genres?: string[];
    format?: string | null;
    yearAffinity?: number;
    averageScore?: number | null;
    popularity?: number | null;
  };
  title_romaji: string | null;
  title_english: string | null;
  cover_image: string | null;
  format: string | null;
  episodes: number | null;
  season_year: number | null;
  average_score: number | null;
  popularity: number | null;
  genres: string[];
  created_at: string;
}

export interface RecommendationSessionView {
  session: RecommendationSession | null;
  currentItem: RecommendationItem | null;
  totalCount: number;
  pendingCount: number;
  remainingMonthlySessions: number;
}

export type RecommendationActionResult =
  | { status: "success"; view: RecommendationSessionView }
  | { status: "error"; messageKey: string };
