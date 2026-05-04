import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { localePathnamePattern } from "@/i18n/locales";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const { searchParams, origin } = request.nextUrl;

  // Supabase PKCE flow: sends `code`
  const code = searchParams.get("code");
  // Supabase email OTP flow: sends `token_hash`
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "recovery"
    | "signup"
    | "magiclink"
    | null;
  const next = searchParams.get("next") ?? "/";

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
    // `next` may start with `/` — prepend locale
    const hasLocale = localePathnamePattern.test(next);
    const redirectPath = hasLocale ? next : `/${locale}${next}`;
    return NextResponse.redirect(`${origin}${redirectPath}`);
  }

  // Redirect back to login with error flag
  return NextResponse.redirect(
    `${origin}/${locale}/login?error=invalid_reset_link`
  );
}
