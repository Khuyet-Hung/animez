import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import SearchBar from "@/components/search/SearchBar";
import SearchResultsClient from "@/components/search/SearchResultsClient";
import { Link } from "@/i18n/navigation";
import {
  animeGenres,
} from "@/lib/anime-taxonomy";
import { getGenreFromSlug, getGenreHref } from "@/lib/anime-routes";
import { normalizePage } from "@/lib/search-params";
import { createSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

interface GenreLandingPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: GenreLandingPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const { page } = await searchParams;
  const genre = getGenreFromSlug(slug);

  if (!genre) {
    return {
      title: "Genre",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const taxonomyT = await getTranslations({ locale, namespace: "taxonomy" });
  const genreLabel = taxonomyT(`genres.${genre}`);

  return createSeoMetadata({
    locale,
    path: getGenreHref(genre),
    title: `${genreLabel} Anime`,
    description: `Browse ${genreLabel.toLowerCase()} anime picks, discover standout series, and jump into more titles on Animez.`,
    noIndex: normalizePage(page) > 1,
  });
}

export default async function GenreLandingPage({
  params,
  searchParams,
}: GenreLandingPageProps) {
  const { locale, slug } = await params;
  const { page } = await searchParams;
  const genre = getGenreFromSlug(slug);

  if (!genre) notFound();

  setRequestLocale(locale);
  const t = await getTranslations("search");
  const taxonomyT = await getTranslations("taxonomy");
  const genreLabel = taxonomyT(`genres.${genre}`);
  const relatedGenres = animeGenres.filter((item) => item !== genre).slice(0, 8);

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-8 pb-20 md:px-6 lg:pl-32 min-[1600px]:pl-6">
        <div className="rounded-ui-sm border border-border bg-surface p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Genre Landing</p>
          <h1 className="mt-3 text-3xl font-black text-fg md:text-4xl">{genreLabel} Anime</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-fg-muted md:text-base">
            Explore {genreLabel.toLowerCase()} anime on Animez. This landing page keeps a stable,
            indexable URL for the genre while the results below still use the existing client-side
            search flow.
          </p>

          <div className="mt-6 max-w-2xl">
            <SearchBar />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {relatedGenres.map((item) => (
              <Link
                key={item}
                href={getGenreHref(item)}
                className="rounded-ui-pill border border-border bg-bg px-3 py-1.5 text-xs font-bold text-fg-muted transition-colors hover:border-brand hover:text-fg"
              >
                {taxonomyT(`genres.${item}`)}
              </Link>
            ))}
          </div>
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-black text-fg">
            {t("title_query", { query: genreLabel })}
          </h2>
          <SearchResultsClient
            genre={genre}
            page={page}
            pathname={getGenreHref(genre)}
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
