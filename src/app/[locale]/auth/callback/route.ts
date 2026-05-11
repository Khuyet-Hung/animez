import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { defaultLocale, isAppLocale, localePathnamePattern } from "@/i18n/locales";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
  } catch {
    return "/";
  }

  return value;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale: rawLocale } = await params;
  const locale = isAppLocale(rawLocale) ? rawLocale : defaultLocale;
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "recovery"
    | "signup"
    | "magiclink"
    | null;
  const next = getSafeNextPath(searchParams.get("next"));

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  let error = false;

  if (code) {
    // PKCE authorization code flow (default for email links)
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) error = true;
  } else if (token_hash && type) {
    // OTP token flow (magic link / email OTP)
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    if (otpError) error = true;
  } else {
    error = true;
  }

  if (!error) {
    const hasLocale = localePathnamePattern.test(next);
    const redirectPath = hasLocale ? next : `/${locale}${next === "/" ? "" : next}`;
    return NextResponse.redirect(`${origin}${redirectPath}`);
  }

  return NextResponse.redirect(
    `${origin}/${locale}/login?error=invalid_reset_link`
  );
}
