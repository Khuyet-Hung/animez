"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { AnimeMedia } from "@/types/anime";
import { FaStar } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { formatAnimeTitle } from "@/lib/anime-title";
import { buildAnimeDetailHref } from "@/lib/anime-url";
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
  const coverSrc = anime.coverImage?.large;
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
      <Link href={buildAnimeDetailHref(anime.id, anime.title, locale)} className="block h-full">
        <div
          className={`relative mb-3 w-full overflow-hidden rounded-ui-sm border border-transparent shadow-lg transition-all duration-300 group-hover:border-brand/80 group-hover:shadow-[0_18px_44px_rgba(244,158,11,0.18)] ${
            variant === "compact" ? "rounded-ui-sm" : "rounded-ui-sm"
          }`}
          style={{ aspectRatio: "2/3" }}
        >
          {score && (
            <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-ui-sm bg-black/80 px-1.5 py-0.5 backdrop-blur-sm">
              <FaStar className="size-3.5 text-brand" />
              <span className="text-xs font-bold text-fg">{score}</span>
            </div>
          )}

          <div className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-105 relative">
            {coverSrc ? (
              <Image
                src={coverSrc}
                alt={title}
                fill
                sizes={variant === "compact" ? "(max-width: 768px) 180px, 220px" : "220px"}
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-border">
                <span className="material-symbols-outlined text-5xl text-fg-muted">movie</span>
              </div>
            )}
          </div>

          <div className="absolute inset-0 flex items-end bg-linear-to-t from-black/90 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="w-full translate-y-2 rounded-ui-sm bg-brand py-2 text-center text-xs font-bold uppercase tracking-wide text-brand-fg transition-transform duration-300 group-hover:translate-y-0">
              {t("viewDetails")}
            </div>
          </div>
        </div>

        <div>
          <h3 className="truncate text-sm font-bold text-fg transition-colors group-hover:text-brand">
            {title}
          </h3>
          {genres && (
            <p className="mt-1 text-xs text-fg-muted">{genres}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
