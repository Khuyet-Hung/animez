import { GraphQLClient } from "graphql-request";

const ANILIST_URL = "https://graphql.anilist.co";
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const rawClient = new GraphQLClient(ANILIST_URL, {
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const cache = new Map<string, { data: unknown; expiresAt: number }>();

function pruneCache(now: number) {
  for (const [key, value] of cache) {
    if (value.expiresAt <= now) cache.delete(key);
  }

  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

async function requestWithRetry<T>(
  query: string,
  variables?: Record<string, unknown>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  const cacheKey = JSON.stringify({ query, variables });
  const now = Date.now();
  pruneCache(now);

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
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
        console.warn(`AniList bị rate limit. Thử lại sau ${wait}ms...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      throw err;
    }
  }

  throw new Error("Max retries exceeded for AniList request");
}

export const anilistClient = {
  request: <T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> => requestWithRetry<T>(query, variables),
};
