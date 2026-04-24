import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Routes that require authentication
const PROTECTED_ROUTES = ["/profile", "/watchlist", "/settings"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Step 1: Refresh Supabase session & get response
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Step 2: Route guard — strip locale prefix to check protected path
  const localePattern = /^\/(vi|en)(\/|$)/;
  const strippedPath = pathname.replace(localePattern, "/");
  const isProtected = PROTECTED_ROUTES.some(
    (route) => strippedPath === route || strippedPath.startsWith(route + "/")
  );

  if (isProtected && !user) {
    // Detect locale from pathname
    const localeMatch = pathname.match(/^\/(vi|en)/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Step 3: Run next-intl routing (copies over cookies set by Supabase)
  const intlResponse = intlMiddleware(request);

  // Merge Supabase cookies into intlResponse
  response.cookies.getAll().forEach(({ name, value, ...rest }) => {
    intlResponse.cookies.set(name, value, rest);
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|auth|_next/static|_next/image|favicon.ico).*)"],
};
