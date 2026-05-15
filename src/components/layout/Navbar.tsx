"use client";

import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useEffect, Suspense } from "react";
import { defaultLocale, type AppLocale, isAppLocale, locales } from "@/i18n/locales";
import { formatAnimeTitle } from "@/lib/anime-title";
import { getAnimeHref } from "@/lib/anime-routes";
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
import AppLogo from "@/components/common/AppLogo";
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
  const abortRef = useRef<AbortController | null>(null);
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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const search = value.trim();
    if (search.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const response = await fetch(`/api/anime/suggestions?q=${encodeURIComponent(search)}`, {
          signal: abortController.signal,
        });
        if (!response.ok) throw new Error("Unable to load suggestions.");

        const data = (await response.json()) as { results?: AnimeMedia[] };
        const nextSuggestions = data.results ?? [];
        setSuggestions(nextSuggestions);
        setShowSuggestions(nextSuggestions.length > 0);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;

        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        if (abortRef.current === abortController) abortRef.current = null;
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
          className="flex w-full flex-1 items-stretch rounded-ui-sm border border-border bg-surface transition-colors focus-within:border-brand"
          animate={reduceMotion ? undefined : {
            scale: isFocused || showSuggestions ? 1.01 : 1,
            boxShadow: isFocused || showSuggestions ? "0 0 0 3px rgba(244, 158, 11, 0.12)" : "0 0 0 0 rgba(244, 158, 11, 0)",
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="flex items-center justify-center pl-3 text-fg-muted">
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
            className="w-full border-none bg-transparent px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none"
            placeholder={t("search_placeholder")}
          />
        </motion.div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-ui-sm border border-border bg-surface shadow-xl">
          {suggestions.map((anime) => (
            <Link key={anime.id} href={getAnimeHref(anime, locale)} onClick={() => setShowSuggestions(false)} className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-border">
              {anime.coverImage?.medium && (
                <Image src={anime.coverImage.medium} alt={formatAnimeTitle(anime.title, locale)} width={32} height={44} className="flex-none rounded-ui-sm object-cover" unoptimized />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{formatAnimeTitle(anime.title, locale)}</p>
                {anime.format && <p className="text-xs text-fg-muted">{anime.format.replace("_", " ")}</p>}
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
        className="flex size-9 items-center justify-center rounded-ui-sm text-fg transition-all hover:bg-surface hover:text-brand"
      >
        <SettingsIcon className="size-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-ui-sm border border-border bg-surface text-fg shadow-xl">
          {activePanel === "main" ? (
            <>
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-bold text-fg">{labels.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel("language")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-fg-soft transition-colors hover:bg-border hover:text-fg"
              >
                <LanguagesIcon className="size-5 flex-none text-brand" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {labels.displayLanguage}: {currentLanguage.label}
                </span>
                <ChevronRightIcon className="size-4 flex-none text-fg-muted" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActivePanel("main")}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-fg transition-colors hover:bg-border"
              >
                <ArrowLeftIcon className="size-4 flex-none text-fg-muted" />
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
                          ? "bg-brand/10 text-brand"
                          : "text-fg-soft hover:bg-border hover:text-fg"
                      }`}
                    >
                      <span className="flex size-5 flex-none items-center justify-center">
                        {selected && <CheckIcon className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="relative h-5 w-7 flex-none overflow-hidden rounded-ui-xs border border-border-strong bg-bg">
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
      <header className="sticky top-0 z-50 w-full border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-4 md:px-4 w-full">
        <div className="flex items-center gap-8">
          <motion.div
            whileHover={reduceMotion ? undefined : { scale: 1.03 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Link href="/" className="group flex items-center gap-3 text-fg">
              <AppLogo
                className="h-10 w-[160px] transition-opacity group-hover:opacity-90"
                priority
                sizes="60px"
              />
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
                className={`group flex h-16 flex-col items-center justify-center gap-1 rounded-ui-sm text-xs font-bold transition-colors ${
                  active
                    ? "border border-border bg-surface/95 text-brand shadow-lg shadow-black/25 backdrop-blur-sm"
                    : "bg-bg/45 text-fg-soft backdrop-blur-sm hover:bg-surface/90 hover:text-brand"
                }`}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate px-1">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg/95 backdrop-blur-sm lg:hidden" aria-label={t("navigation")}>
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = isNavTabActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-12 flex-col items-center justify-center gap-1 rounded-ui-sm text-[11px] font-bold transition-colors ${
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-fg-muted hover:bg-surface hover:text-brand"
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
