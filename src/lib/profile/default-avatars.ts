export const DEFAULT_AVATAR_URLS = [
  "/images/avatar/anya.webp",
  "/images/avatar/ayanami.webp",
  "/images/avatar/fern.webp",
  "/images/avatar/gojo.webp",
  "/images/avatar/itachi.webp",
  "/images/avatar/kamina.webp",
  "/images/avatar/ken_aneki.webp",
  "/images/avatar/kikoru.webp",
  "/images/avatar/l.webp",
  "/images/avatar/levi.webp",
  "/images/avatar/luffy.webp",
  "/images/avatar/makima.webp",
  "/images/avatar/musashi.webp",
  "/images/avatar/power.webp",
  "/images/avatar/simon.webp",
  "/images/avatar/spike.webp",
  "/images/avatar/sung_jin_woo.webp",
  "/images/avatar/vegeta.webp",
  "/images/avatar/violet.webp",
  "/images/avatar/zero_two.webp",
  "/images/avatar/zoldyck.webp",
] as const;

export function getRandomDefaultAvatarUrl() {
  const index = Math.floor(Math.random() * DEFAULT_AVATAR_URLS.length);
  return DEFAULT_AVATAR_URLS[index];
}
