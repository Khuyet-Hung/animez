import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { locales } from "@/i18n/locales";

const privatePaths = [
  "/api/",
  "/auth/",
  "/profile",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          ...privatePaths,
          ...locales.flatMap((locale) =>
            privatePaths.map((path) => `/${locale}${path}`)
          ),
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
