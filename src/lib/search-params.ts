import type { MediaFormat, MediaSeason, MediaSort, MediaStatus } from "@/types/anime";

export const MAX_SEARCH_QUERY_LENGTH = 80;
export const MAX_SEARCH_PAGE = 500;
export const MIN_SEARCH_YEAR = 1940;
export const MAX_SEARCH_YEAR = new Date().getFullYear() + 2;

export const MEDIA_FORMATS = new Set<MediaFormat>([
  "TV",
  "TV_SHORT",
  "MOVIE",
  "SPECIAL",
  "OVA",
  "ONA",
  "MUSIC",
]);

export const MEDIA_STATUSES = new Set<MediaStatus>([
  "FINISHED",
  "RELEASING",
  "NOT_YET_RELEASED",
  "CANCELLED",
  "HIATUS",
]);

export const MEDIA_SEASONS = new Set<MediaSeason>(["WINTER", "SPRING", "SUMMER", "FALL"]);

export const MEDIA_SORTS = new Set<MediaSort>([
  "TRENDING_DESC",
  "POPULARITY_DESC",
  "SCORE_DESC",
  "START_DATE_DESC",
  "FAVOURITES_DESC",
]);

export function normalizeSearchQuery(value?: string) {
  return value?.trim().slice(0, MAX_SEARCH_QUERY_LENGTH) || undefined;
}

export function normalizeGenre(value?: string) {
  const normalized = value?.trim().slice(0, 40);
  return normalized || undefined;
}

export function normalizePage(value?: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 1;

  return Math.min(MAX_SEARCH_PAGE, Math.max(1, parsed));
}

export function normalizeYear(value?: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return undefined;
  if (parsed < MIN_SEARCH_YEAR || parsed > MAX_SEARCH_YEAR) return undefined;

  return parsed;
}

export function normalizeEnum<T extends string>(value: string | undefined, allowedValues: Set<T>) {
  return value && allowedValues.has(value as T) ? (value as T) : undefined;
}
