import type { Metadata } from "next";
import { defaultLocale, locales, type AppLocale } from "@/i18n/locales";

export const SITE_URL = "https://animez.site";
export const SITE_NAME = "Animez";
export const DEFAULT_SEO_TITLE = "Animez - Discover & Track Anime";
export const DEFAULT_SEO_DESCRIPTION =
  "Discover, search, track, and share anime with the Animez community.";
export const SEO_THEME_COLOR = "#0a0a0f";

const localeNames: Record<AppLocale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  ja: "日本語",
};

const localeDescriptions: Record<AppLocale, string> = {
  en: DEFAULT_SEO_DESCRIPTION,
  vi: "Khám phá, tìm kiếm, theo dõi và chia sẻ anime cùng cộng đồng Animez.",
  ja: "Animezでアニメを探して、記録して、コミュニティと共有しましょう。",
};

export function getSeoLocale(locale: string | undefined): AppLocale {
  return locales.includes(locale as AppLocale) ? (locale as AppLocale) : defaultLocale;
}

export function getLocaleDescription(locale: string | undefined) {
  return localeDescriptions[getSeoLocale(locale)];
}

export function getLocaleName(locale: AppLocale) {
  return localeNames[locale];
}

export function getPathWithLocale(locale: string | undefined, path = "") {
  const safeLocale = getSeoLocale(locale);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (cleanPath === "/") {
    return `/${safeLocale}`;
  }

  return `/${safeLocale}${cleanPath}`;
}

export function getAbsoluteUrl(path = "") {
  return new URL(path || "/", SITE_URL).toString();
}

export function getLocalizedAlternates(path = ""): NonNullable<Metadata["alternates"]> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedPath = cleanPath === "/" ? "" : cleanPath;
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, getAbsoluteUrl(`/${locale}${normalizedPath}`)])
  ) as Record<AppLocale, string>;

  return {
    languages: {
      ...languages,
      "x-default": getAbsoluteUrl(`/${defaultLocale}${normalizedPath}`),
    },
  };
}

export function createSeoMetadata({
  locale,
  path = "",
  title,
  description,
  image,
  type = "website",
  noIndex = false,
  absoluteTitle = false,
}: {
  locale?: string;
  path?: string;
  title?: string;
  description?: string;
  image?: string | null;
  type?: "website" | "article";
  noIndex?: boolean;
  absoluteTitle?: boolean;
}): Metadata {
  const safeLocale = getSeoLocale(locale);
  const localizedPath = getPathWithLocale(safeLocale, path);
  const metadataTitle = title || DEFAULT_SEO_TITLE;
  const metadataDescription = description || getLocaleDescription(safeLocale);
  const imageUrl = image || "/opengraph-image";

  return {
    title: absoluteTitle ? { absolute: metadataTitle } : metadataTitle,
    description: metadataDescription,
    alternates: {
      canonical: localizedPath,
      ...getLocalizedAlternates(path),
    },
    openGraph: {
      title: metadataTitle,
      description: metadataDescription,
      url: localizedPath,
      siteName: SITE_NAME,
      locale: safeLocale,
      alternateLocale: locales.filter((localeOption) => localeOption !== safeLocale),
      type,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: metadataTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: metadataTitle,
      description: metadataDescription,
      images: [imageUrl],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
  };
}

export function stripHtml(value: string | null | undefined) {
  return value?.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || "";
}

export function truncateSeoDescription(value: string, maxLength = 155) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}
