export const locales = ["en", "vi", "ja"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

const localePatternSource = locales.join("|");

export const localePathnamePattern = new RegExp(
  `^/(${localePatternSource})(/|$)`
);

export const localePrefixPattern = new RegExp(`^/(${localePatternSource})`);

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export function getPathLocale(pathname: string) {
  const locale = pathname.match(localePrefixPattern)?.[1];
  return isAppLocale(locale) ? locale : undefined;
}
