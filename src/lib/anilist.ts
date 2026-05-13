import "server-only";

const ANILIST_URL = "https://graphql.anilist.co";
export const ANILIST_CACHE_SECONDS = 10 * 60;

async function requestWithRetry<T>(
  query: string,
  variables?: Record<string, unknown>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(ANILIST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query, variables }),
        next: {
          revalidate: ANILIST_CACHE_SECONDS,
        },
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const wait = Number.isFinite(retryAfter)
          ? Math.max(retryAfter * 1000, delayMs * Math.pow(2, attempt))
          : delayMs * Math.pow(2, attempt);

        if (attempt < retries) {
          console.warn(`AniList bị rate limit. Thử lại sau ${wait}ms...`);
          await new Promise((resolve) => setTimeout(resolve, wait));
          continue;
        }
      }

      if (!response.ok) {
        throw new Error(`AniList request failed with status ${response.status}`);
      }

      const result = (await response.json()) as {
        data?: T;
        errors?: { message?: string }[];
      };

      if (result.errors?.length) {
        throw new Error(result.errors[0]?.message ?? "AniList GraphQL error");
      }

      if (!result.data) {
        throw new Error("AniList response is missing data");
      }

      return result.data;
    } catch (err: unknown) {
      if (attempt >= retries) throw err;

      const wait = delayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, wait));
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
