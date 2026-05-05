import type { ProfileFieldErrors, ProfileFormInput } from "@/types/profile";

export const RESERVED_PROFILE_USERNAMES = new Set([
  "profile",
  "login",
  "register",
  "search",
  "anime",
  "admin",
  "api",
]);

const USERNAME_PATTERN = /^[a-z0-9_-]{3,24}$/;

export function normalizeProfileUsername(value: string) {
  return value.trim().toLowerCase();
}

export function sanitizeUsernameSeed(value: string) {
  const seed = normalizeProfileUsername(value)
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return USERNAME_PATTERN.test(seed) && !RESERVED_PROFILE_USERNAMES.has(seed)
    ? seed
    : "anime-user";
}

export function isValidAvatarUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateProfileInput(input: ProfileFormInput) {
  const errors: ProfileFieldErrors = {};
  const username = normalizeProfileUsername(input.username);
  const displayName = input.display_name.trim();
  const bio = input.bio.trim();
  const avatarUrl = input.avatar_url.trim();

  if (!USERNAME_PATTERN.test(username)) {
    errors.username = "invalidUsername";
  } else if (RESERVED_PROFILE_USERNAMES.has(username)) {
    errors.username = "reservedUsername";
  }

  if (displayName.length < 1 || displayName.length > 40) {
    errors.display_name = "invalidDisplayName";
  }

  if (bio.length > 160) {
    errors.bio = "bioTooLong";
  }

  if (!isValidAvatarUrl(avatarUrl)) {
    errors.avatar_url = "invalidAvatarUrl";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      username,
      display_name: displayName,
      avatar_url: avatarUrl,
      bio,
      is_public: input.is_public,
    } satisfies ProfileFormInput,
  };
}
