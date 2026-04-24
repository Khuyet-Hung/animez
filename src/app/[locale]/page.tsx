import { anilistClient } from "@/lib/anilist";
import { TRENDING_QUERY } from "@/lib/queries";
import type { AnimeMedia } from "@/types/anime";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AnimeCard from "@/components/anime/AnimeCard";
import HeroSection from "@/components/anime/HeroSection";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import HorizontalScroll from "@/components/common/HorizontalScroll";

interface TrendingData {
  trending: { media: AnimeMedia[] };
  topAllTime: { media: AnimeMedia[] };
}

export const revalidate = 3600;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  let trendingAnime: AnimeMedia[] = [];
  let topAllTime: AnimeMedia[] = [];
  let heroAnime: AnimeMedia | null = null;

  try {
    const data = await anilistClient.request<TrendingData>(TRENDING_QUERY, {
      page: 1,
      perPage: 12,
    });
    trendingAnime = data.trending.media;
    topAllTime = data.topAllTime.media;
    heroAnime = trendingAnime[0] || null;
  } catch (error) {
    console.error("Failed to fetch trending anime:", error);
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto px-4 md:px-6 pb-20">
        {heroAnime && <HeroSection anime={heroAnime} />}

        {trendingAnime.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="text-white text-2xl font-bold tracking-tight border-l-4 border-[#f49e0b] pl-3">
                {t("trending")}
              </h2>
              <Link href="/search?sort=TRENDING_DESC" className="text-sm text-[#f49e0b] hover:text-white font-bold transition-colors">
                {t("viewAll")}
              </Link>
            </div>
            <HorizontalScroll className="gap-4 pb-4 snap-x" itemWidth={220}>
              {trendingAnime.slice(1).map((anime) => (
                <div key={anime.id} className="flex-none w-[180px] md:w-[220px] snap-start">
                  <AnimeCard anime={anime} />
                </div>
              ))}
            </HorizontalScroll>
          </section>
        )}

        {topAllTime.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="text-white text-2xl font-bold tracking-tight border-l-4 border-[#f49e0b] pl-3">
                {t("topAllTime")}
              </h2>
              <Link href="/search?sort=SCORE_DESC" className="text-sm text-[#f49e0b] hover:text-white font-bold transition-colors">
                {t("viewAll")}
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {topAllTime.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
