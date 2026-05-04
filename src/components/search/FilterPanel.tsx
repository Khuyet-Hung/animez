"use client";

import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { animeGenres, animeSeasons } from "@/lib/anime-taxonomy";
import type { MediaFormat } from "@/types/anime";
import { MdFilterList } from "react-icons/md";

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

export default function FilterPanel() {
  const t = useTranslations("filter");
  const taxonomyT = useTranslations("taxonomy");
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
      params.delete("page");
      router.push(`/search?${params.toString()}`);
    },
    [router, searchParams]
  );

  const current = {
    genre: searchParams.get("genre") || "",
    format: searchParams.get("format") || "",
    status: searchParams.get("status") || "",
    season: searchParams.get("season") || "",
    year: searchParams.get("year") || "",
    sort: searchParams.get("sort") || "TRENDING_DESC",
  };

  function clearAll() {
    const q = searchParams.get("q");
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <aside className="w-full lg:w-[280px] flex-none bg-[#111118] border border-[#1a1a24] rounded p-5 flex flex-col gap-6 self-start">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <MdFilterList size={20} />
          {t("title")}
        </h2>
        <button onClick={clearAll} className="text-[#9ca3af] hover:text-[#f49e0b] text-xs font-semibold transition-colors">
          {t("clearAll")}
        </button>
      </div>

      {/* Sort */}
      <div>
        <p className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wide mb-3">{t("sortBy")}</p>
        <select
          value={current.sort}
          onChange={(e) => updateFilter("sort", e.target.value)}
          className="w-full bg-[#0a0a0f] border border-[#1a1a24] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#f49e0b] transition-colors"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{t(s.key)}</option>
          ))}
        </select>
      </div>

      {/* Genres */}
      <div>
        <p className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wide mb-3">{t("genres")}</p>
        <div className="flex flex-wrap gap-2">
          {animeGenres.map((genre) => (
            <button key={genre} onClick={() => updateFilter("genre", current.genre === genre ? null : genre)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${current.genre === genre ? "bg-[#f49e0b] text-[#0a0a0f]" : "bg-[#0a0a0f] border border-[#1a1a24] text-[#9ca3af] hover:border-[#f49e0b] hover:text-white"}`}>
              {taxonomyT(`genres.${genre}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div>
        <p className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wide mb-3">{t("format")}</p>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <button key={f.value} onClick={() => updateFilter("format", current.format === f.value ? null : f.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${current.format === f.value ? "bg-[#f49e0b] text-[#0a0a0f]" : "bg-[#0a0a0f] border border-[#1a1a24] text-[#9ca3af] hover:border-[#f49e0b] hover:text-white"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <p className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wide mb-3">{t("status")}</p>
        <div className="flex flex-col gap-2">
          {STATUS_KEYS.map((s) => (
            <button key={s.value} onClick={() => updateFilter("status", current.status === s.value ? null : s.value)}
              className={`text-left px-3 py-2 rounded text-sm font-medium transition-all ${current.status === s.value ? "bg-[#f49e0b]/10 text-[#f49e0b] border border-[#f49e0b]/30" : "text-[#9ca3af] hover:text-white hover:bg-[#1a1a24]"}`}>
              {t(s.key)}
            </button>
          ))}
        </div>
      </div>

      {/* Season + Year */}
      <div>
        <p className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wide mb-3">{t("season")}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {animeSeasons.map((season) => (
            <button key={season} onClick={() => updateFilter("season", current.season === season ? null : season)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${current.season === season ? "bg-[#f49e0b] text-[#0a0a0f]" : "bg-[#0a0a0f] border border-[#1a1a24] text-[#9ca3af] hover:border-[#f49e0b] hover:text-white"}`}>
              {taxonomyT(`seasons.${season}`)}
            </button>
          ))}
        </div>
        <select
          value={current.year}
          onChange={(e) => updateFilter("year", e.target.value || null)}
          className="w-full bg-[#0a0a0f] border border-[#1a1a24] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#f49e0b] transition-colors"
        >
          <option value="">{t("anyYear")}</option>
          {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>
    </aside>
  );
}
