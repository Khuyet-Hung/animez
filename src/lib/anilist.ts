import "server-only";

const ANILIST_URL = "https://graphql.anilist.co";
export const ANILIST_CACHE_SECONDS = 10 * 60;
const BASE_RETRY_DELAY_MS = 1000;

export class AniListRateLimitError extends Error {
  retryAfter: number | null;

  constructor(retryAfter: number | null) {
    super("AniList rate limit exceeded");
    this.name = "AniListRateLimitError";
    this.retryAfter = retryAfter;
  }
}

function getRetryAfter(response: Response) {
  const retryAfter = Number(response.headers.get("Retry-After"));
  return Number.isFinite(retryAfter) ? retryAfter : null;
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 425 || status >= 500;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry<T>(
  query: string,
  variables?: Record<string, unknown>,
  retries = 2,
  delayMs = BASE_RETRY_DELAY_MS
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
        throw new AniListRateLimitError(getRetryAfter(response));
      }

      if (!response.ok) {
        if (attempt < retries && isRetryableStatus(response.status)) {
          await wait(delayMs * Math.pow(2, attempt));
          continue;
        }

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
    } catch (error: unknown) {
      if (error instanceof AniListRateLimitError) throw error;
      if (attempt >= retries) throw error;

      await wait(delayMs * Math.pow(2, attempt));
    }
  }

  throw new Error("Max retries exceeded for AniList request");
}

export const anilistClient = {
  request: <T>(query: string, variables?: Record<string, unknown>): Promise<T> =>
    requestWithRetry<T>(query, variables),
};
