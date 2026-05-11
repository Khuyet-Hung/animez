import { defaultLocale, isAppLocale } from "@/i18n/locales";

const DEFAULT_SITE_URL = "https://www.animez.site";
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

function normalizeSiteUrl(value: string | undefined) {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return undefined;
  }
}

export const SITE_URL = normalizeSiteUrl(configuredSiteUrl) ?? DEFAULT_SITE_URL;

function getCurrentOrigin() {
  if (typeof window === "undefined") return SITE_URL;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocalhost) {
    return window.location.origin;
  }

  return SITE_URL;
}

function getCurrentLocale() {
  if (typeof window === "undefined") return defaultLocale;

  const locale = window.location.pathname.split("/")[1];
  return isAppLocale(locale) ? locale : defaultLocale;
}

export function getAuthCallbackUrl(nextPath?: string) {
  const locale = getCurrentLocale();
  const callbackUrl = new URL(`/${locale}/auth/callback`, getCurrentOrigin());

  if (nextPath && nextPath !== "/") {
    callbackUrl.searchParams.set("next", nextPath);
  }

  return callbackUrl.toString();
}
