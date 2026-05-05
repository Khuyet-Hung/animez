import Image from "next/image";
import { ImageIcon, StarIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ANIME_LIST_STATUS_BADGE_CLASS } from "@/lib/anime-list/constants";
import type { AnimeListStatus } from "@/types/anime-list";
import type { PublicAnimeListEntry } from "@/types/profile";

interface ProfileAnimeListProps {
  entries: PublicAnimeListEntry[];
  emptyLabel: string;
  labels: {
    score: string;
    progress: string;
    updated: string;
    status: Record<AnimeListStatus, string>;
  };
}

function getEntryTitle(entry: PublicAnimeListEntry) {
  return entry.title_english || entry.title_romaji || `Anime #${entry.anime_id}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export default function ProfileAnimeList({ entries, emptyLabel, labels }: ProfileAnimeListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded border border-[#1a1a24] bg-[#111118] px-5 py-12 text-center">
        <p className="text-sm font-semibold text-[#9ca3af]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border border-[#1a1a24] bg-[#111118]">
      <div className="divide-y divide-[#1a1a24]">
        {entries.map((entry) => {
          const title = getEntryTitle(entry);
          const progressLabel = `${entry.progress_episodes}/${entry.total_episodes ?? "?"}`;

          return (
            <Link
              key={entry.anime_id}
              href={`/anime/${entry.anime_id}`}
              className="grid grid-cols-[56px_1fr] gap-3 px-4 py-3 transition-colors hover:bg-[#1a1a24]/70 md:grid-cols-[56px_1fr_auto]"
            >
              <div className="relative h-20 w-14 overflow-hidden rounded border border-[#1a1a24] bg-[#0f0f16]">
                {entry.cover_image ? (
                  <Image src={entry.cover_image} alt={title} fill sizes="56px" className="object-cover" unoptimized />
                ) : (
                  <div className="flex size-full items-center justify-center text-[#5f6472]">
                    <ImageIcon className="size-5" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-black leading-5 text-white md:text-base">
                  {title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#5f6472]">
                  {[entry.format?.replace("_", " "), entry.season_year].filter(Boolean).join(" · ") || "Anime"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border px-2 py-1 text-[11px] font-bold ${
                      ANIME_LIST_STATUS_BADGE_CLASS[entry.status]
                    }`}
                  >
                    {labels.status[entry.status]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded border border-[#1a1a24] bg-[#0f0f16] px-2 py-1 text-[11px] font-bold text-[#d1d5db]">
                    <StarIcon className="size-3 fill-[#f49e0b] text-[#f49e0b]" />
                    {labels.score}: {entry.score > 0 ? entry.score : "-"}
                  </span>
                  <span className="rounded border border-[#1a1a24] bg-[#0f0f16] px-2 py-1 text-[11px] font-bold text-[#d1d5db]">
                    {labels.progress}: {progressLabel}
                  </span>
                </div>
              </div>

              <div className="col-span-2 self-end text-xs font-semibold text-[#5f6472] md:col-span-1 md:self-center md:text-right">
                {labels.updated}
                <br />
                <span className="text-[#9ca3af]">{formatDate(entry.updated_at)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
