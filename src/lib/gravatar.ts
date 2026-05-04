export async function createGravatarUrl(
  email: string | null | undefined,
  size = 64
): Promise<string | null> {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !globalThis.crypto?.subtle) {
    return null;
  }

  const hashBuffer = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalizedEmail)
  );
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const params = new URLSearchParams({
    s: String(size),
    d: "404",
  });

  return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`;
}
