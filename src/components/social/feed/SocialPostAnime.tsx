"use client";

import { FilmIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { SocialFeedAnime } from "@/types/social";

function getAnimeTitle(anime: SocialFeedAnime) {
  return anime.title_english || anime.title_romaji || `Anime #${anime.anime_id}`;
}

export default function SocialPostAnime({ anime }: { anime: SocialFeedAnime[] }) {
  const t = useTranslations("feed");
  const primary = anime.find((item) => item.role === "primary") ?? anime[0];
  const supporting = anime.filter((item) => item.role === "supporting");

  if (!primary) return null;

  const title = getAnimeTitle(primary);

  return (
    <section className="my-2 flex flex-wrap gap-2">
      <Link
        href={`/anime/${primary.anime_id}`}
        className="group inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-ui-pill border border-brand/35 bg-brand/10 px-2 py-1.5 text-xs font-black text-brand transition-colors hover:border-brand hover:text-fg"
      >
        <FilmIcon className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">{title}</span>
        {primary.episode !== null && <span className="shrink-0 text-brand-soft">/ {t("episode", { episode: primary.episode })}</span>}
      </Link>

      {supporting.length > 0 && (
        <>
          {supporting.map((item) => (
            <Link
              key={`${item.anime_id}-${item.sort_order}`}
              href={`/anime/${item.anime_id}`}
              className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-ui-pill border border-border-strong bg-white/5 px-3 py-1.5 text-xs font-bold text-fg-soft transition-colors hover:border-brand hover:text-fg"
            >
              <span className="inline-block min-w-0 max-w-48 truncate">{getAnimeTitle(item)}</span>
              {item.episode !== null && <span className="text-fg-subtle"> / {t("episode", { episode: item.episode })}</span>}
            </Link>
          ))}
        </>
      )}
    </section>
  );
}
