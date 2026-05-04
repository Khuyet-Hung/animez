import type { AnimeMedia } from "@/types/anime";
import type {
  AnimeListEntryInput,
  AnimeListQuickAddInput,
  AnimeListSnapshotInput,
  AnimeListStatus,
  AnimeListUpsertInput,
} from "@/types/anime-list";
import { DEFAULT_ANIME_LIST_STATUS } from "@/lib/anime-list/constants";

export function createAnimeListSnapshot(anime: AnimeMedia): AnimeListSnapshotInput {
  return {
    anime_id: anime.id,
    total_episodes: anime.episodes ?? null,
    title_romaji: anime.title.romaji || null,
    title_english: anime.title.english || null,
    cover_image: anime.coverImage?.large || anime.coverImage?.extraLarge || null,
    format: anime.format || null,
    season: anime.season || null,
    season_year: anime.seasonYear ?? null,
  };
}

export function createQuickAddInput(
  anime: AnimeMedia,
  status: AnimeListStatus = DEFAULT_ANIME_LIST_STATUS
): AnimeListQuickAddInput {
  return {
    ...createAnimeListSnapshot(anime),
    status,
  };
}

export function createAnimeListUpsertInput(
  anime: AnimeMedia,
  input: AnimeListEntryInput = {}
): AnimeListUpsertInput {
  return {
    ...createAnimeListSnapshot(anime),
    ...input,
  };
}

export function clampAnimeListProgress(progress: number, totalEpisodes?: number | null) {
  const safeProgress = Math.max(0, Math.floor(progress));

  if (typeof totalEpisodes !== "number") {
    return safeProgress;
  }

  return Math.min(safeProgress, Math.max(0, totalEpisodes));
}
