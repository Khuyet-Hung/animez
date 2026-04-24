import { GraphQLClient } from "graphql-request";

const ANILIST_URL = "https://graphql.anilist.co";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const rawClient = new GraphQLClient(ANILIST_URL, {
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Simple in-memory cache to avoid hammering AniList in dev (ISR doesn't apply in dev mode)
const cache = new Map<string, { data: unknown; expiresAt: number }>();

async function requestWithRetry<T>(
  query: string,
  variables?: Record<string, unknown>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  const cacheKey = JSON.stringify({ query, variables });
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await rawClient.request<T>(query, variables);
      cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } })?.response?.status;

      if (status === 429 && attempt < retries) {
        const wait = delayMs * Math.pow(2, attempt);
        console.warn(`AniList rate limited. Retrying in ${wait}ms…`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      throw err;
    }
  }

  throw new Error("Max retries exceeded for AniList request");
}

// Drop-in replacement with the same .request() interface
export const anilistClient = {
  request: <T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> => requestWithRetry<T>(query, variables),
};
