const ANILIST_URL = "https://graphql.anilist.co";

export class AniListRateLimitError extends Error {
  retryAfter: number | null;

  constructor(retryAfter: number | null) {
    super("AniList rate limit exceeded");
    this.name = "AniListRateLimitError";
    this.retryAfter = retryAfter;
  }
}

export async function requestAniList<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    throw new AniListRateLimitError(Number.isFinite(retryAfter) ? retryAfter : null);
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
}
