"use client";

import AnimeCard from "@/components/anime/AnimeCard";
import { Link } from "@/i18n/navigation";
import { requestAniList, AniListRateLimitError } from "@/lib/anilist-browser";
import { SEARCH_QUERY } from "@/lib/queries";
import {
  MEDIA_FORMATS,
  MEDIA_SEASONS,
  MEDIA_SORTS,
  MEDIA_STATUSES,
  normalizeEnum,
  normalizeGenre,
  normalizePage,
  normalizeSearchQuery,
  normalizeYear,
} from "@/lib/search-params";
import type { AnimeMedia, MediaSort } from "@/types/anime";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, ArrowRightIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

const DEFAULT_SORT: MediaSort = "TRENDING_DESC";
const SEARCH_STALE_TIME_MS = 10 * 60 * 1000;

interface PageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

interface SearchData {
  Page: {
    pageInfo: PageInfo;
    media: AnimeMedia[];
  };
}

interface SearchResultsClientProps {
  q?: string;
  genre?: string;
  format?: string;
  status?: string;
  season?: string;
  year?: string;
  sort?: string;
  page?: string;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="mb-3 aspect-2/3 w-full rounded bg-[#1a1a24]" />
      <div className="mb-2 h-4 rounded bg-[#1a1a24]" />
      <div className="h-3 w-2/3 rounded bg-[#1a1a24]" />
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
      {Array.from({ length: 20 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

export default function SearchResultsClient({
  q,
  genre,
  format,
  status,
  season,
  year,
  sort,
  page,
}: SearchResultsClientProps) {
  const t = useTranslations("search");

  const normalized = useMemo(() => {
    const normalizedSort = normalizeEnum(sort, MEDIA_SORTS) ?? DEFAULT_SORT;

    return {
      currentPage: normalizePage(page),
      searchQuery: normalizeSearchQuery(q),
      genre: normalizeGenre(genre),
      format: normalizeEnum(format, MEDIA_FORMATS),
      status: normalizeEnum(status, MEDIA_STATUSES),
      season: normalizeEnum(season, MEDIA_SEASONS),
      year: normalizeYear(year),
      sort: normalizedSort,
    };
  }, [format, genre, page, q, season, sort, status, year]);

  const variables = useMemo(
    () => ({
      search: normalized.searchQuery,
      page: normalized.currentPage,
      perPage: 20,
      genre: normalized.genre,
      format: normalized.format,
      status: normalized.status,
      season: normalized.season,
      seasonYear: normalized.year,
      sort: [normalized.sort],
    }),
    [normalized]
  );

  const searchQuery = useQuery({
    queryKey: ["anilist-search", variables],
    queryFn: () => requestAniList<SearchData>(SEARCH_QUERY, variables),
    staleTime: SEARCH_STALE_TIME_MS,
    gcTime: SEARCH_STALE_TIME_MS,
    retry: (failureCount, error) =>
      !(error instanceof AniListRateLimitError) && failureCount < 1,
  });

  function buildPageUrl(nextPage: number) {
    const params = new URLSearchParams();
    if (normalized.searchQuery) params.set("q", normalized.searchQuery);
    if (normalized.genre) params.set("genre", normalized.genre);
    if (normalized.format) params.set("format", normalized.format);
    if (normalized.status) params.set("status", normalized.status);
    if (normalized.season) params.set("season", normalized.season);
    if (normalized.year) params.set("year", String(normalized.year));
    if (sort && normalized.sort !== DEFAULT_SORT) params.set("sort", normalized.sort);
    params.set("page", String(nextPage));

    return `/search?${params.toString()}`;
  }

  if (searchQuery.isPending) {
    return <SearchSkeleton />;
  }

  if (searchQuery.isError) {
    const isRateLimited = searchQuery.error instanceof AniListRateLimitError;

    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <RefreshCwIcon className="size-14 text-[#1a1a24]" />
        <h3 className="mt-4 text-xl font-bold text-white">
          {isRateLimited ? t("rate_limited") : t("load_failed")}
        </h3>
        <p className="mt-2 max-w-md text-sm text-[#9ca3af]">
          {isRateLimited ? t("rate_limited_hint") : t("no_results_hint")}
        </p>
        <button
          type="button"
          onClick={() => searchQuery.refetch()}
          className="mt-6 rounded bg-[#f49e0b] px-5 py-2 text-sm font-bold text-[#0a0a0f] transition-colors hover:bg-[#d68a09]"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const animeList = searchQuery.data.Page.media;
  const pageInfo = searchQuery.data.Page.pageInfo;

  if (animeList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="material-symbols-outlined text-[#1a1a24]" style={{ fontSize: "80px" }}>
          search_off
        </span>
        <h3 className="mt-4 text-xl font-bold text-white">{t("no_results")}</h3>
        <p className="mt-2 text-sm text-[#9ca3af]">{t("no_results_hint")}</p>
        <Link
          href="/search"
          className="mt-6 rounded bg-[#f49e0b] px-5 py-2 text-sm font-bold text-[#0a0a0f] transition-colors hover:bg-[#d68a09]"
        >
          {t("clear_filters")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[#9ca3af]">
        {pageInfo.total > 0 && t("results_count", { count: pageInfo.total.toLocaleString() })}
        {normalized.searchQuery && <> {t("results_for", { query: normalized.searchQuery })}</>}
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
        {animeList.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} />
        ))}
      </div>

      {pageInfo.lastPage > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {normalized.currentPage > 1 && (
            <Link
              href={buildPageUrl(normalized.currentPage - 1)}
              className="flex items-center gap-1 rounded border border-[#1a1a24] bg-[#111118] px-3 py-2 text-sm font-semibold text-white transition-all hover:border-[#f49e0b]"
            >
              <ArrowLeftIcon />
              {t("prev")}
            </Link>
          )}
          {Array.from({ length: Math.min(7, pageInfo.lastPage) }, (_, index) => {
            let pageNumber: number;
            if (pageInfo.lastPage <= 7) pageNumber = index + 1;
            else if (normalized.currentPage <= 4) pageNumber = index + 1;
            else if (normalized.currentPage >= pageInfo.lastPage - 3) {
              pageNumber = pageInfo.lastPage - 6 + index;
            } else {
              pageNumber = normalized.currentPage - 3 + index;
            }

            return (
              <Link
                key={pageNumber}
                href={buildPageUrl(pageNumber)}
                className={`flex size-9 items-center justify-center rounded text-sm font-bold transition-all ${
                  pageNumber === normalized.currentPage
                    ? "bg-[#f49e0b] text-[#0a0a0f]"
                    : "border border-[#1a1a24] bg-[#111118] text-white hover:border-[#f49e0b]"
                }`}
              >
                {pageNumber}
              </Link>
            );
          })}
          {pageInfo.hasNextPage && (
            <Link
              href={buildPageUrl(normalized.currentPage + 1)}
              className="flex items-center gap-1 rounded border border-[#1a1a24] bg-[#111118] px-3 py-2 text-sm font-semibold text-white transition-all hover:border-[#f49e0b]"
            >
              {t("next")}
              <ArrowRightIcon />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
