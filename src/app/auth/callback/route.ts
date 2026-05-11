import { NextResponse } from "next/server";
import { defaultLocale } from "@/i18n/locales";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = new URL(`/${defaultLocale}/auth/callback`, url.origin);

  for (const [key, value] of url.searchParams) {
    callbackUrl.searchParams.append(key, value);
  }

  return NextResponse.redirect(callbackUrl);
}
