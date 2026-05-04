export type AnimeListStatus =
  | "watching"
  | "completed"
  | "on_hold"
  | "dropped"
  | "plan_to_watch";

export type AnimeListPriority = 0 | 1 | 2;
export type AnimeListRewatchValue = 0 | 1 | 2 | 3 | 4 | 5;
export type AnimeListScore = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface AnimeListEntry {
  id: string;
  user_id: string;
  anime_id: number;
  status: AnimeListStatus;
  score: AnimeListScore;
  progress_episodes: number;
  total_episodes: number | null;
  started_at: string | null;
  finished_at: string | null;
  is_rewatching: boolean;
  rewatch_count: number;
  rewatch_value: AnimeListRewatchValue;
  priority: AnimeListPriority;
  tags: string[];
  notes: string;
  title_romaji: string | null;
  title_english: string | null;
  cover_image: string | null;
  format: string | null;
  season: string | null;
  season_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface AnimeListEntryInput {
  status?: AnimeListStatus;
  score?: AnimeListScore;
  progress_episodes?: number;
  total_episodes?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  is_rewatching?: boolean;
  rewatch_count?: number;
  rewatch_value?: AnimeListRewatchValue;
  priority?: AnimeListPriority;
  tags?: string[];
  notes?: string;
}

export interface AnimeListSnapshotInput {
  anime_id: number;
  total_episodes: number | null;
  title_romaji: string | null;
  title_english: string | null;
  cover_image: string | null;
  format: string | null;
  season: string | null;
  season_year: number | null;
}

export type AnimeListUpsertInput = AnimeListSnapshotInput & AnimeListEntryInput;

export interface AnimeListQuickAddInput extends AnimeListSnapshotInput {
  status: AnimeListStatus;
}
