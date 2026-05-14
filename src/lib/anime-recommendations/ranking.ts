import type { AnimeMedia } from "@/types/anime";
import type { AnimeListStatus } from "@/types/anime-list";
import type {
  RecommendationConfidence,
  RecommendationProfileSnapshot,
  RecommendationSearchFields,
} from "@/types/anime-recommendations";

export interface RecommendationSourceEntry {
  anime_id: number;
  status: AnimeListStatus;
  score: number;
  title_romaji: string | null;
  title_english: string | null;
  cover_image: string | null;
  format: string | null;
  season_year: number | null;
  total_episodes: number | null;
  genres?: string[] | null;
}

export interface RankedCandidate {
  anime: AnimeMedia;
  matchScore: number;
  reason: {
    genres: string[];
    format: string | null;
    yearAffinity: number;
    averageScore: number | null;
    popularity: number | null;
  };
}

const STATUS_WEIGHTS: Record<AnimeListStatus, number> = {
  completed: 100,
  watching: 80,
  plan_to_watch: 30,
  on_hold: 20,
  dropped: 10,
};

function getScoreMultiplier(score: number) {
  if (score >= 9) return 1.2;
  if (score >= 7) return 1;
  if (score >= 5) return 0.7;
  if (score >= 1) return 0.3;
  return 0.8;
}

function addScore(map: Map<string, number>, key: string | null | undefined, score: number) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + score);
}

function toSortedList(map: Map<string, number>) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({ name, score: Math.round(score) }));
}

function getConfidence(inputCount: number, usefulWeight: number): RecommendationConfidence {
  if (inputCount >= 12 && usefulWeight >= 500) return "high";
  if (inputCount >= 5 && usefulWeight >= 180) return "medium";
  return "low";
}

export function buildRecommendationProfile(
  entries: RecommendationSourceEntry[],
  notInterestedAnimeIds: number[]
): {
  snapshot: RecommendationProfileSnapshot;
  searchFields: RecommendationSearchFields;
} {
  const genreScores = new Map<string, number>();
  const formatScores = new Map<string, number>();
  const weightedYears: { year: number; weight: number }[] = [];
  let usefulWeight = 0;

  for (const entry of entries) {
    const entryWeight = STATUS_WEIGHTS[entry.status] * getScoreMultiplier(entry.score);
    usefulWeight += entryWeight;

    for (const genre of entry.genres ?? []) {
      addScore(genreScores, genre, entryWeight);
    }

    addScore(formatScores, entry.format, entryWeight);

    if (entry.season_year) {
      weightedYears.push({ year: entry.season_year, weight: entryWeight });
    }
  }

  const topGenres = toSortedList(genreScores);
  const topFormats = toSortedList(formatScores);
  const confidence = getConfidence(entries.length, usefulWeight);
  const averageYear =
    weightedYears.length > 0
      ? Math.round(
          weightedYears.reduce((sum, item) => sum + item.year * item.weight, 0) /
            weightedYears.reduce((sum, item) => sum + item.weight, 0)
        )
      : null;
  const currentYear = new Date().getFullYear();
  const yearRange = averageYear
    ? {
        from: Math.max(1970, averageYear - 6),
        to: Math.min(currentYear + 1, averageYear + 6),
      }
    : { from: currentYear - 10, to: currentYear + 1 };

  const snapshot: RecommendationProfileSnapshot = {
    inputCount: entries.length,
    usefulWeight: Math.round(usefulWeight),
    topGenres: topGenres.slice(0, 8),
    topFormats: topFormats.slice(0, 5),
    yearRange,
    excludedAnimeIds: [...new Set([...entries.map((entry) => entry.anime_id), ...notInterestedAnimeIds])],
    confidence,
  };

  return {
    snapshot,
    searchFields: {
      genres: topGenres.slice(0, 4).map((item) => item.name),
      formats: topFormats.slice(0, 3).map((item) => item.name),
      yearRange,
      sortCandidates: ["SCORE_DESC", "POPULARITY_DESC", "TRENDING_DESC"],
      confidence,
    },
  };
}

export function rankRecommendationCandidates(
  candidates: AnimeMedia[],
  snapshot: RecommendationProfileSnapshot,
  excludedAnimeIds: Set<number>,
  limit = 30
): RankedCandidate[] {
  const genreWeights = new Map(snapshot.topGenres.map((item) => [item.name, item.score]));
  const formatWeights = new Map(snapshot.topFormats.map((item) => [item.name, item.score]));
  const bestGenreScore = Math.max(...snapshot.topGenres.map((item) => item.score), 1);
  const bestFormatScore = Math.max(...snapshot.topFormats.map((item) => item.score), 1);
  const seen = new Set<number>();

  return candidates
    .filter((anime) => {
      if (excludedAnimeIds.has(anime.id) || seen.has(anime.id)) return false;
      seen.add(anime.id);
      return true;
    })
    .map((anime) => {
      const matchedGenres = (anime.genres ?? []).filter((genre) => genreWeights.has(genre));
      const genreScore = matchedGenres.reduce(
        (score, genre) => score + (genreWeights.get(genre) ?? 0) / bestGenreScore,
        0
      );
      const formatScore = anime.format ? (formatWeights.get(anime.format) ?? 0) / bestFormatScore : 0;
      const yearAffinity = getYearAffinity(anime.seasonYear, snapshot.yearRange);
      const qualityBonus = (anime.averageScore ?? 60) / 100;
      const popularityBonus = Math.min(1, Math.log10((anime.popularity ?? 1) + 1) / 6);
      const matchScore =
        genreScore * 45 + formatScore * 20 + yearAffinity * 15 + qualityBonus * 12 + popularityBonus * 8;

      return {
        anime,
        matchScore: Math.round(matchScore * 10) / 10,
        reason: {
          genres: matchedGenres,
          format: anime.format ?? null,
          yearAffinity,
          averageScore: anime.averageScore ?? null,
          popularity: anime.popularity ?? null,
        },
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

function getYearAffinity(year: number | null | undefined, range: { from: number | null; to: number | null }) {
  if (!year || !range.from || !range.to) return 0.5;
  if (year >= range.from && year <= range.to) return 1;

  const distance = year < range.from ? range.from - year : year - range.to;
  return Math.max(0, 1 - distance / 12);
}
