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

export const ANIME_LIST_SCORE_VALUE_LABEL: Record<Exclude<AnimeListScore, 0>, string> = {
  1: "Appalling",
  2: "Horrible",
  3: "Very Bad",
  4: "Bad",
  5: "Average",
  6: "Fine",
  7: "Good",
  8: "Very Good",
  9: "Great",
  10: "Masterpiece",
};

export const ANIME_LIST_PRIORITY_OPTIONS = [0, 1, 2] as const satisfies readonly AnimeListPriority[];

export const ANIME_LIST_REWATCH_VALUE_OPTIONS = [
  0, 1, 2, 3, 4, 5,
] as const satisfies readonly AnimeListRewatchValue[];

export const ANIME_LIST_STATUS_BADGE_CLASS: Record<AnimeListStatus, string> = {
  watching: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  completed: "border-green-500/30 bg-green-500/15 text-green-300",
  on_hold: "border-amber-200/30 bg-amber-200/15 text-amber-100",
  dropped: "border-red-500/30 bg-red-500/15 text-red-300",
  plan_to_watch: "border-cyan-400/30 bg-cyan-400/15 text-cyan-300",
};

export function formatAnimeListScoreLabel(score: AnimeListScore, unscoredLabel: string) {
  if (score === 0) return unscoredLabel;
  return `(${score}) ${ANIME_LIST_SCORE_VALUE_LABEL[score]}`;
}
