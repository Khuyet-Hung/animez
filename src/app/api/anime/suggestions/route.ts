import { NextResponse } from "next/server";
import { AniListRateLimitError, anilistClient } from "@/lib/anilist";
import { SUGGESTIONS_QUERY } from "@/lib/queries";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import type { AnimeMedia } from "@/types/anime";

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_LENGTH = 80;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

interface SuggestionsData {
  Page: {
    media: AnimeMedia[];
  };
}

function jsonResponse(body: unknown, init?: ResponseInit & { cache?: boolean }) {
  const { cache = true, ...responseInit } = init ?? {};
  const headers = new Headers(responseInit.headers);
  headers.set("Cache-Control", cache ? CACHE_CONTROL : "no-store");

  return NextResponse.json(body, {
    ...responseInit,
    headers,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("q")?.trim() ?? "").slice(0, MAX_SEARCH_LENGTH);

  if (search.length < MIN_SEARCH_LENGTH) {
    return jsonResponse({ results: [] });
  }

  const identifier = getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit({
    key: `anime-suggestions:${identifier}`,
    limit: RATE_LIMIT_MAX_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return jsonResponse(
      { results: [], message: "Too many requests." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
        },
        cache: false,
      }
    );
  }

  try {
    const data = await anilistClient.request<SuggestionsData>(SUGGESTIONS_QUERY, {
      search,
    });

    return jsonResponse({
      results: data.Page.media,
    });
  } catch (error: unknown) {
    if (error instanceof AniListRateLimitError) {
      return jsonResponse(
        { results: [], message: "AniList rate limit exceeded." },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfter ?? 60),
          },
          cache: false,
        }
      );
    }

    return jsonResponse(
      { results: [], message: "Unable to load anime suggestions." },
      { status: 502, cache: false }
    );
  }
}
