import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FilterPanel from "@/components/search/FilterPanel";
import SearchBar from "@/components/search/SearchBar";
import SearchResultsClient from "@/components/search/SearchResultsClient";
import { normalizeSearchQuery } from "@/lib/search-params";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo";

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    genre?: string;
    format?: string;
    status?: string;
    season?: string;
    year?: string;
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const { q: rawQuery } = await searchParams;
  const q = normalizeSearchQuery(rawQuery);
  const t = await getTranslations({ locale, namespace: "search" });
  const title = q ? t("title_query", { query: q }) : t("title");
  const description = q
    ? `${title} on Animez.`
    : "Browse anime by title, genre, format, status, season, and release year on Animez.";

  return createSeoMetadata({
    locale,
    path: "/search",
    title,
    description,
  });
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("search");
  const resolvedParams = await searchParams;
  const { q, genre, format, status, season, year, sort, page } = resolvedParams;
  const searchQuery = normalizeSearchQuery(q);

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:pl-32 min-[1600px]:pl-6 py-8 pb-20">
        <h1 className="text-2xl font-black text-white mb-6">
          {searchQuery ? t("title_query", { query: searchQuery }) : t("title")}
        </h1>

        <Suspense fallback={null}>
          <div className="mb-8">
            <SearchBar />
          </div>
        </Suspense>

        <div className="flex flex-col lg:flex-row gap-8">
          <Suspense fallback={null}>
            <FilterPanel />
          </Suspense>

          <div className="flex-1 min-w-0">
            <SearchResultsClient
              q={searchQuery}
              genre={genre}
              format={format}
              status={status}
              season={season}
              year={year}
              sort={sort}
              page={page}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
