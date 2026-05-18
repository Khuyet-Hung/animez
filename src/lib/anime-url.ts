import { formatAnimeTitle } from "@/lib/anime-title";
import type { AnimeTitle } from "@/types/anime";

function slugifyAnimeTitle(title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "anime";
}

export function buildAnimeDetailHref(
  id: number | string,
  title: AnimeTitle | string | null | undefined,
  locale?: string
) {
  const resolvedTitle =
    typeof title === "string" ? title : title ? formatAnimeTitle(title, locale) : "";

  return `/anime/${id}/${slugifyAnimeTitle(resolvedTitle)}`;
}
