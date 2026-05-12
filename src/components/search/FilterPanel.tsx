"use client";

import { useRouter } from "@/i18n/navigation";
import { animeGenres, animeSeasons } from "@/lib/anime-taxonomy";
import type { MediaFormat } from "@/types/anime";
import {
  ChevronDownIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

const FORMATS: { label: string; value: MediaFormat }[] = [
  { label: "TV", value: "TV" },
  { label: "Movie", value: "MOVIE" },
  { label: "OVA", value: "OVA" },
  { label: "ONA", value: "ONA" },
  { label: "Special", value: "SPECIAL" },
];

const STATUS_KEYS = [
  { key: "status_releasing", value: "RELEASING" },
  { key: "status_finished", value: "FINISHED" },
  { key: "status_not_yet", value: "NOT_YET_RELEASED" },
] as const;

const SORTS = [
  { key: "sort_trending", value: "TRENDING_DESC" },
  { key: "sort_popularity", value: "POPULARITY_DESC" },
  { key: "sort_score", value: "SCORE_DESC" },
  { key: "sort_newest", value: "START_DATE_DESC" },
  { key: "sort_favorites", value: "FAVOURITES_DESC" },
] as const;

const YEARS = Array.from({ length: 35 }, (_, i) => 2025 - i);
const DEFAULT_SORT = "TRENDING_DESC";
const COLLAPSED_GENRE_COUNT = 8;

type FilterKey = "genre" | "format" | "status" | "season" | "year" | "sort";
type SectionKey = "genres" | "format" | "status" | "season";

interface CurrentFilters {
  genre: string;
  format: string;
  status: string;
  season: string;
  year: string;
  sort: string;
}

interface ActiveFilter {
  key: FilterKey;
  label: string;
}

function getFilterHref(searchParams: URLSearchParams, key: string, value: string | null) {
  const params = new URLSearchParams(searchParams.toString());

  if (value === null || value === "") params.delete(key);
  else params.set(key, value);

  params.delete("page");

  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="group inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-[#f49e0b]/30 bg-[#f49e0b]/10 px-3 text-xs font-bold text-[#f6b13b] transition-colors hover:border-[#f49e0b] hover:bg-[#f49e0b] hover:text-[#0a0a0f]"
    >
      <span className="truncate">{label}</span>
      <XIcon className="size-3.5 shrink-0 transition-transform group-hover:scale-110" />
    </button>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
        active
          ? "bg-[#f49e0b] text-[#0a0a0f] shadow-[0_0_18px_rgba(244,158,11,0.18)]"
          : "border border-[#1f1f2b] bg-[#0a0a0f] text-[#9ca3af] hover:border-[#f49e0b] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function FilterSection({
  id,
  title,
  openSections,
  onToggle,
  children,
}: {
  id: SectionKey;
  title: string;
  openSections: Record<SectionKey, boolean>;
  onToggle: (section: SectionKey) => void;
  children: ReactNode;
}) {
  const isOpen = openSections[id];

  return (
    <section className="border-t border-[#1a1a24] pt-4">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-bold uppercase tracking-wide text-[#9ca3af]">
          {title}
        </span>
        <ChevronDownIcon
          className={`size-4 text-[#9ca3af] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && <div className="mt-3">{children}</div>}
    </section>
  );
}

export default function FilterPanel() {
  const t = useTranslations("filter");
  const taxonomyT = useTranslations("taxonomy");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);

  const current: CurrentFilters = {
    genre: searchParams.get("genre") || "",
    format: searchParams.get("format") || "",
    status: searchParams.get("status") || "",
    season: searchParams.get("season") || "",
    year: searchParams.get("year") || "",
    sort: searchParams.get("sort") || DEFAULT_SORT,
  };

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    genres: Boolean(current.genre),
    format: Boolean(current.format),
    status: Boolean(current.status),
    season: Boolean(current.season || current.year),
  });

  const updateFilter = useCallback(
    (key: FilterKey, value: string | null) => {
      router.push(getFilterHref(searchParams, key, value));
    },
    [router, searchParams]
  );

  const clearAll = useCallback(() => {
    const q = searchParams.get("q");
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }, [router, searchParams]);

  const toggleSection = useCallback((section: SectionKey) => {
    setOpenSections((sections) => ({
      ...sections,
      [section]: !sections[section],
    }));
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const originalOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen]);

  const labels = useMemo(() => {
    const formatLabels = new Map<string, string>(
      FORMATS.map((format) => [format.value, format.label])
    );
    const statusLabels = new Map<string, string>(
      STATUS_KEYS.map((status) => [status.value, t(status.key)])
    );
    const sortLabels = new Map<string, string>(
      SORTS.map((sort) => [sort.value, t(sort.key)])
    );

    return { formatLabels, statusLabels, sortLabels };
  }, [t]);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];

    if (current.genre) {
      filters.push({
        key: "genre",
        label: taxonomyT(`genres.${current.genre}`),
      });
    }

    if (current.format) {
      filters.push({
        key: "format",
        label: labels.formatLabels.get(current.format as MediaFormat) || current.format,
      });
    }

    if (current.status) {
      filters.push({
        key: "status",
        label: labels.statusLabels.get(current.status) || current.status,
      });
    }

    if (current.season) {
      filters.push({
        key: "season",
        label: taxonomyT(`seasons.${current.season}`),
      });
    }

    if (current.year) {
      filters.push({
        key: "year",
        label: current.year,
      });
    }

    if (current.sort !== DEFAULT_SORT) {
      filters.push({
        key: "sort",
        label: labels.sortLabels.get(current.sort) || current.sort,
      });
    }

    return filters;
  }, [
    current.format,
    current.genre,
    current.season,
    current.sort,
    current.status,
    current.year,
    labels.formatLabels,
    labels.sortLabels,
    labels.statusLabels,
    taxonomyT,
  ]);

  const hasActiveFilters = activeFilters.length > 0;
  const visibleGenres = showAllGenres
    ? animeGenres
    : animeGenres.slice(0, COLLAPSED_GENRE_COUNT);

  const renderActiveFilterChips = () => (
    <div className="flex flex-wrap gap-2">
      {activeFilters.map((filter) => (
        <FilterChip
          key={filter.key}
          label={filter.label}
          onRemove={() => updateFilter(filter.key, null)}
        />
      ))}
    </div>
  );

  const renderFilterControls = () => (
    <>
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#9ca3af]">
          {t("sortBy")}
        </p>
        <select
          value={current.sort}
          onChange={(event) => updateFilter("sort", event.target.value)}
          className="h-10 w-full rounded border border-[#1a1a24] bg-[#0a0a0f] px-3 text-sm font-semibold text-white transition-colors focus:border-[#f49e0b] focus:outline-none"
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {t(sort.key)}
            </option>
          ))}
        </select>
      </div>

      <FilterSection
        id="genres"
        title={t("genres")}
        openSections={openSections}
        onToggle={toggleSection}
      >
        <div className="flex flex-wrap gap-2">
          {visibleGenres.map((genre) => (
            <FilterButton
              key={genre}
              active={current.genre === genre}
              onClick={() => updateFilter("genre", current.genre === genre ? null : genre)}
            >
              {taxonomyT(`genres.${genre}`)}
            </FilterButton>
          ))}
          {!showAllGenres && animeGenres.length > COLLAPSED_GENRE_COUNT && (
            <button
              type="button"
              onClick={() => setShowAllGenres(true)}
              className="rounded-full border border-dashed border-[#f49e0b]/40 bg-[#0a0a0f] px-3 py-1.5 text-xs font-bold text-[#f6b13b] transition-colors hover:border-[#f49e0b] hover:text-white"
            >
              +{animeGenres.length - COLLAPSED_GENRE_COUNT}
            </button>
          )}
        </div>
      </FilterSection>

      <FilterSection
        id="format"
        title={t("format")}
        openSections={openSections}
        onToggle={toggleSection}
      >
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((format) => (
            <FilterButton
              key={format.value}
              active={current.format === format.value}
              onClick={() =>
                updateFilter("format", current.format === format.value ? null : format.value)
              }
            >
              {format.label}
            </FilterButton>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        id="status"
        title={t("status")}
        openSections={openSections}
        onToggle={toggleSection}
      >
        <div className="flex flex-col gap-2">
          {STATUS_KEYS.map((status) => (
            <button
              key={status.value}
              type="button"
              onClick={() =>
                updateFilter("status", current.status === status.value ? null : status.value)
              }
              className={`rounded px-3 py-2 text-left text-sm font-semibold transition-all ${
                current.status === status.value
                  ? "border border-[#f49e0b]/30 bg-[#f49e0b]/10 text-[#f49e0b]"
                  : "text-[#9ca3af] hover:bg-[#1a1a24] hover:text-white"
              }`}
            >
              {t(status.key)}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        id="season"
        title={t("season")}
        openSections={openSections}
        onToggle={toggleSection}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {animeSeasons.map((season) => (
            <FilterButton
              key={season}
              active={current.season === season}
              onClick={() =>
                updateFilter("season", current.season === season ? null : season)
              }
            >
              {taxonomyT(`seasons.${season}`)}
            </FilterButton>
          ))}
        </div>
        <select
          value={current.year}
          onChange={(event) => updateFilter("year", event.target.value || null)}
          className="h-10 w-full rounded border border-[#1a1a24] bg-[#0a0a0f] px-3 text-sm font-semibold text-white transition-colors focus:border-[#f49e0b] focus:outline-none"
        >
          <option value="">{t("anyYear")}</option>
          {YEARS.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </select>
      </FilterSection>
    </>
  );

  return (
    <>
      <div className="lg:hidden">
        <div className="rounded border border-[#1a1a24] bg-[#111118] p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded bg-[#f49e0b] px-4 text-sm font-black text-[#0a0a0f] transition-colors hover:bg-[#d68a09]"
            >
              <SlidersHorizontalIcon className="size-4" />
              {t("title")}
            </button>
            {hasActiveFilters ? (
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto lg:pb-1">
                {activeFilters.map((filter) => (
                  <FilterChip
                    key={filter.key}
                    label={filter.label}
                    onRemove={() => updateFilter(filter.key, null)}
                  />
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={clearAll}
                className="ml-auto text-xs font-bold text-[#9ca3af] transition-colors hover:text-[#f49e0b]"
              >
                {t("clearAll")}
              </button>
            )}
          </div>
        </div>

        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsDrawerOpen(false)}
              aria-label={t("title")}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("title")}
              className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-hidden rounded-t-2xl border border-[#272733] bg-[#111118] shadow-[0_-24px_70px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-center justify-between border-b border-[#1a1a24] px-4 py-4">
                <h2 className="flex items-center gap-2 text-base font-black text-white">
                  <SlidersHorizontalIcon className="size-5" />
                  {t("title")}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="grid size-9 place-items-center rounded-full border border-[#272733] text-[#9ca3af] transition-colors hover:border-[#f49e0b] hover:text-white"
                  aria-label={t("title")}
                >
                  <XIcon className="size-4" />
                </button>
              </div>

              <div className="max-h-[calc(86vh-73px)] overflow-y-auto px-4 py-5">
                {hasActiveFilters && <div className="mb-5">{renderActiveFilterChips()}</div>}
                <div className="flex flex-col gap-5">{renderFilterControls()}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="hidden w-full flex-none self-start rounded border border-[#1a1a24] bg-[#111118] p-5 lg:sticky lg:top-24 lg:flex lg:w-[280px] lg:flex-col lg:gap-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-black text-white">
            <SlidersHorizontalIcon className="size-5" />
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-bold text-[#9ca3af] transition-colors hover:text-[#f49e0b]"
          >
            {t("clearAll")}
          </button>
        </div>

        {hasActiveFilters && renderActiveFilterChips()}

        <div className="flex flex-col gap-5">{renderFilterControls()}</div>
      </aside>
    </>
  );
}
