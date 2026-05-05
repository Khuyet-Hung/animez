export interface AnimeTitle {
  romaji: string;
  english: string | null;
  native: string | null;
}

export interface AnimeCoverImage {
  large: string;
  extraLarge?: string;
  medium?: string;
  color?: string | null;
}

export interface AnimeMedia {
  id: number;
  title: AnimeTitle;
  coverImage: AnimeCoverImage;
  bannerImage?: string | null;
  averageScore?: number | null;
  meanScore?: number | null;
  popularity?: number;
  favourites?: number;
  trailer?: {
    id?: string | null;
    site?: string | null;
    thumbnail?: string | null;
  } | null;
  genres?: string[];
  format?: string | null;
  status?: string | null;
  episodes?: number | null;
  duration?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  nextAiringEpisode?: {
    episode: number;
    airingAt: number;
    timeUntilAiring: number;
  } | null;
  source?: string | null;
  description?: string | null;
  studios?: { nodes: { id: number; name: string }[] };
  characters?: {
    edges: {
      role: string;
      node: { id: number; name: { full: string }; image: { medium: string } };
      voiceActors: { id: number; name: { full: string }; image: { medium: string } }[];
    }[];
  };
  recommendations?: {
    nodes: {
      mediaRecommendation: {
        id: number;
        title: AnimeTitle;
        coverImage: AnimeCoverImage;
        averageScore?: number | null;
        format?: string | null;
      } | null;
    }[];
  };
  relations?: {
    edges: {
      relationType: string;
      node: {
        id: number;
        title: AnimeTitle;
        coverImage: AnimeCoverImage;
        averageScore?: number | null;
        format?: string | null;
        type?: string | null;
      };
    }[];
  };
}

export type MediaFormat = "TV" | "TV_SHORT" | "MOVIE" | "SPECIAL" | "OVA" | "ONA" | "MUSIC";
export type MediaStatus = "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";
export type MediaSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";
export type MediaSort = "TRENDING_DESC" | "POPULARITY_DESC" | "SCORE_DESC" | "START_DATE_DESC" | "FAVOURITES_DESC";

export interface SearchFilters {
  search?: string;
  genre?: string;
  format?: MediaFormat;
  status?: MediaStatus;
  season?: MediaSeason;
  seasonYear?: number;
  sort?: MediaSort;
  page?: number;
}
