import type { AnimeTitle } from "@/types/anime";

export function formatAnimeTitle(title: AnimeTitle, locale?: string) {
  if (locale === "ja") {
    return title.native || title.romaji || title.english || "";
  }

  return title.english || title.romaji || title.native || "";
}
