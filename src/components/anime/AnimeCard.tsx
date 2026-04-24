"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { AnimeMedia } from "@/types/anime";
import { FaStar } from "react-icons/fa";
import { useTranslations } from "next-intl";

interface AnimeCardProps {
  anime: AnimeMedia;
  variant?: "compact" | "full";
}

function formatTitle(anime: AnimeMedia) {
  return anime.title.english || anime.title.romaji;
}

function formatScore(score?: number | null) {
  if (!score) return null;
  return (score / 10).toFixed(1);
}

export default function AnimeCard({ anime, variant = "compact" }: AnimeCardProps) {
  const t = useTranslations("card");
  const title = formatTitle(anime);
  const score = formatScore(anime.averageScore);
  const genres = anime.genres?.slice(0, 2).join(" • ") || "";

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group cursor-pointer block"
    >
      <div
        className={`relative w-full overflow-hidden mb-3 border border-transparent group-hover:border-[#f49e0b] transition-all duration-300 shadow-lg ${
          variant === "compact" ? "rounded" : "rounded"
        }`}
        style={{ aspectRatio: "2/3" }}
      >
        {/* Score badge */}
        {score && (
          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
            <span className="material-symbols-outlined text-[#f49e0b]" style={{ fontSize: "14px" }}><FaStar /></span>
            <span className="text-white text-xs font-bold">{score}</span>
          </div>
        )}

        {/* Cover image */}
        <div className="w-full h-full transition-transform duration-500 group-hover:scale-110 relative">
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

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <button className="w-full py-2 bg-[#f49e0b] text-[#0a0a0f] font-bold text-xs rounded uppercase tracking-wide">
            {t("viewDetails")}
          </button>
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
  );
}
