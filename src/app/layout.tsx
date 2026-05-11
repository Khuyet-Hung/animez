import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import {
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  SEO_THEME_COLOR,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import "./globals.css";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: DEFAULT_SEO_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_SEO_DESCRIPTION,
  keywords: [
    "anime",
    "anime tracker",
    "anime list",
    "anime community",
    "AniList",
    "Animez",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: DEFAULT_SEO_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: SEO_THEME_COLOR,
};

// Root layout quản lý <html> và <body>.
// [locale]/layout.tsx bọc nội dung bằng NextIntlClientProvider.
export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}) {
  const { locale } = await params;
  const lang = locale || "en";

  return (
    <html lang={lang} className="dark">
      <body className="bg-[#0a0a0f] text-white font-sans overflow-x-hidden min-h-screen flex flex-col">
        {children}
        {ADSENSE_CLIENT ? (
          <Script
            id="google-adsense"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        ) : null}
        <Analytics />
      </body>
    </html>
  );
}
