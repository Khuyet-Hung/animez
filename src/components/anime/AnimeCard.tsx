"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { AnimeMedia } from "@/types/anime";
import { FaStar } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { formatAnimeTitle } from "@/lib/anime-title";
import { createCardRevealVariants, viewportOnce } from "@/lib/motion";
import useHydratedReducedMotion from "@/hooks/useHydratedReducedMotion";

interface AnimeCardProps {
  anime: AnimeMedia;
  variant?: "compact" | "full";
  reveal?: boolean;
  revealDelay?: number;
}

function formatScore(score?: number | null) {
  if (!score) return null;
  return (score / 10).toFixed(1);
}

export default function AnimeCard({
  anime,
  variant = "compact",
  reveal = false,
  revealDelay = 0,
}: AnimeCardProps) {
  const t = useTranslations("card");
  const taxonomyT = useTranslations("taxonomy");
  const locale = useLocale();
  const reduceMotion = useHydratedReducedMotion();
  const title = formatAnimeTitle(anime.title, locale);
  const score = formatScore(anime.averageScore);
  const genres = anime.genres?.slice(0, 2).map((genre) => taxonomyT(`genres.${genre}`)).join(" \u2022 ") || "";
  const revealVariants = useMemo(
    () => createCardRevealVariants(revealDelay, reduceMotion),
    [revealDelay, reduceMotion]
  );

  return (
    <motion.div
      className="group relative block h-full cursor-pointer"
      initial={reveal ? "hidden" : false}
      whileInView={reveal ? "visible" : undefined}
      viewport={viewportOnce}
      variants={revealVariants}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <Link href={`/anime/${anime.id}`} className="block h-full">
        <div
          className={`relative w-full overflow-hidden mb-3 border border-transparent group-hover:border-[#f49e0b]/80 transition-all duration-300 shadow-lg group-hover:shadow-[0_18px_44px_rgba(244,158,11,0.18)] ${
            variant === "compact" ? "rounded" : "rounded"
          }`}
          style={{ aspectRatio: "2/3" }}
        >
          {score && (
            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
              <span className="material-symbols-outlined text-[#f49e0b]" style={{ fontSize: "14px" }}><FaStar /></span>
              <span className="text-white text-xs font-bold">{score}</span>
            </div>
          )}

          <div className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-105 relative">
            {anime.coverImage?.large ? (
              <Image
                src={anime.coverImage.large}
                alt={title}
                fill
                sizes="(max-width: 768px) 180px, 220px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-[#1a1a24] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#9ca3af]" style={{ fontSize: "48px" }}>movie</span>
              </div>
            )}
          </div>

          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
            <div className="w-full py-2 bg-[#f49e0b] text-[#0a0a0f] font-bold text-xs rounded uppercase tracking-wide text-center translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              {t("viewDetails")}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-white font-bold truncate group-hover:text-[#f49e0b] transition-colors text-sm">
            {title}
          </h3>
          {genres && (
            <p className="text-[#9ca3af] text-xs mt-1">{genres}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
