import type { AnimeListStatus } from "@/types/anime-list";
import type { AnimeListEntry } from "@/types/anime-list";

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfileView {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string;
  is_public: boolean;
  created_at: string;
}

export interface ProfileFormInput {
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  is_public: boolean;
}

export type ProfileFieldErrorKey =
  | "invalidUsername"
  | "usernameTaken"
  | "reservedUsername"
  | "invalidDisplayName"
  | "bioTooLong"
  | "invalidAvatarUrl"
  | "invalidAvatarFile"
  | "avatarTooLarge"
  | "avatarUploadFailed";

export type ProfileFieldErrors = Partial<Record<keyof ProfileFormInput, ProfileFieldErrorKey>>;

export interface ProfileStats {
  total_anime: number;
  watching: number;
  completed: number;
  on_hold: number;
  dropped: number;
  plan_to_watch: number;
  average_score: number;
  watched_episodes: number;
}

export interface PublicAnimeListEntry {
  anime_id: number;
  status: AnimeListStatus;
  score: number;
  progress_episodes: number;
  total_episodes: number | null;
  title_romaji: string | null;
  title_english: string | null;
  cover_image: string | null;
  format: string | null;
  season_year: number | null;
  updated_at: string;
}

export type UserAnimeListEntry = Omit<PublicAnimeListEntry, "score" | "status"> &
  Pick<
    AnimeListEntry,
    | "id"
    | "user_id"
    | "status"
    | "score"
    | "started_at"
    | "finished_at"
    | "is_rewatching"
    | "rewatch_count"
    | "rewatch_value"
    | "priority"
    | "tags"
    | "notes"
    | "season"
    | "created_at"
  >;
