"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getSocialPostImageFiles,
  SOCIAL_POST_CAPTION_MAX_LENGTH,
  validateCreateSocialPostInput,
  validateSocialPostImages,
} from "@/lib/social/validators";
import {
  deleteSocialPostImages,
  uploadSocialPostImage,
  type UploadedSocialPostImage,
} from "@/lib/social/r2";
import {
  moderateSocialPostText,
  moderateSocialText,
  type SocialTextModerationResult,
} from "@/lib/social/moderation";
import type {
  CreateSocialPostCommentActionState,
  CreateSocialPostActionState,
  DeleteSocialPostActionState,
  ShareSocialPostActionState,
  SocialPostAnimeDraft,
  ToggleSocialPostLikeActionState,
  UpdateSocialPostActionState,
} from "@/types/social";

const INITIAL_ERROR_STATE: CreateSocialPostActionState = {
  status: "error",
  messageKey: "createFailed",
  fieldErrors: {},
};

const INITIAL_UPDATE_ERROR_STATE: UpdateSocialPostActionState = {
  status: "error",
  messageKey: "updateFailed",
  fieldErrors: {},
};

const IMAGE_POST_DAILY_LIMIT = 10;
const COMMENT_MAX_LENGTH = 1000;
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

function getModerationFieldErrors(result: SocialTextModerationResult): Partial<Record<"caption" | "description", string>> {
  if (result.ok) return {};

  return result.violations.reduce<Partial<Record<"caption" | "description", string>>>((errors, violation) => {
    if (violation.field === "caption" || violation.field === "description") {
      errors[violation.field] = "moderationBlocked";
    }

    return errors;
  }, {});
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

function logUpdateSocialPostActionError(stage: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[updateSocialPostAction] ${stage}`, {
    error,
    ...context,
  });
}

function logToggleSocialPostLikeActionError(stage: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[toggleSocialPostLikeAction] ${stage}`, {
    error,
    ...context,
  });
}

function logCreateSocialPostCommentActionError(stage: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[createSocialPostCommentAction] ${stage}`, {
    error,
    ...context,
  });
}

function logShareSocialPostActionError(stage: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[shareSocialPostAction] ${stage}`, {
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

async function updateSocialPost(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  payload: Omit<SocialPostInsertPayload, "user_id" | "visibility">
) {
  const result = await supabase
    .from("social_posts")
    .update(payload)
    .eq("id", postId)
    .eq("user_id", userId);

  if (!isMissingImageLayoutColumnError(result.error)) return result;

  logUpdateSocialPostActionError("social_posts.image_layout column is missing; retrying legacy update", result.error, {
    postId,
  });

  const legacyPayload: Omit<typeof payload, "image_layout"> = {
    caption: payload.caption,
    description: payload.description,
  };

  return supabase
    .from("social_posts")
    .update(legacyPayload)
    .eq("id", postId)
    .eq("user_id", userId);
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

  const moderationResult = moderateSocialPostText({
    caption: input.value.caption,
    description: input.value.description,
  });

  if (!moderationResult.ok) {
    return {
      status: "error",
      messageKey: "validationFailed",
      fieldErrors: getModerationFieldErrors(moderationResult),
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

export async function updateSocialPostAction(
  _previousState: UpdateSocialPostActionState,
  formData: FormData
): Promise<UpdateSocialPostActionState> {
  const postId = getTextValue(formData, "post_id");
  if (!UUID_PATTERN.test(postId)) {
    return INITIAL_UPDATE_ERROR_STATE;
  }

  const input = validateCreateSocialPostInput(formData);

  if (!input.ok) {
    return {
      status: "error",
      messageKey: "validationFailed",
      fieldErrors: input.errors,
    };
  }

  const moderationResult = moderateSocialPostText({
    caption: input.value.caption,
    description: input.value.description,
  });

  if (!moderationResult.ok) {
    return {
      status: "error",
      messageKey: "validationFailed",
      fieldErrors: getModerationFieldErrors(moderationResult),
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

  const { data: post, error: postError } = await supabase
    .from("social_posts")
    .select("id, social_post_anime(anime_id, role)")
    .eq("id", postId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (postError || !post) {
    logUpdateSocialPostActionError("Failed to find owned social post", postError, {
      postId,
      userId: user.id,
    });

    return {
      status: "error",
      messageKey: "updateNotAllowed",
      fieldErrors: {},
    };
  }

  const { error: updateError } = await updateSocialPost(supabase, postId, user.id, {
    caption: input.value.caption,
    description: input.value.description,
    image_layout: input.value.imageLayout,
  });

  if (updateError) {
    logUpdateSocialPostActionError("Failed to update social post", updateError, {
      postId,
      userId: user.id,
    });

    return INITIAL_UPDATE_ERROR_STATE;
  }

  const animeRows = [
    toAnimeRow(postId, input.value.primaryAnime, "primary", 0),
    ...input.value.supportingAnime.map((anime, index) =>
      toAnimeRow(postId, anime, "supporting", index + 1)
    ),
  ];

  const { error: deleteAnimeError } = await supabase
    .from("social_post_anime")
    .delete()
    .eq("post_id", postId);

  if (deleteAnimeError) {
    logUpdateSocialPostActionError("Failed to delete existing social post anime rows", deleteAnimeError, {
      postId,
      animeCount: animeRows.length,
    });

    return INITIAL_UPDATE_ERROR_STATE;
  }

  const { error: animeError } = await supabase.from("social_post_anime").insert(animeRows);

  if (animeError) {
    logUpdateSocialPostActionError("Failed to insert updated social post anime rows", animeError, {
      postId,
      animeCount: animeRows.length,
    });

    return INITIAL_UPDATE_ERROR_STATE;
  }

  const locale = getSafeLocale(formData);
  const previousPrimaryAnime = (
    (post as { social_post_anime?: { anime_id: number | null; role: string | null }[] }).social_post_anime ?? []
  ).find((anime) => anime.role === "primary")?.anime_id;

  if (previousPrimaryAnime) {
    revalidatePath(`/${locale}/anime/${previousPrimaryAnime}`);
  }

  revalidatePath(`/${locale}/anime/${input.value.primaryAnime.anime_id}`);
  revalidatePath(`/${locale}/feed`);
  revalidatePath(`/${locale}/profile`);

  return {
    status: "success",
    messageKey: "updated",
    fieldErrors: {},
    postId,
  };
}

export async function updateSocialPostShareAction(
  postId: string,
  caption = ""
): Promise<UpdateSocialPostActionState> {
  if (!UUID_PATTERN.test(postId)) {
    return INITIAL_UPDATE_ERROR_STATE;
  }

  const trimmedCaption = caption.trim();
  if (trimmedCaption.length > SOCIAL_POST_CAPTION_MAX_LENGTH) {
    return {
      status: "error",
      messageKey: "shareCaptionTooLong",
      fieldErrors: { caption: "captionTooLong" },
    };
  }

  if (!moderateSocialText(trimmedCaption, "caption").ok) {
    return {
      status: "error",
      messageKey: "shareModerationBlocked",
      fieldErrors: { caption: "moderationBlocked" },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      messageKey: "shareLoginRequired",
      fieldErrors: {},
    };
  }

  const { data: post, error: postError } = await supabase
    .from("social_posts")
    .select("id, shared_post_id")
    .eq("id", postId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (postError || !post || !(post as { shared_post_id: string | null }).shared_post_id) {
    logUpdateSocialPostActionError("Failed to find owned shared social post", postError, {
      postId,
      userId: user.id,
    });

    return {
      status: "error",
      messageKey: "updateNotAllowed",
      fieldErrors: {},
    };
  }

  const { error: updateError } = await supabase
    .from("social_posts")
    .update({ caption: trimmedCaption })
    .eq("id", postId)
    .eq("user_id", user.id);

  if (updateError) {
    logUpdateSocialPostActionError("Failed to update shared social post caption", updateError, {
      postId,
      userId: user.id,
    });

    return INITIAL_UPDATE_ERROR_STATE;
  }

  revalidatePath("/feed");
  revalidatePath("/profile");

  return {
    status: "success",
    messageKey: "updated",
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

export async function toggleSocialPostLikeAction(postId: string): Promise<ToggleSocialPostLikeActionState> {
  if (!UUID_PATTERN.test(postId)) {
    return {
      status: "error",
      messageKey: "likeFailed",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      messageKey: "likeLoginRequired",
    };
  }

  const { data: existingLike, error: existingLikeError } = await supabase
    .from("social_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingLikeError) {
    logToggleSocialPostLikeActionError("Failed to read existing social post like", existingLikeError, {
      postId,
      userId: user.id,
    });

    return {
      status: "error",
      messageKey: "likeFailed",
    };
  }

  const nextLiked = !existingLike;
  const mutation = nextLiked
    ? supabase.from("social_post_likes").insert({ post_id: postId, user_id: user.id })
    : supabase.from("social_post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  const { error: mutationError } = await mutation;

  if (mutationError) {
    logToggleSocialPostLikeActionError("Failed to toggle social post like", mutationError, {
      postId,
      userId: user.id,
      nextLiked,
    });

    return {
      status: "error",
      messageKey: "likeFailed",
    };
  }

  const { count, error: countError } = await supabase
    .from("social_post_likes")
    .select("post_id", { count: "exact", head: true })
    .eq("post_id", postId);

  if (countError) {
    logToggleSocialPostLikeActionError("Failed to count social post likes", countError, {
      postId,
      userId: user.id,
    });
  }

  revalidatePath("/feed");
  revalidatePath("/profile");

  return {
    status: "success",
    messageKey: nextLiked ? "liked" : "unliked",
    postId,
    liked: nextLiked,
    likeCount: count ?? 0,
  };
}

export async function shareSocialPostAction(postId: string, caption = ""): Promise<ShareSocialPostActionState> {
  if (!UUID_PATTERN.test(postId)) {
    return {
      status: "error",
      messageKey: "shareFailed",
    };
  }

  const trimmedCaption = caption.trim();
  if (trimmedCaption.length > SOCIAL_POST_CAPTION_MAX_LENGTH) {
    return {
      status: "error",
      messageKey: "shareCaptionTooLong",
    };
  }

  if (!moderateSocialText(trimmedCaption, "caption").ok) {
    return {
      status: "error",
      messageKey: "shareModerationBlocked",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      messageKey: "shareLoginRequired",
    };
  }

  const { data: post, error: postError } = await supabase
    .from("social_posts")
    .select("id, user_id, shared_post_id")
    .eq("id", postId)
    .eq("visibility", "public")
    .is("deleted_at", null)
    .maybeSingle();

  if (postError || !post) {
    logShareSocialPostActionError("Failed to find readable social post", postError, {
      postId,
      userId: user.id,
    });

    return {
      status: "error",
      messageKey: "shareFailed",
    };
  }

  const sourcePost = post as { id: string; user_id: string; shared_post_id: string | null };
  const originalPostId = sourcePost.shared_post_id ?? sourcePost.id;
  const { data: originalPost, error: originalPostError } = await supabase
    .from("social_posts")
    .select("id, user_id")
    .eq("id", originalPostId)
    .eq("visibility", "public")
    .is("deleted_at", null)
    .maybeSingle();

  if (originalPostError || !originalPost) {
    logShareSocialPostActionError("Failed to find original social post", originalPostError, {
      postId,
      originalPostId,
      userId: user.id,
    });

    return {
      status: "error",
      messageKey: "shareFailed",
    };
  }

  if ((originalPost as { user_id: string }).user_id === user.id) {
    return {
      status: "error",
      messageKey: "shareOwnPostNotAllowed",
    };
  }

  const { data: sharedPost, error: shareError } = await supabase
    .from("social_posts")
    .insert({
      user_id: user.id,
      caption: trimmedCaption,
      description: "",
      visibility: "public",
      shared_post_id: originalPostId,
    })
    .select("id")
    .single();

  if (shareError || !sharedPost) {
    logShareSocialPostActionError("Failed to insert shared social post", shareError, {
      postId,
      originalPostId,
      userId: user.id,
    });

    return {
      status: "error",
      messageKey: "shareFailed",
    };
  }

  revalidatePath("/feed");
  revalidatePath("/profile");

  return {
    status: "success",
    messageKey: "shared",
    postId: (sharedPost as { id: string }).id,
  };
}

export async function createSocialPostCommentAction(
  postId: string,
  body: string,
  parentId?: string | null
): Promise<CreateSocialPostCommentActionState> {
  if (!UUID_PATTERN.test(postId) || (parentId && !UUID_PATTERN.test(parentId))) {
    return {
      status: "error",
      messageKey: "commentFailed",
    };
  }

  const trimmedBody = body.trim();
  if (trimmedBody.length === 0) {
    return {
      status: "error",
      messageKey: "commentRequired",
    };
  }

  if (trimmedBody.length > COMMENT_MAX_LENGTH) {
    return {
      status: "error",
      messageKey: "commentTooLong",
    };
  }

  if (!moderateSocialText(trimmedBody, "body").ok) {
    return {
      status: "error",
      messageKey: "commentModerationBlocked",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      messageKey: "commentLoginRequired",
    };
  }

  const { data: post, error: postError } = await supabase
    .from("social_posts")
    .select("id")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (postError || !post) {
    logCreateSocialPostCommentActionError("Failed to find readable social post", postError, {
      postId,
      userId: user.id,
    });

    return {
      status: "error",
      messageKey: "commentFailed",
    };
  }

  if (parentId) {
    const { data: parentComment, error: parentError } = await supabase
      .from("social_post_comments")
      .select("id, post_id, parent_id")
      .eq("id", parentId)
      .eq("post_id", postId)
      .is("deleted_at", null)
      .maybeSingle();

    if (parentError || !parentComment || parentComment.parent_id) {
      logCreateSocialPostCommentActionError("Invalid parent comment", parentError, {
        postId,
        parentId,
        userId: user.id,
      });

      return {
        status: "error",
        messageKey: "commentFailed",
      };
    }
  }

  const { data: comment, error: commentError } = await supabase
    .from("social_post_comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      parent_id: parentId ?? null,
      body: trimmedBody,
    })
    .select("id")
    .single();

  if (commentError || !comment) {
    logCreateSocialPostCommentActionError("Failed to insert social post comment", commentError, {
      postId,
      parentId,
      userId: user.id,
    });

    return {
      status: "error",
      messageKey: "commentFailed",
    };
  }

  revalidatePath("/feed");
  revalidatePath("/profile");

  return {
    status: "success",
    messageKey: "commentCreated",
    postId,
    commentId: (comment as { id: string }).id,
  };
}
