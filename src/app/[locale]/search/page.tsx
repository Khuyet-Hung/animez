import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FilterPanel from "@/components/search/FilterPanel";
import SearchBar from "@/components/search/SearchBar";
import AnimeCard from "@/components/anime/AnimeCard";
import { anilistClient } from "@/lib/anilist";
import { SEARCH_QUERY } from "@/lib/queries";
import type { AnimeMedia, MediaFormat, MediaStatus, MediaSeason, MediaSort } from "@/types/anime";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo";

const MAX_SEARCH_QUERY_LENGTH = 80;
const MAX_SEARCH_PAGE = 500;
const MIN_SEARCH_YEAR = 1940;
const MAX_SEARCH_YEAR = new Date().getFullYear() + 2;
const MEDIA_FORMATS = new Set<MediaFormat>(["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC"]);
const MEDIA_STATUSES = new Set<MediaStatus>(["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED", "HIATUS"]);
const MEDIA_SEASONS = new Set<MediaSeason>(["WINTER", "SPRING", "SUMMER", "FALL"]);
const MEDIA_SORTS = new Set<MediaSort>([
  "TRENDING_DESC",
  "POPULARITY_DESC",
  "SCORE_DESC",
  "START_DATE_DESC",
  "FAVOURITES_DESC",
]);

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

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    genre?: string;
    format?: string;
    status?: string;
    season?: string;
    year?: string;
    sort?: string;
    page?: string;
  }>;
}

function normalizeSearchQuery(value?: string) {
  return value?.trim().slice(0, MAX_SEARCH_QUERY_LENGTH) || undefined;
}

function normalizeGenre(value?: string) {
  const normalized = value?.trim().slice(0, 40);
  return normalized || undefined;
}

function normalizePage(value?: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 1;

  return Math.min(MAX_SEARCH_PAGE, Math.max(1, parsed));
}

function normalizeYear(value?: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return undefined;
  if (parsed < MIN_SEARCH_YEAR || parsed > MAX_SEARCH_YEAR) return undefined;

  return parsed;
}

function normalizeEnum<T extends string>(value: string | undefined, allowedValues: Set<T>) {
  return value && allowedValues.has(value as T) ? (value as T) : undefined;
}

export async function generateMetadata({
  params,
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const { q: rawQuery } = await searchParams;
  const q = normalizeSearchQuery(rawQuery);
  const t = await getTranslations({ locale, namespace: "search" });
  const title = q ? t("title_query", { query: q }) : t("title");
  const description = q
    ? `${title} on Animez.`
    : "Browse anime by title, genre, format, status, season, and release year on Animez.";

  return createSeoMetadata({
    locale,
    path: "/search",
    title,
    description,
  });
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="w-full aspect-2/3 rounded bg-[#1a1a24] mb-3" />
      <div className="h-4 bg-[#1a1a24] rounded mb-2" />
      <div className="h-3 bg-[#1a1a24] rounded w-2/3" />
    </div>
  );
}

async function SearchResults({
  q, genre, format, status, season, year, sort, page,
}: {
  q?: string; genre?: string; format?: string; status?: string;
  season?: string; year?: string; sort?: string; page?: string;
}) {
  const t = await getTranslations("search");
  let animeList: AnimeMedia[] = [];
  let pageInfo: PageInfo = { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false };
  const currentPage = normalizePage(page);
  const searchQuery = normalizeSearchQuery(q);
  const normalizedGenre = normalizeGenre(genre);
  const normalizedFormat = normalizeEnum(format, MEDIA_FORMATS);
  const normalizedStatus = normalizeEnum(status, MEDIA_STATUSES);
  const normalizedSeason = normalizeEnum(season, MEDIA_SEASONS);
  const normalizedYear = normalizeYear(year);
  const normalizedSort = normalizeEnum(sort, MEDIA_SORTS) ?? "TRENDING_DESC";

  try {
    const data = await anilistClient.request<SearchData>(SEARCH_QUERY, {
      search: searchQuery,
      page: currentPage,
      perPage: 20,
      genre: normalizedGenre,
      format: normalizedFormat,
      status: normalizedStatus,
      season: normalizedSeason,
      seasonYear: normalizedYear,
      sort: [normalizedSort],
    });
    animeList = data.Page.media;
    pageInfo = data.Page.pageInfo;
  } catch (error) {
    console.error("Search error:", error);
  }

  if (animeList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="material-symbols-outlined text-[#1a1a24]" style={{ fontSize: "80px" }}>search_off</span>
        <h3 className="text-white text-xl font-bold mt-4">{t("no_results")}</h3>
        <p className="text-[#9ca3af] mt-2 text-sm">{t("no_results_hint")}</p>
        <Link href="/search" className="mt-6 px-5 py-2 bg-[#f49e0b] text-[#0a0a0f] font-bold rounded text-sm hover:bg-[#d68a09] transition-colors">
          {t("clear_filters")}
        </Link>
      </div>
    );
  }

  function buildPageUrl(p: number) {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (normalizedGenre) params.set("genre", normalizedGenre);
    if (normalizedFormat) params.set("format", normalizedFormat);
    if (normalizedStatus) params.set("status", normalizedStatus);
    if (normalizedSeason) params.set("season", normalizedSeason);
    if (normalizedYear) params.set("year", String(normalizedYear));
    if (sort && normalizedSort !== "TRENDING_DESC") params.set("sort", normalizedSort);
    params.set("page", String(p));
    return `/search?${params.toString()}`;
  }

  return (
    <div>
      <p className="text-[#9ca3af] text-sm mb-4">
        {pageInfo.total > 0 && t("results_count", { count: pageInfo.total.toLocaleString() })}
        {searchQuery && <> {t("results_for", { query: searchQuery })}</>}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
        {animeList.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} />
        ))}
      </div>

      {pageInfo.lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          {currentPage > 1 && (
            <Link href={buildPageUrl(currentPage - 1)} className="flex items-center gap-1 px-3 py-2 bg-[#111118] border border-[#1a1a24] hover:border-[#f49e0b] text-sm font-semibold text-white rounded transition-all">
              <ArrowLeftIcon />
              {t("prev")}
            </Link>
          )}
          {Array.from({ length: Math.min(7, pageInfo.lastPage) }, (_, i) => {
            let p: number;
            if (pageInfo.lastPage <= 7) p = i + 1;
            else if (currentPage <= 4) p = i + 1;
            else if (currentPage >= pageInfo.lastPage - 3) p = pageInfo.lastPage - 6 + i;
            else p = currentPage - 3 + i;
            return (
              <Link key={p} href={buildPageUrl(p)} className={`w-9 h-9 flex items-center justify-center rounded text-sm font-bold transition-all ${p === currentPage ? "bg-[#f49e0b] text-[#0a0a0f]" : "bg-[#111118] border border-[#1a1a24] text-white hover:border-[#f49e0b]"}`}>
                {p}
              </Link>
            );
          })}
          {pageInfo.hasNextPage && (
            <Link href={buildPageUrl(currentPage + 1)} className="flex items-center gap-1 px-3 py-2 bg-[#111118] border border-[#1a1a24] hover:border-[#f49e0b] text-sm font-semibold text-white rounded transition-all">
              {t("next")}
              <ArrowRightIcon />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("search");
  const resolvedParams = await searchParams;
  const { q, genre, format, status, season, year, sort, page } = resolvedParams;
  const searchQuery = normalizeSearchQuery(q);

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:pl-32 min-[1600px]:pl-6 py-8 pb-20">
        <h1 className="text-2xl font-black text-white mb-6">
          {searchQuery ? t("title_query", { query: searchQuery }) : t("title")}
        </h1>

        <Suspense fallback={null}>
          <div className="mb-8"><SearchBar /></div>
        </Suspense>

        <div className="flex flex-col lg:flex-row gap-8">
          <Suspense fallback={null}>
            <FilterPanel />
          </Suspense>

          <div className="flex-1 min-w-0">
            <Suspense fallback={
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
                {Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            }>
              <SearchResults q={searchQuery} genre={genre} format={format} status={status} season={season} year={year} sort={sort} page={page} />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
