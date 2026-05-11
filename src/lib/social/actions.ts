"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getSocialPostImageFiles,
  validateCreateSocialPostInput,
  validateSocialPostImages,
} from "@/lib/social/validators";
import {
  deleteSocialPostImages,
  uploadSocialPostImage,
  type UploadedSocialPostImage,
} from "@/lib/social/r2";
import type {
  CreateSocialPostActionState,
  DeleteSocialPostActionState,
  SocialPostAnimeDraft,
} from "@/types/social";

const INITIAL_ERROR_STATE: CreateSocialPostActionState = {
  status: "error",
  messageKey: "createFailed",
  fieldErrors: {},
};

const IMAGE_POST_DAILY_LIMIT = 10;
const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface SocialPostInsertPayload {
  user_id: string;
  caption: string;
  description: string;
  image_layout?: string;
  visibility: "public";
}

function logSocialPostActionError(stage: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[createSocialPostAction] ${stage}`, {
    error,
    ...context,
  });
}

function logDeleteSocialPostActionError(stage: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[deleteSocialPostAction] ${stage}`, {
    error,
    ...context,
  });
}

function isMissingImageLayoutColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const record = error as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : "";

  return (
    (record.code === "42703" || record.code === "PGRST204") &&
    message.includes("image_layout")
  );
}

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getSafeLocale(formData: FormData) {
  const locale = getTextValue(formData, "locale");
  return /^[a-z]{2}$/.test(locale) ? locale : "vi";
}

function getVietnamDayRange(date = new Date()) {
  const vietnamTime = date.getTime() + VIETNAM_TIMEZONE_OFFSET_MS;
  const start = Math.floor(vietnamTime / DAY_MS) * DAY_MS - VIETNAM_TIMEZONE_OFFSET_MS;

  return {
    start: new Date(start).toISOString(),
    end: new Date(start + DAY_MS).toISOString(),
  };
}

function toAnimeRow(postId: string, anime: SocialPostAnimeDraft, role: "primary" | "supporting", sortOrder: number) {
  return {
    post_id: postId,
    anime_id: anime.anime_id,
    role,
    episode: anime.episode,
    title_romaji: anime.title_romaji,
    title_english: anime.title_english,
    cover_image: anime.cover_image,
    format: anime.format,
    season_year: anime.season_year,
    sort_order: sortOrder,
  };
}

function toImageRow(postId: string, image: UploadedSocialPostImage, sortOrder: number) {
  return {
    post_id: postId,
    storage_provider: "r2",
    storage_key: image.storageKey,
    public_url: image.publicUrl,
    mime_type: image.mimeType,
    size_bytes: image.sizeBytes,
    width: null,
    height: null,
    sort_order: sortOrder,
  };
}

async function rollbackUploadedImages(images: UploadedSocialPostImage[]) {
  if (images.length === 0) return;

  try {
    await deleteSocialPostImages(images.map((image) => image.storageKey));
  } catch (error) {
    logSocialPostActionError("Failed to rollback uploaded social post images", error, {
      imageCount: images.length,
    });
  }
}

async function rollbackInsertedPost(
  supabase: SupabaseClient,
  postId: string
) {
  const { error } = await supabase.from("social_posts").delete().eq("id", postId);

  if (error) {
    logSocialPostActionError("Failed to rollback inserted social post", error, { postId });
  }
}

async function insertSocialPost(supabase: SupabaseClient, payload: SocialPostInsertPayload) {
  const result = await supabase.from("social_posts").insert(payload).select("id").single();

  if (!isMissingImageLayoutColumnError(result.error)) return result;

  logSocialPostActionError("social_posts.image_layout column is missing; retrying legacy insert", result.error);

  const legacyPayload: Omit<SocialPostInsertPayload, "image_layout"> = {
    user_id: payload.user_id,
    caption: payload.caption,
    description: payload.description,
    visibility: payload.visibility,
  };

  return supabase.from("social_posts").insert(legacyPayload).select("id").single();
}

export async function createSocialPostAction(
  _previousState: CreateSocialPostActionState,
  formData: FormData
): Promise<CreateSocialPostActionState> {
  const imageFiles = getSocialPostImageFiles(formData);
  const input = validateCreateSocialPostInput(formData, imageFiles.length);
  const imageErrors = validateSocialPostImages(imageFiles);

  if (!input.ok || Object.keys(imageErrors).length > 0) {
    return {
      status: "error",
      messageKey: "validationFailed",
      fieldErrors: {
        ...input.errors,
        ...imageErrors,
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      messageKey: "loginRequired",
      fieldErrors: {},
    };
  }

  if (imageFiles.length > 0) {
    const { start, end } = getVietnamDayRange();
    const { count, error: quotaError } = await supabase
      .from("social_posts")
      .select("id,social_post_images!inner(id)", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("created_at", start)
      .lt("created_at", end);

    if (quotaError) {
      logSocialPostActionError("Failed to check social image post quota", quotaError, {
        imageCount: imageFiles.length,
      });
      return INITIAL_ERROR_STATE;
    }

    if ((count ?? 0) >= IMAGE_POST_DAILY_LIMIT) {
      return {
        status: "error",
        messageKey: "validationFailed",
        fieldErrors: { images: "imagePostDailyLimit" },
        fieldErrorValues: { images: { limit: IMAGE_POST_DAILY_LIMIT } },
      };
    }
  }

  const uploadedImages: UploadedSocialPostImage[] = [];

  try {
    for (const file of imageFiles) {
      uploadedImages.push(await uploadSocialPostImage(user.id, file));
    }
  } catch (error) {
    logSocialPostActionError("Failed to upload social post images", error, {
      imageCount: imageFiles.length,
    });
    await rollbackUploadedImages(uploadedImages);

    return {
      ...INITIAL_ERROR_STATE,
      fieldErrors: { images: "uploadFailed" },
    };
  }

  const { data: post, error: postError } = await insertSocialPost(supabase, {
    user_id: user.id,
    caption: input.value.caption,
    description: input.value.description,
    image_layout: input.value.imageLayout,
    visibility: "public",
  });

  if (postError || !post) {
    logSocialPostActionError(
      "Failed to insert social post",
      postError ?? new Error("Insert social post returned no row."),
      {
        imageCount: imageFiles.length,
        supportingAnimeCount: input.value.supportingAnime.length,
      }
    );
    await rollbackUploadedImages(uploadedImages);
    return INITIAL_ERROR_STATE;
  }

  const postId = (post as { id: string }).id;
  const animeRows = [
    toAnimeRow(postId, input.value.primaryAnime, "primary", 0),
    ...input.value.supportingAnime.map((anime, index) =>
      toAnimeRow(postId, anime, "supporting", index + 1)
    ),
  ];

  const { error: animeError } = await supabase.from("social_post_anime").insert(animeRows);

  if (animeError) {
    logSocialPostActionError("Failed to insert social post anime rows", animeError, {
      postId,
      animeCount: animeRows.length,
    });
    await rollbackInsertedPost(supabase, postId);
    await rollbackUploadedImages(uploadedImages);
    return INITIAL_ERROR_STATE;
  }

  if (uploadedImages.length > 0) {
    const { error: imageError } = await supabase
      .from("social_post_images")
      .insert(uploadedImages.map((image, index) => toImageRow(postId, image, index)));

    if (imageError) {
      logSocialPostActionError("Failed to insert social post image rows", imageError, {
        postId,
        imageCount: uploadedImages.length,
      });
      await rollbackInsertedPost(supabase, postId);
      await rollbackUploadedImages(uploadedImages);
      return INITIAL_ERROR_STATE;
    }
  }

  const locale = getSafeLocale(formData);
  revalidatePath(`/${locale}/anime/${input.value.primaryAnime.anime_id}`);
  revalidatePath(`/${locale}/feed`);
  revalidatePath(`/${locale}/profile`);

  return {
    status: "success",
    messageKey: "published",
    fieldErrors: {},
    postId,
  };
}

export async function deleteSocialPostAction(postId: string): Promise<DeleteSocialPostActionState> {
  if (!UUID_PATTERN.test(postId)) {
    return {
      status: "error",
      messageKey: "deleteFailed",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      messageKey: "deleteLoginRequired",
    };
  }

  const { data: post, error: postError } = await supabase
    .from("social_posts")
    .select("id, social_post_images(storage_key)")
    .eq("id", postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    logDeleteSocialPostActionError("Failed to find owned social post", postError, {
      postId,
      userId: user.id,
    });

    return {
      status: "error",
      messageKey: "deleteNotAllowed",
    };
  }

  const { error: deleteError } = await supabase
    .from("social_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);

  if (deleteError) {
    logDeleteSocialPostActionError("Failed to delete social post", deleteError, {
      postId,
      userId: user.id,
    });

    return {
      status: "error",
      messageKey: "deleteFailed",
    };
  }

  const storageKeys = ((post as { social_post_images?: { storage_key: string | null }[] })
    .social_post_images ?? [])
    .map((image) => image.storage_key)
    .filter((storageKey): storageKey is string => Boolean(storageKey));

  try {
    await deleteSocialPostImages(storageKeys);
  } catch (error) {
    logDeleteSocialPostActionError("Failed to delete social post images from R2", error, {
      postId,
      imageCount: storageKeys.length,
    });
  }

  revalidatePath("/feed");
  revalidatePath("/profile");

  return {
    status: "success",
    messageKey: "deleted",
    postId,
  };
}
