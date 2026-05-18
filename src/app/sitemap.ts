import type { MetadataRoute } from "next";
import { locales } from "@/i18n/locales";
import { anilistClient } from "@/lib/anilist";
import { TRENDING_QUERY } from "@/lib/queries";
import { buildAnimeDetailHref } from "@/lib/anime-url";
import { getAbsoluteUrl } from "@/lib/seo";
import type { AnimeMedia } from "@/types/anime";

const publicRoutes = ["", "/search", "/feed"] as const;

interface SitemapAnimeData {
  trending: { media: AnimeMedia[] };
  topAllTime: { media: AnimeMedia[] };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries = locales.flatMap((locale) =>
    publicRoutes.map((route) => ({
      url: getAbsoluteUrl(`/${locale}${route}`),
      lastModified: now,
      changeFrequency: route === "" ? ("daily" as const) : ("hourly" as const),
      priority: route === "" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          locales.map((alternateLocale) => [
            alternateLocale,
            getAbsoluteUrl(`/${alternateLocale}${route}`),
          ])
        ),
      },
    }))
  );

  try {
    const data = await anilistClient.request<SitemapAnimeData>(TRENDING_QUERY, {
      page: 1,
      perPage: 12,
    });
    const animeById = new Map<number, AnimeMedia>();
    [...data.trending.media, ...data.topAllTime.media].forEach((anime) => {
      animeById.set(anime.id, anime);
    });
    const animeItems = Array.from(animeById.values());
    const animeEntries = locales.flatMap((locale) =>
      animeItems.map((anime) => ({
        url: getAbsoluteUrl(`/${locale}${buildAnimeDetailHref(anime.id, anime.title, locale)}`),
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((alternateLocale) => [
              alternateLocale,
              getAbsoluteUrl(`/${alternateLocale}${buildAnimeDetailHref(anime.id, anime.title, alternateLocale)}`),
            ])
          ),
        },
      }))
    );

    return [...staticEntries, ...animeEntries];
  } catch {
    return staticEntries;
  }
}
