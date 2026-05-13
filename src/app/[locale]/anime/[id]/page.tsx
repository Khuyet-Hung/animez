import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { anilistClient } from "@/lib/anilist";
import { ANIME_DETAIL_QUERY } from "@/lib/queries";
import { formatAnimeTitle } from "@/lib/anime-title";
import type { AnimeMedia } from "@/types/anime";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import AnimeCard from "@/components/anime/AnimeCard";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { FaStar } from "react-icons/fa";
import { MdLiveTv } from "react-icons/md";
import HorizontalScroll from "@/components/common/HorizontalScroll";
import TrailerModalButton from "@/components/anime/TrailerModalButton";
import AnimeListButton from "@/components/anime-list/AnimeListButton";
import CreatePostButton from "@/components/social/CreatePostButton";
import { createSeoMetadata, stripHtml, truncateSeoDescription } from "@/lib/seo";

interface DetailData {
  Media: AnimeMedia;
}

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, locale } = await params;

  try {
    const data = await anilistClient.request<DetailData>(ANIME_DETAIL_QUERY, {
      id: parseInt(id, 10),
    });
    const title = formatAnimeTitle(data.Media.title, locale);
    const description = truncateSeoDescription(stripHtml(data.Media.description));
    const image = data.Media.bannerImage || data.Media.coverImage?.extraLarge || data.Media.coverImage?.large;

    return createSeoMetadata({
      locale,
      path: `/anime/${id}`,
      title,
      description,
      image,
      type: "article",
    });
  } catch {
    return {
      title: "Anime Detail",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-[#1a1a24] last:border-0">
      <span className="text-[#9ca3af] text-sm">{label}</span>
      <span className="text-white text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function formatAiringDate(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}

export default async function AnimeDetailPage({ params }: PageProps) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("detail");
  const animeId = parseInt(id, 10);
  if (isNaN(animeId)) notFound();

  let anime: AnimeMedia;
  try {
    const data = await anilistClient.request<DetailData>(ANIME_DETAIL_QUERY, { id: animeId });
    anime = data.Media;
  } catch {
    notFound();
  }

  const title = formatAnimeTitle(anime.title, locale);
  const taxonomyT = await getTranslations("taxonomy");
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const synopsis = anime.description?.replace(/<[^>]*>/g, "") || "";
  const characters = anime.characters?.edges || [];
  const recommendations = anime.recommendations?.nodes
    .filter((n) => n.mediaRecommendation)
    .map((n) => n.mediaRecommendation!) || [];
  const relations = anime.relations?.edges.filter((edge) => edge.node.type === "ANIME") || [];
  const studio = anime.studios?.nodes?.[0]?.name || null;
  const trailer = anime.trailer?.id && anime.trailer.site?.toLowerCase() === "youtube" ? anime.trailer : null;
  const nextAiringEpisode = anime.nextAiringEpisode;

  const statusMap: Record<string, string> = {
    RELEASING: t("status_releasing"),
    FINISHED: t("status_finished"),
    NOT_YET_RELEASED: t("status_not_yet"),
    CANCELLED: t("status_cancelled"),
    HIATUS: t("status_hiatus"),
  };
  const formatStatus = (s?: string | null) => s ? (statusMap[s] || s) : "Unknown";

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20">
        {/* Hero Banner */}
        <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden">
          {(anime.bannerImage || anime.coverImage?.extraLarge) ? (
            <Image src={anime.bannerImage || anime.coverImage!.extraLarge!} alt={title} fill className="object-cover" priority unoptimized />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: anime.coverImage?.color || "#111118" }} />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:pl-32 min-[1600px]:pl-6">
          <div className="flex flex-col md:flex-row gap-8 -mt-20 relative">
            <div className="flex-none self-start">
              <div className="group/poster relative w-[140px] md:w-[200px] aspect-2/3 rounded shadow-2xl overflow-hidden border border-[#1a1a24]">
                {anime.coverImage?.large && (
                  <Image src={anime.coverImage.large} alt={title} fill className="object-cover" unoptimized />
                )}
                {trailer?.id && (
                  <TrailerModalButton
                    videoId={trailer.id}
                    title={title}
                    watchLabel={t("watchTrailer")}
                    closeLabel={t("closeTrailer")}
                  />
                )}
              </div>
            </div>

            <div className="flex-1 pt-4 md:pt-8">
              <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight">{title}</h1>
              {anime.title.native && <p className="text-[#9ca3af] mt-1">{anime.title.native}</p>}

              <div className="flex flex-wrap gap-4 mt-4 items-center">
                {score && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#f49e0b]" style={{ fontSize: "22px" }}><FaStar /></span>
                    <span className="text-[#f49e0b] text-2xl font-black">{score}</span>
                    <span className="text-[#9ca3af] text-sm">{t("per_10")}</span>
                  </div>
                )}
                {anime.episodes && (
                  <div className="flex items-center gap-1 text-[#9ca3af]">
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}><MdLiveTv /></span>
                    <span className="text-sm">{anime.episodes} eps</span>
                  </div>
                )}
                {anime.status && (
                  <span className={`text-xs font-bold px-2 py-1 rounded ${anime.status === "RELEASING" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-[#1a1a24] text-[#9ca3af]"}`}>
                    {formatStatus(anime.status)}
                  </span>
                )}
                {anime.format && (
                  <span className="text-xs font-bold px-2 py-1 bg-[#1a1a24] text-[#9ca3af] rounded">{anime.format.replace("_", " ")}</span>
                )}
              </div>

              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {anime.genres.map((g) => (
                    <Link key={g} href={`/search?genre=${encodeURIComponent(g)}`} className="text-xs font-semibold px-3 py-1 bg-[#111118] border border-[#1a1a24] text-[#9ca3af] hover:text-white hover:border-[#f49e0b] rounded-full transition-all">
                      {taxonomyT(`genres.${g}`)}
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-3 flex w-full max-w-3xl flex-col items-start gap-3">
                <AnimeListButton anime={anime} variant="detail" />
                {/* <CreatePostButton initialAnime={anime} /> */}
              </div>
            </div>
          </div>
          
          <CreatePostButton initialAnime={anime} />

          <div className="flex flex-col lg:flex-row gap-8 mt-12">
            <div className="flex-1 min-w-0 flex flex-col gap-12">
              {synopsis && (
                <section>
                  <h2 className="text-white text-xl font-bold mb-4 border-l-4 border-[#f49e0b] pl-3">{t("synopsis")}</h2>
                  <p className="text-[#9ca3af] leading-relaxed">{synopsis}</p>
                </section>
              )}

              {characters.length > 0 && (
                <section>
                  <h2 className="text-white text-xl font-bold mb-4 border-l-4 border-[#f49e0b] pl-3">{t("characters")}</h2>
                  <HorizontalScroll className="gap-4 pb-4" itemWidth={120}>
                    {characters.map((edge) => {
                      const va = edge.voiceActors?.[0];
                      return (
                        <div key={edge.node.id} className="flex-none w-[120px]">
                          <div className="relative w-full aspect-2/3 rounded overflow-hidden mb-2">
                            <Image src={edge.node.image.medium} alt={edge.node.name.full} fill className="object-cover" unoptimized />
                          </div>
                          <p className="text-white text-xs font-semibold truncate">{edge.node.name.full}</p>
                          {va && <p className="text-[#9ca3af] text-xs truncate">{va.name.full}</p>}
                        </div>
                      );
                    })}
                  </HorizontalScroll>
                </section>
              )}

              {relations.length > 0 && (
                <section>
                  <h2 className="text-white text-xl font-bold mb-4 border-l-4 border-[#f49e0b] pl-3">{t("relations")}</h2>
                  <HorizontalScroll className="gap-4 pb-4" itemWidth={140}>
                    {relations.map((edge) => (
                      <div key={`${edge.relationType}-${edge.node.id}`} className="flex-none w-[140px]">
                        <AnimeCard anime={{ ...edge.node, coverImage: edge.node.coverImage as { large: string; extraLarge?: string } }} />
                      </div>
                    ))}
                  </HorizontalScroll>
                </section>
              )}

              {recommendations.length > 0 && (
                <section>
                  <h2 className="text-white text-xl font-bold mb-4 border-l-4 border-[#f49e0b] pl-3">{t("recommendations")}</h2>
                  <HorizontalScroll className="gap-4 pb-4" itemWidth={140}>
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="flex-none w-[140px]">
                        <AnimeCard anime={{ ...rec, coverImage: rec.coverImage as { large: string; extraLarge?: string } }} />
                      </div>
                    ))}
                  </HorizontalScroll>
                </section>
              )}
            </div>

            <aside className="hidden flex-none lg:block lg:w-[260px]">
              <div className="bg-[#111118] border border-[#1a1a24] rounded p-5">
                <h3 className="text-white font-bold mb-4">{t("information")}</h3>
                <InfoRow label={t("format")} value={anime.format?.replace("_", " ")} />
                <InfoRow label={t("episodes")} value={anime.episodes} />
                <InfoRow label={t("duration")} value={anime.duration ? t("duration_unit", { n: anime.duration }) : null} />
                <InfoRow label={t("status")} value={formatStatus(anime.status)} />
                <InfoRow label={t("season")} value={anime.season && anime.seasonYear ? `${taxonomyT(`seasons.${anime.season}`)} ${anime.seasonYear}` : null} />
                <InfoRow label={t("studio")} value={studio} />
                <InfoRow label={t("source")} value={anime.source?.replace("_", " ")} />

                {nextAiringEpisode && (
                  <div className="mt-4 pt-4 border-t border-[#1a1a24]">
                    <div className="mb-2 flex items-center justify-center gap-2 text-[#f49e0b]">
                      <CalendarClock className="h-5 w-5" />
                      <p className="text-xs font-bold uppercase tracking-normal">{t("airing")}</p>
                    </div>
                    <p className="text-center text-white text-lg font-black">{t("nextEpisode", { episode: nextAiringEpisode.episode })}</p>
                    <p className="mt-1 text-center text-[#9ca3af] text-xs">
                      {t("airsOn", { date: formatAiringDate(nextAiringEpisode.airingAt, locale) })}
                    </p>
                  </div>
                )}

                {score && (
                  <div className="mt-4 pt-4 border-t border-[#1a1a24] text-center">
                    <p className="text-[#9ca3af] text-xs mb-1">{t("score")}</p>
                    <span className="text-[#f49e0b] text-4xl font-black">{score}</span>
                    <span className="text-[#9ca3af] text-sm"> {t("per_10")}</span>
                  </div>
                )}
                {anime.popularity && (
                  <div className="mt-4 pt-4 border-t border-[#1a1a24] text-center">
                    <p className="text-[#9ca3af] text-xs mb-1">{t("popularity")}</p>
                    <span className="text-white text-xl font-bold">#{anime.popularity.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
