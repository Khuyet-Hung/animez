"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { AnimeMedia } from "@/types/anime";
import { formatAnimeTitle } from "@/lib/anime-title";
import { buildAnimeDetailHref } from "@/lib/anime-url";
import { PlayIcon } from "lucide-react";
import { FaStar } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { AppBadge } from "@/components/ui";
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
      className="relative mt-6 flex min-h-[500px] w-full items-end overflow-hidden rounded-ui-sm lg:min-h-[600px]"
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
    >
      {bannerSrc ? (
        <motion.div className="absolute inset-0" variants={heroImageVariants} style={{ y: imageY }}>
          <Image
            src={bannerSrc}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 1400px"
            className="object-cover will-change-transform"
            priority
          />
        </motion.div>
      ) : (
        <motion.div
          className="absolute inset-0 bg-surface"
          style={anime.coverImage?.color ? { backgroundColor: anime.coverImage.color } : undefined}
          variants={heroImageVariants}
        />
      )}

      <motion.div className="absolute inset-0" variants={heroOverlayVariants}>
        <div className="absolute inset-0 bg-linear-to-t from-bg via-bg/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-bg/90 via-bg/40 to-transparent" />
      </motion.div>

      <motion.div
        className="relative z-10 w-full p-6 md:p-12 lg:max-w-3xl flex flex-col gap-6"
        variants={heroContentVariants}
      >
        <motion.div className="flex flex-wrap gap-2 items-center" variants={heroContentItemVariants}>
          <AppBadge variant="brand" className="border-brand bg-brand text-brand">
            {t("trending_badge")}
          </AppBadge>
          {score && (
            <span className="flex items-center gap-1 text-sm font-bold text-brand">
              <FaStar className="w-[18px] h-[18px]" />
              <span>{score}</span>
            </span>
          )}
          {genres && (
            <span className="text-sm text-fg-muted">{"\u2022"} {genres}</span>
          )}
        </motion.div>

        <motion.h1
          className="text-4xl font-black leading-[1.1] tracking-tight text-fg md:text-6xl lg:text-[64px]"
          variants={heroContentItemVariants}
        >
          {title}
        </motion.h1>

        {anime.description && (
          <motion.p
            className="line-clamp-3 max-w-xl text-sm text-fg-soft md:text-base"
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
              href={buildAnimeDetailHref(anime.id, anime.title, locale)}
              className="flex h-12 items-center gap-2 rounded-ui-sm bg-brand px-6 text-base font-bold text-brand-fg transition-colors hover:bg-brand-hover"
            >
              <PlayIcon className="size-5" />
              {t("viewDetails")}
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
