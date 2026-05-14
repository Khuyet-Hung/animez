import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Exo_2 } from "next/font/google";
import Script from "next/script";
import {
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  SEO_THEME_COLOR,
  SITE_NAME,
  SITE_URL,
  toJsonLd,
} from "@/lib/seo";
import { APP_LOGOS } from "@/lib/branding";
import "./globals.css";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_SEO_DESCRIPTION,
  inLanguage: ["en", "vi", "ja"],
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/en/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const exo2 = Exo_2({
  subsets: ["latin", "latin-ext"],
  variable: "--font-exo-2",
  display: "swap",
});

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
  icons: {
    icon: [
      {
        url: APP_LOGOS.mark.src,
        type: "image/png",
        sizes: `${APP_LOGOS.mark.width}x${APP_LOGOS.mark.height}`,
      },
    ],
    apple: [
      {
        url: APP_LOGOS.mark.src,
        type: "image/png",
        sizes: `${APP_LOGOS.mark.width}x${APP_LOGOS.mark.height}`,
      },
    ],
    shortcut: [APP_LOGOS.mark.src],
  },
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
    <html lang={lang} className={`dark ${exo2.variable}`}>
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-bg font-sans text-fg">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(websiteJsonLd) }}
        />
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
