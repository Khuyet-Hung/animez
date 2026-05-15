import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import SearchBar from "@/components/search/SearchBar";
import SearchResultsClient from "@/components/search/SearchResultsClient";
import { Link } from "@/i18n/navigation";
import { animeSeasons } from "@/lib/anime-taxonomy";
import { getSeasonHref, getSeasonLandingYears, parseSeasonSlug } from "@/lib/anime-routes";
import { normalizePage } from "@/lib/search-params";
import { createSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

interface SeasonLandingPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: SeasonLandingPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const { page } = await searchParams;
  const seasonData = parseSeasonSlug(slug);

  if (!seasonData) {
    return {
      title: "Season",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const taxonomyT = await getTranslations({ locale, namespace: "taxonomy" });
  const seasonLabel = taxonomyT(`seasons.${seasonData.season}`);

  return createSeoMetadata({
    locale,
    path: getSeasonHref(seasonData.season, seasonData.year),
    title: `${seasonLabel} ${seasonData.year} Anime`,
    description: `Browse anime from ${seasonLabel.toLowerCase()} ${seasonData.year} on Animez and discover the season's standout releases.`,
    noIndex: normalizePage(page) > 1,
  });
}

export default async function SeasonLandingPage({
  params,
  searchParams,
}: SeasonLandingPageProps) {
  const { locale, slug } = await params;
  const { page } = await searchParams;
  const seasonData = parseSeasonSlug(slug);

  if (!seasonData) notFound();

  setRequestLocale(locale);
  const taxonomyT = await getTranslations("taxonomy");
  const seasonLabel = taxonomyT(`seasons.${seasonData.season}`);
  const availableYears = getSeasonLandingYears();

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-8 pb-20 md:px-6 lg:pl-32 min-[1600px]:pl-6">
        <div className="rounded-ui-sm border border-border bg-surface p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Season Landing</p>
          <h1 className="mt-3 text-3xl font-black text-fg md:text-4xl">
            {seasonLabel} {seasonData.year} Anime
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-fg-muted md:text-base">
            Track what aired in {seasonLabel.toLowerCase()} {seasonData.year} with a clean,
            indexable season URL while keeping the current client-side search experience intact.
          </p>

          <div className="mt-6 max-w-2xl">
            <SearchBar />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {animeSeasons.map((season) => (
              <Link
                key={season}
                href={getSeasonHref(season, seasonData.year)}
                className={`rounded-ui-pill border px-3 py-1.5 text-xs font-bold transition-colors ${
                  season === seasonData.season
                    ? "border-brand bg-brand text-brand-fg"
                    : "border-border bg-bg text-fg-muted hover:border-brand hover:text-fg"
                }`}
              >
                {taxonomyT(`seasons.${season}`)}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {availableYears.map((year) => (
              <Link
                key={year}
                href={getSeasonHref(seasonData.season, year)}
                className={`rounded-ui-pill border px-3 py-1.5 text-xs font-bold transition-colors ${
                  year === seasonData.year
                    ? "border-brand bg-brand text-brand-fg"
                    : "border-border bg-bg text-fg-muted hover:border-brand hover:text-fg"
                }`}
              >
                {year}
              </Link>
            ))}
          </div>
        </div>

        <section className="mt-8">
          <SearchResultsClient
            season={seasonData.season}
            year={String(seasonData.year)}
            page={page}
            pathname={getSeasonHref(seasonData.season, seasonData.year)}
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
