import { animeGenres } from "@/lib/anime-taxonomy";
import { formatAnimeTitle } from "@/lib/anime-title";
import {
  MAX_SEARCH_YEAR,
  MEDIA_SEASONS,
  MIN_SEARCH_YEAR,
  normalizeEnum,
  normalizeYear,
} from "@/lib/search-params";
import type { AnimeMedia, AnimeTitle, MediaSeason } from "@/types/anime";

function slugifySegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function getAnimeSlug(title: AnimeTitle, locale?: string) {
  const label = formatAnimeTitle(title, locale) || title.romaji || title.native || title.english || "";
  return slugifySegment(label);
}

export function getAnimeHref(
  anime: Pick<AnimeMedia, "id" | "title"> | { id: number; title: AnimeTitle },
  locale?: string
) {
  const slug = getAnimeSlug(anime.title, locale);
  return slug ? `/anime/${anime.id}-${slug}` : `/anime/${anime.id}`;
}

export function parseAnimeIdParam(value: string) {
  const match = value.match(/^(\d+)/);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const genreSlugMap = new Map(animeGenres.map((genre) => [slugifySegment(genre), genre]));

export function getGenreSlug(genre: string) {
  return slugifySegment(genre);
}

export function getGenreHref(genre: string) {
  return `/genre/${getGenreSlug(genre)}`;
}

export function getGenreFromSlug(slug: string) {
  return genreSlugMap.get(slug) ?? null;
}

export function getSeasonSlug(season: MediaSeason, year: number) {
  return `${season.toLowerCase()}-${year}`;
}

export function getSeasonHref(season: MediaSeason, year: number) {
  return `/season/${getSeasonSlug(season, year)}`;
}

export function parseSeasonSlug(slug: string) {
  const match = slug.match(/^([a-z]+)-(\d{4})$/);
  if (!match) return null;

  const season = normalizeEnum(match[1].toUpperCase(), MEDIA_SEASONS);
  const year = normalizeYear(match[2]);

  if (!season || !year) return null;

  return { season, year };
}

export function getSeasonLandingYears() {
  const currentYear = new Date().getFullYear();
  const startYear = Math.max(MIN_SEARCH_YEAR, currentYear - 1);
  const endYear = Math.min(MAX_SEARCH_YEAR, currentYear + 1);
  const years: number[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year);
  }

  return years;
}
