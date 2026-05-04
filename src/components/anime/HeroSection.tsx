"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { AnimeMedia } from "@/types/anime";
import { formatAnimeTitle } from "@/lib/anime-title";
import { PlayIcon } from "lucide-react";
import { FaStar } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  heroContentItemVariants,
  heroContentVariants,
  heroImageVariants,
  heroOverlayVariants,
} from "@/lib/motion";
import useHydratedReducedMotion from "@/hooks/useHydratedReducedMotion";

interface HeroSectionProps {
  anime: AnimeMedia;
}

export default function HeroSection({ anime }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const t = useTranslations("home");
  const taxonomyT = useTranslations("taxonomy");
  const locale = useLocale();
  const reduceMotion = useHydratedReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 36]);
  const title = formatAnimeTitle(anime.title, locale);
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const genres = anime.genres?.slice(0, 3).map((genre) => taxonomyT(`genres.${genre}`)).join(", ") || "";
  const bannerSrc = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large;

  return (
    <motion.section
      ref={sectionRef}
      className="relative w-full mt-6 rounded-lg overflow-hidden min-h-[500px] lg:min-h-[600px] flex items-end"
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
    >
      {bannerSrc ? (
        <motion.div className="absolute inset-0" variants={heroImageVariants} style={{ y: imageY }}>
          <Image
            src={bannerSrc}
            alt={title}
            fill
            className="object-cover will-change-transform"
            priority
            unoptimized
          />
        </motion.div>
      ) : (
        <motion.div
          className="absolute inset-0 bg-[#111118]"
          style={{ backgroundColor: anime.coverImage?.color || "#111118" }}
          variants={heroImageVariants}
        />
      )}

      <motion.div className="absolute inset-0" variants={heroOverlayVariants}>
        <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-[#0a0a0f]/90 via-[#0a0a0f]/40 to-transparent" />
      </motion.div>

      <motion.div
        className="relative z-10 w-full p-6 md:p-12 lg:max-w-3xl flex flex-col gap-6"
        variants={heroContentVariants}
      >
        <motion.div className="flex flex-wrap gap-2 items-center" variants={heroContentItemVariants}>
          <span className="bg-[#f49e0b] text-[#0a0a0f] text-xs font-bold px-2 py-1 rounded">
            {t("trending_badge")}
          </span>
          {score && (
            <span className="text-[#f49e0b] flex items-center gap-1 text-sm font-bold">
              <FaStar className="w-[18px] h-[18px]" />
              <span>{score}</span>
            </span>
          )}
          {genres && (
            <span className="text-[#9ca3af] text-sm">{"\u2022"} {genres}</span>
          )}
        </motion.div>

        <motion.h1
          className="text-white text-4xl md:text-6xl lg:text-[64px] font-black leading-[1.1] tracking-tight"
          variants={heroContentItemVariants}
        >
          {title}
        </motion.h1>

        {anime.description && (
          <motion.p
            className="text-gray-300 text-sm md:text-base max-w-xl line-clamp-3"
            variants={heroContentItemVariants}
          >
            {anime.description.replace(/<[^>]*>/g, "")}
          </motion.p>
        )}

        <motion.div className="flex flex-wrap gap-4 mt-2" variants={heroContentItemVariants}>
          <motion.div
            whileHover={reduceMotion ? undefined : { y: -2 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          >
            <Link
              href={`/anime/${anime.id}`}
              className="flex items-center gap-2 h-12 px-6 bg-[#f49e0b] hover:bg-[#d68a09] text-[#0a0a0f] text-base font-bold rounded transition-colors"
            >
              <span className="material-symbols-outlined"><PlayIcon /></span>
              {t("viewDetails")}
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
