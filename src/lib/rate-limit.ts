import "server-only";

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

function cleanup(now: number) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  cleanup(now);

  const existing = buckets.get(key);
  if (!existing) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export function getRateLimitIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return firstForwardedIp || realIp || "unknown";
}
