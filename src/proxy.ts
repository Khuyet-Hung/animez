import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { getPathLocale, localePathnamePattern } from "./i18n/locales";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_ROUTES = ["/profile", "/watchlist", "/settings"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = getPathLocale(pathname);

  if (locale && pathname === `/${locale}` && request.nextUrl.searchParams.has("code")) {
    const callbackUrl = new URL(`/${locale}/auth/callback`, request.url);

    for (const [key, value] of request.nextUrl.searchParams) {
      callbackUrl.searchParams.append(key, value);
    }

    return NextResponse.redirect(callbackUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const strippedPath = pathname.replace(localePathnamePattern, "/");
  const isProtected = PROTECTED_ROUTES.some(
    (route) => strippedPath === route || strippedPath.startsWith(`${route}/`)
  );

  if (isProtected && !user) {
    const locale = getPathLocale(pathname) ?? routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);

    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  const intlResponse = intlMiddleware(request);

  response.cookies.getAll().forEach(({ name, value, ...options }) => {
    intlResponse.cookies.set(name, value, options);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!api|auth|trpc|_next|_vercel|opengraph-image|.*\\..*).*)",
  ],
};
