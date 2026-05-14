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
import { AppButton, AppPanel, AppSelect } from "@/components/ui";

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
      className="group inline-flex h-8 max-w-full items-center gap-1.5 rounded-ui-pill border border-brand/30 bg-brand/10 px-3 text-xs font-bold text-brand-soft transition-colors hover:border-brand hover:bg-brand hover:text-brand-fg"
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
      className={`rounded-ui-pill px-3 py-1.5 text-xs font-bold transition-all ${
        active
          ? "bg-brand text-brand-fg shadow-[0_0_18px_rgba(244,158,11,0.18)]"
          : "border border-border bg-bg text-fg-muted hover:border-brand hover:text-fg"
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
    <section className="border-t border-border pt-4">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-bold uppercase tracking-wide text-fg-muted">
          {title}
        </span>
        <ChevronDownIcon
          className={`size-4 text-fg-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
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
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-fg-muted">
          {t("sortBy")}
        </p>
        <AppSelect
          value={current.sort}
          onChange={(event) => updateFilter("sort", event.target.value)}
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {t(sort.key)}
            </option>
          ))}
        </AppSelect>
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
              className="rounded-ui-pill border border-dashed border-brand/40 bg-bg px-3 py-1.5 text-xs font-bold text-brand-soft transition-colors hover:border-brand hover:text-fg"
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
              className={`rounded-ui-sm px-3 py-2 text-left text-sm font-semibold transition-all ${
                current.status === status.value
                  ? "border border-brand/30 bg-brand/10 text-brand"
                  : "text-fg-muted hover:bg-border hover:text-fg"
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
        <AppSelect
          value={current.year}
          onChange={(event) => updateFilter("year", event.target.value || null)}
        >
          <option value="">{t("anyYear")}</option>
          {YEARS.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </AppSelect>
      </FilterSection>
    </>
  );

  return (
    <>
      <div className="lg:hidden">
        <AppPanel className="p-3">
          <div className="flex items-center gap-2">
            <AppButton
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              size="sm"
              className="h-10 shrink-0 text-sm font-black"
              leftIcon={<SlidersHorizontalIcon className="size-4" />}
            >
              {t("title")}
            </AppButton>
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
                className="ml-auto text-xs font-bold text-fg-muted transition-colors hover:text-brand"
              >
                {t("clearAll")}
              </button>
            )}
          </div>
        </AppPanel>

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
              className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-hidden rounded-t-ui-xl border border-border-soft bg-surface shadow-[0_-24px_70px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <h2 className="flex items-center gap-2 text-base font-black text-fg">
                  <SlidersHorizontalIcon className="size-5" />
                  {t("title")}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="grid size-9 place-items-center rounded-ui-pill border border-border-soft text-fg-muted transition-colors hover:border-brand hover:text-fg"
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

      <aside className="hidden w-full flex-none self-start rounded-ui-sm border border-border bg-surface p-5 lg:sticky lg:top-24 lg:flex lg:w-[280px] lg:flex-col lg:gap-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-black text-fg">
            <SlidersHorizontalIcon className="size-5" />
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-bold text-fg-muted transition-colors hover:text-brand"
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
