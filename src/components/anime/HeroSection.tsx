"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { AnimeMedia } from "@/types/anime";
import { PlayIcon, Plus } from "lucide-react";
import { FaStar } from "react-icons/fa";
import { useTranslations } from "next-intl";

interface HeroSectionProps {
  anime: AnimeMedia;
}

export default function HeroSection({ anime }: HeroSectionProps) {
  const t = useTranslations("home");
  const title = anime.title.english || anime.title.romaji;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const genres = anime.genres?.slice(0, 3).join(", ") || "";
  const bannerSrc = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large;

  return (
    <section className="relative w-full mt-6 rounded-lg overflow-hidden min-h-[500px] lg:min-h-[600px] flex items-end">
      {/* Banner image */}
      {bannerSrc ? (
        <div className="absolute inset-0">
          <Image
            src={bannerSrc}
            alt={title}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 bg-[#111118]"
          style={{ backgroundColor: anime.coverImage?.color || "#111118" }}
        />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-r from-[#0a0a0f]/90 via-[#0a0a0f]/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 w-full p-6 md:p-12 lg:max-w-3xl flex flex-col gap-6">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="bg-[#f49e0b] text-[#0a0a0f] text-xs font-bold px-2 py-1 rounded">
            {t("trending_badge")}
          </span>
          {score && (
            <span className="text-[#f49e0b] flex items-center gap-1 text-sm font-bold">
              <FaStar className="w-[18px] h-[18px]"/>
              <span>{score}</span>
            </span>
          )}
          {genres && (
            <span className="text-[#9ca3af] text-sm">• {genres}</span>
          )}
        </div>

        <h1 className="text-white text-4xl md:text-6xl lg:text-[64px] font-black leading-[1.1] tracking-tight">
          {title}
        </h1>

        {anime.description && (
          <p className="text-gray-300 text-sm md:text-base max-w-xl line-clamp-3">
            {anime.description.replace(/<[^>]*>/g, "")}
          </p>
        )}

        <div className="flex flex-wrap gap-4 mt-2">
          <Link
            href={`/anime/${anime.id}`}
            className="flex items-center gap-2 h-12 px-6 bg-[#f49e0b] hover:bg-[#d68a09] text-[#0a0a0f] text-base font-bold rounded transition-colors"
          >
            <span className="material-symbols-outlined"><PlayIcon /></span>
            {t("viewDetails")}
          </Link>
          <button className="flex items-center gap-2 h-12 px-6 bg-[#111118] border border-[#1a1a24] hover:border-[#f49e0b] text-white text-base font-bold rounded transition-colors group">
            <span className="material-symbols-outlined group-hover:text-[#f49e0b] transition-colors"><Plus /></span>
            {t("addToWatchlist")}
          </button>
        </div>
      </div>
    </section>
  );
}
