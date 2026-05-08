import type { MetadataRoute } from "next";
import { locales } from "@/i18n/locales";
import { getAbsoluteUrl } from "@/lib/seo";

const publicRoutes = ["", "/search", "/feed"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return locales.flatMap((locale) =>
    publicRoutes.map((route) => ({
      url: getAbsoluteUrl(`/${locale}${route}`),
      lastModified: now,
      changeFrequency: route === "" ? "daily" : "hourly",
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
}
