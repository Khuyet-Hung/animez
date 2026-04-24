import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Animez — Discover & Track Anime",
  description: "Your ultimate destination for anime browsing, tracking, and reviews.",
  openGraph: {
    title: "Animez — Discover & Track Anime",
    description: "Discover, search, and track your favorite anime.",
    type: "website",
  },
};

// Root layout: owns <html> and <body>
// [locale]/layout.tsx wraps content with NextIntlClientProvider
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
      </body>
    </html>
  );
}
