import type { SocialPostAnimeDraft, SocialPostFieldErrors, SocialPostImageLayout } from "@/types/social";

export const SOCIAL_POST_CAPTION_MAX_LENGTH = 280;
export const SOCIAL_POST_DESCRIPTION_MAX_LENGTH = 2000;
export const SOCIAL_POST_MAX_SUPPORTING_ANIME = 5;
export const SOCIAL_POST_MAX_IMAGES = 6;
export const SOCIAL_POST_MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const SOCIAL_POST_IMAGE_LAYOUTS: SocialPostImageLayout[] = [
  "auto",
  "stacked",
  "side_by_side",
  "featured_top",
  "featured_side",
  "mosaic_top",
  "mosaic_side",
];

export const SOCIAL_POST_IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

interface ParsedSocialPostInput {
  caption: string;
  description: string;
  imageLayout: SocialPostImageLayout;
  primaryAnime: SocialPostAnimeDraft;
  supportingAnime: SocialPostAnimeDraft[];
}

type ValidationResult =
  | {
      ok: true;
      value: ParsedSocialPostInput;
      errors: SocialPostFieldErrors;
    }
  | {
      ok: false;
      errors: SocialPostFieldErrors;
    };

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function normalizeOptionalText(value: unknown, maxLength = 300) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, maxLength);
}

function normalizeNullableInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;

  return Math.trunc(parsed);
}

export function getDefaultSocialPostImageLayout(imageCount: number): SocialPostImageLayout {
  if (imageCount <= 1) return "auto";
  if (imageCount === 2) return "stacked";
  if (imageCount <= 4) return "featured_top";
  return "mosaic_top";
}

function normalizeImageLayout(value: string, imageCount: number): SocialPostImageLayout {
  if (SOCIAL_POST_IMAGE_LAYOUTS.includes(value as SocialPostImageLayout)) {
    return value as SocialPostImageLayout;
  }

  return getDefaultSocialPostImageLayout(imageCount);
}

function parseAnimeDraft(value: unknown): SocialPostAnimeDraft | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const animeId = Number(record.anime_id);
  const episode = normalizeNullableInteger(record.episode);
  const seasonYear = normalizeNullableInteger(record.season_year);

  if (!Number.isInteger(animeId) || animeId <= 0) return null;
  if (episode !== null && episode < 0) return null;
  if (seasonYear !== null && seasonYear < 0) return null;

  return {
    anime_id: animeId,
    episode,
    title_romaji: normalizeOptionalText(record.title_romaji),
    title_english: normalizeOptionalText(record.title_english),
    cover_image: normalizeOptionalText(record.cover_image, 1000),
    format: normalizeOptionalText(record.format, 40),
    season_year: seasonYear,
  };
}

function parseJsonField(formData: FormData, key: string) {
  const raw = getTextValue(formData, key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function getSocialPostImageFiles(formData: FormData) {
  return formData
    .getAll("images")
    .filter((file): file is File => file instanceof File && file.size > 0);
}

export function validateSocialPostImages(files: File[]): SocialPostFieldErrors {
  if (files.length > SOCIAL_POST_MAX_IMAGES) {
    return { images: "tooManyImages" };
  }

  for (const file of files) {
    if (!SOCIAL_POST_IMAGE_MIME_EXTENSIONS[file.type]) {
      return { images: "invalidImageType" };
    }

    if (file.size > SOCIAL_POST_MAX_IMAGE_SIZE) {
      return { images: "imageTooLarge" };
    }
  }

  return {};
}

export function validateCreateSocialPostInput(formData: FormData, imageCount = 0): ValidationResult {
  const caption = getTextValue(formData, "caption").trim();
  const description = getTextValue(formData, "description").trim();
  const imageLayout = normalizeImageLayout(getTextValue(formData, "image_layout"), imageCount);
  const errors: SocialPostFieldErrors = {};

  if (!caption) {
    errors.caption = "captionRequired";
  } else if (caption.length > SOCIAL_POST_CAPTION_MAX_LENGTH) {
    errors.caption = "captionTooLong";
  }

  if (description.length > SOCIAL_POST_DESCRIPTION_MAX_LENGTH) {
    errors.description = "descriptionTooLong";
  }

  const primaryAnime = parseAnimeDraft(parseJsonField(formData, "primary_anime"));
  if (!primaryAnime) {
    errors.primaryAnime = "primaryAnimeRequired";
  }

  const rawSupportingAnime = parseJsonField(formData, "supporting_anime");
  const supportingAnime = Array.isArray(rawSupportingAnime)
    ? rawSupportingAnime.map(parseAnimeDraft).filter((anime): anime is SocialPostAnimeDraft => Boolean(anime))
    : [];

  if (Array.isArray(rawSupportingAnime) && supportingAnime.length !== rawSupportingAnime.length) {
    errors.supportingAnime = "invalidSupportingAnime";
  }

  if (supportingAnime.length > SOCIAL_POST_MAX_SUPPORTING_ANIME) {
    errors.supportingAnime = "tooManySupportingAnime";
  }

  if (primaryAnime) {
    const animeIds = new Set<number>();
    animeIds.add(primaryAnime.anime_id);

    for (const anime of supportingAnime) {
      if (animeIds.has(anime.anime_id)) {
        errors.supportingAnime = "duplicateAnime";
        break;
      }

      animeIds.add(anime.anime_id);
    }
  }

  if (Object.keys(errors).length > 0 || !primaryAnime) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: {},
    value: {
      caption,
      description,
      imageLayout,
      primaryAnime,
      supportingAnime,
    },
  };
}
