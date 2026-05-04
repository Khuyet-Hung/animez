"use client";

import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useEffect, Suspense } from "react";
import { anilistClient } from "@/lib/anilist";
import { SUGGESTIONS_QUERY } from "@/lib/queries";
import { defaultLocale, type AppLocale, isAppLocale, locales } from "@/i18n/locales";
import { formatAnimeTitle } from "@/lib/anime-title";
import type { AnimeMedia } from "@/types/anime";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, SearchIcon } from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";
import { motion } from "framer-motion";
import useHydratedReducedMotion from "@/hooks/useHydratedReducedMotion";

function SearchBarInner() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [suggestions, setSuggestions] = useState<AnimeMedia[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const reduceMotion = useHydratedReducedMotion();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await anilistClient.request<{ Page: { media: AnimeMedia[] } }>(
          SUGGESTIONS_QUERY, { search: value }
        );
        setSuggestions(data.Page.media);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowSuggestions(false);
    }
  }

  return (
    <div ref={containerRef} className="relative hidden md:flex flex-col min-w-64 h-full">
      <form onSubmit={handleSubmit}>
        <motion.div
          className="flex w-full flex-1 items-stretch rounded bg-[#111118] border border-[#1a1a24] focus-within:border-[#f49e0b] transition-colors"
          animate={reduceMotion ? undefined : {
            scale: isFocused || showSuggestions ? 1.01 : 1,
            boxShadow: isFocused || showSuggestions ? "0 0 0 3px rgba(244, 158, 11, 0.12)" : "0 0 0 0 rgba(244, 158, 11, 0)",
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="text-[#9ca3af] flex items-center justify-center pl-3">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}><SearchIcon /></span>
          </div>
          <input
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => setIsFocused(false)}
            className="w-full bg-transparent border-none text-sm text-white focus:outline-none placeholder:text-[#9ca3af] px-3 py-2"
            placeholder={t("search_placeholder")}
          />
        </motion.div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#111118] border border-[#1a1a24] rounded shadow-xl z-50 overflow-hidden">
          {suggestions.map((anime) => (
            <Link key={anime.id} href={`/anime/${anime.id}`} onClick={() => setShowSuggestions(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-[#1a1a24] transition-colors">
              {anime.coverImage?.medium && (
                <Image src={anime.coverImage.medium} alt={formatAnimeTitle(anime.title, locale)} width={32} height={44} className="rounded object-cover flex-none" unoptimized />
              )}
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{formatAnimeTitle(anime.title, locale)}</p>
                {anime.format && <p className="text-[#9ca3af] text-xs">{anime.format.replace("_", " ")}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function LanguageSwitcher() {
  const locale = useLocale();
  const currentLocale = isAppLocale(locale) ? locale : defaultLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function switchLocale(newLocale: AppLocale) {
    // next-intl useRouter.replace handles locale switching automatically
    router.replace(pathname, { locale: newLocale });
    setOpen(false);
  }

  const flags: Record<AppLocale, string> = { en: "🇺🇸", vi: "🇻🇳", ja: "🇯🇵" };
  const labels: Record<AppLocale, string> = { en: "EN", vi: "VI", ja: "JA" };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-9 px-3 rounded bg-[#111118] border border-[#1a1a24] hover:border-[#f49e0b] text-white text-sm font-bold transition-all"
      >
        <span>{flags[currentLocale]}</span>
        <span>{labels[currentLocale]}</span>
        <span className="text-[#9ca3af]" style={{ fontSize: "16px" }}>
          {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-24 bg-[#111118] border border-[#1a1a24] rounded shadow-xl z-50 overflow-hidden">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors ${
                l === currentLocale
                  ? "bg-[#f49e0b]/10 text-[#f49e0b]"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#1a1a24]"
              }`}
            >
              <span>{flags[l]}</span>
              <span>{labels[l]}</span>
              {l === currentLocale && <span style={{ fontSize: "16px" }}><CheckIcon /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const t = useTranslations("nav");
  const reduceMotion = useHydratedReducedMotion();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1a1a24] bg-[#0a0a0f]/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-8">
          <motion.div
            whileHover={reduceMotion ? undefined : { scale: 1.03 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Link href="/" className="flex items-center gap-3 text-white group">
              <div className="size-8 text-[#f49e0b] transition-colors group-hover:text-[#ffc46b]">
                <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" fill="currentColor"/>
                </svg>
              </div>
              <h2 className="text-white text-xl font-black tracking-tight group-hover:text-[#f49e0b] transition-colors">ANIMEZ</h2>
            </Link>
          </motion.div>

          <Suspense fallback={null}>
            <SearchBarInner />
          </Suspense>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/search" className="text-[#9ca3af] hover:text-[#f49e0b] text-sm font-semibold transition-colors">{t("browse")}</Link>
            <Link href="/search?season=WINTER&seasonYear=2025" className="text-[#9ca3af] hover:text-[#f49e0b] text-sm font-semibold transition-colors">{t("seasonal")}</Link>
            <Link href="/search?sort=TRENDING_DESC" className="text-[#9ca3af] hover:text-[#f49e0b] text-sm font-semibold transition-colors">{t("simulcast")}</Link>
          </nav>

          {/* Language Switcher */}
          <LanguageSwitcher />

          <AuthButton />
        </div>
      </div>
    </header>
  );
}
