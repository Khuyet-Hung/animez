"use client";

import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useEffect, Suspense } from "react";
import { anilistClient } from "@/lib/anilist";
import { SUGGESTIONS_QUERY } from "@/lib/queries";
import { defaultLocale, type AppLocale, isAppLocale, locales } from "@/i18n/locales";
import { formatAnimeTitle } from "@/lib/anime-title";
import type { AnimeMedia } from "@/types/anime";
import Image, { type StaticImageData } from "next/image";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  HomeIcon,
  LanguagesIcon,
  RadioIcon,
  SearchIcon,
  SettingsIcon,
  TelescopeIcon,
} from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";
import { motion } from "framer-motion";
import useHydratedReducedMotion from "@/hooks/useHydratedReducedMotion";
import gbFlag from "@/assets/svg/gb.svg";
import jpFlag from "@/assets/svg/jp.svg";
import vnFlag from "@/assets/svg/vn.svg";

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

const LANGUAGE_OPTIONS: Record<
  AppLocale,
  {
    code: string;
    flag: StaticImageData;
    label: string;
  }
> = {
  en: { code: "EN", flag: gbFlag, label: "English" },
  vi: { code: "VI", flag: vnFlag, label: "Tiếng Việt" },
  ja: { code: "JA", flag: jpFlag, label: "日本語" },
};

const QUICK_SETTINGS_LABELS: Record<
  AppLocale,
  {
    back: string;
    button: string;
    displayLanguage: string;
    title: string;
  }
> = {
  en: {
    back: "Back",
    button: "Quick settings",
    displayLanguage: "Display language",
    title: "Quick settings",
  },
  vi: {
    back: "Quay lại",
    button: "Cài đặt nhanh",
    displayLanguage: "Ngôn ngữ hiển thị",
    title: "Cài đặt nhanh",
  },
  ja: {
    back: "戻る",
    button: "クイック設定",
    displayLanguage: "表示言語",
    title: "クイック設定",
  },
};

function QuickSettingsMenu() {
  const locale = useLocale();
  const currentLocale = isAppLocale(locale) ? locale : defaultLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"main" | "language">("main");
  const ref = useRef<HTMLDivElement>(null);
  const labels = QUICK_SETTINGS_LABELS[currentLocale];
  const currentLanguage = LANGUAGE_OPTIONS[currentLocale];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActivePanel("main");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleOpen() {
    setOpen((currentOpen) => {
      if (currentOpen) setActivePanel("main");
      return !currentOpen;
    });
  }

  function switchLocale(newLocale: AppLocale) {
    // next-intl useRouter.replace handles locale switching automatically
    router.replace(pathname, { locale: newLocale });
    setOpen(false);
    setActivePanel("main");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={labels.button}
        aria-expanded={open}
        onClick={toggleOpen}
        className="flex size-9 items-center justify-center rounded text-white transition-all"
      >
        <SettingsIcon className="size-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#111118] border border-[#1a1a24] rounded-lg shadow-xl z-50 overflow-hidden text-white">
          {activePanel === "main" ? (
            <>
              <div className="px-4 py-3 border-b border-[#1a1a24]">
                <p className="text-white text-sm font-bold">{labels.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel("language")}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#d1d5db] hover:text-white hover:bg-[#1a1a24] transition-colors"
              >
                <LanguagesIcon className="size-5 flex-none text-[#f49e0b]" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {labels.displayLanguage}: {currentLanguage.label}
                </span>
                <ChevronRightIcon className="size-4 flex-none text-[#9ca3af]" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActivePanel("main")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-white border-b border-[#1a1a24] hover:bg-[#1a1a24] transition-colors"
              >
                <ArrowLeftIcon className="size-4 flex-none text-[#9ca3af]" />
                <span className="text-sm font-bold">{labels.displayLanguage}</span>
                <span className="sr-only">{labels.back}</span>
              </button>

              <div className="max-h-64 overflow-y-auto py-1">
                {locales.map((l) => {
                  const option = LANGUAGE_OPTIONS[l];
                  const selected = l === currentLocale;

                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => switchLocale(l)}
                      aria-current={selected ? "true" : undefined}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        selected
                          ? "bg-[#f49e0b]/10 text-[#f49e0b]"
                          : "text-[#d1d5db] hover:text-white hover:bg-[#1a1a24]"
                      }`}
                    >
                      <span className="flex size-5 flex-none items-center justify-center">
                        {selected && <CheckIcon className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="relative h-5 w-7 flex-none overflow-hidden rounded-sm border border-[#1f2937] bg-[#0a0a0f]">
                        <Image
                          src={option.flag}
                          alt={option.code}
                          fill
                          className="object-cover"
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function isNavTabActive(pathname: string, href: "/" | "/feed" | "/search") {
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  if (href === "/") {
    return normalizedPathname === "/";
  }

  return normalizedPathname === href || normalizedPathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const reduceMotion = useHydratedReducedMotion();
  const tabs = [
    { href: "/" as const, label: t("home"), icon: HomeIcon },
    { href: "/feed" as const, label: t("feed"), icon: RadioIcon },
    { href: "/search" as const, label: t("browse"), icon: TelescopeIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#1a1a24] bg-[#0a0a0f]/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-4 md:px-4 w-full">
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

        <div className="flex items-center gap-2">
          <QuickSettingsMenu />
          <AuthButton />
        </div>
        </div>
      </header>

      <nav
        className="fixed left-3 top-[88px] z-40 hidden lg:block"
        aria-label={t("navigation")}
      >
        <div className="flex w-20 flex-col items-stretch gap-2">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = isNavTabActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                title={label}
                className={`group flex h-16 flex-col items-center justify-center gap-1 rounded text-xs font-bold transition-colors ${
                  active
                    ? "border border-[#1a1a24] bg-[#111118]/95 text-[#f49e0b] shadow-lg shadow-black/25 backdrop-blur-sm"
                    : "bg-[#0a0a0f]/45 text-[#cbd5e1] backdrop-blur-sm hover:bg-[#111118]/90 hover:text-[#f49e0b]"
                }`}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate px-1">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#1a1a24] bg-[#0a0a0f]/95 backdrop-blur-sm lg:hidden" aria-label={t("navigation")}>
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = isNavTabActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-12 flex-col items-center justify-center gap-1 rounded text-[11px] font-bold transition-colors ${
                  active
                    ? "bg-[#f49e0b]/10 text-[#f49e0b]"
                    : "text-[#9ca3af] hover:bg-[#111118] hover:text-[#f49e0b]"
                }`}
              >
                <Icon className="size-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
