import Image from "next/image";
import { ImageIcon, StarIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ANIME_LIST_STATUS_BADGE_CLASS } from "@/lib/anime-list/constants";
import type { AnimeListStatus } from "@/types/anime-list";
import type { PublicAnimeListEntry } from "@/types/profile";
import { AppEmptyState, AppPanel } from "@/components/ui";

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
    return <AppEmptyState description={emptyLabel} />;
  }

  return (
    <AppPanel className="overflow-hidden">
      <div className="divide-y divide-border">
        {entries.map((entry) => {
          const title = getEntryTitle(entry);
          const progressLabel = `${entry.progress_episodes}/${entry.total_episodes ?? "?"}`;

          return (
            <Link
              key={entry.anime_id}
              href={`/anime/${entry.anime_id}`}
              className="grid grid-cols-[56px_1fr] gap-3 px-4 py-3 transition-colors hover:bg-border/70 md:grid-cols-[56px_1fr_auto]"
            >
              <div className="relative h-20 w-14 overflow-hidden rounded-ui-sm border border-border bg-surface-muted">
                {entry.cover_image ? (
                  <Image src={entry.cover_image} alt={title} fill sizes="56px" className="object-cover" unoptimized />
                ) : (
                  <div className="flex size-full items-center justify-center text-fg-subtle">
                    <ImageIcon className="size-5" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-black leading-5 text-fg md:text-base">
                  {title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-fg-subtle">
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
                  <span className="inline-flex items-center gap-1 rounded-ui-sm border border-border bg-surface-muted px-2 py-1 text-[11px] font-bold text-fg-soft">
                    <StarIcon className="size-3 fill-brand text-brand" />
                    {labels.score}: {entry.score > 0 ? entry.score : "-"}
                  </span>
                  <span className="rounded-ui-sm border border-border bg-surface-muted px-2 py-1 text-[11px] font-bold text-fg-soft">
                    {labels.progress}: {progressLabel}
                  </span>
                </div>
              </div>

              <div className="col-span-2 self-end text-xs font-semibold text-fg-subtle md:col-span-1 md:self-center md:text-right">
                {labels.updated}
                <br />
                <span className="text-fg-muted">{formatDate(entry.updated_at)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </AppPanel>
  );
}
