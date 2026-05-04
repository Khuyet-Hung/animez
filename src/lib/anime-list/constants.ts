import type {
  AnimeListPriority,
  AnimeListRewatchValue,
  AnimeListScore,
  AnimeListStatus,
} from "@/types/anime-list";

export const ANIME_LIST_STATUSES = [
  "watching",
  "completed",
  "on_hold",
  "dropped",
  "plan_to_watch",
] as const satisfies readonly AnimeListStatus[];

export const DEFAULT_ANIME_LIST_STATUS = "plan_to_watch" satisfies AnimeListStatus;

export const ANIME_LIST_SCORE_OPTIONS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
] as const satisfies readonly AnimeListScore[];

export const ANIME_LIST_PRIORITY_OPTIONS = [0, 1, 2] as const satisfies readonly AnimeListPriority[];

export const ANIME_LIST_REWATCH_VALUE_OPTIONS = [
  0, 1, 2, 3, 4, 5,
] as const satisfies readonly AnimeListRewatchValue[];

export const ANIME_LIST_STATUS_BADGE_CLASS: Record<AnimeListStatus, string> = {
  watching: "border-green-500/30 bg-green-500/15 text-green-300",
  completed: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  on_hold: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
  dropped: "border-red-500/30 bg-red-500/15 text-red-300",
  plan_to_watch: "border-[#f49e0b]/35 bg-[#f49e0b]/15 text-[#f49e0b]",
};
