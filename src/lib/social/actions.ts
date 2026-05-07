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
import type { CreateSocialPostActionState, SocialPostAnimeDraft } from "@/types/social";

const INITIAL_ERROR_STATE: CreateSocialPostActionState = {
  status: "error",
  messageKey: "createFailed",
  fieldErrors: {},
};

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getSafeLocale(formData: FormData) {
  const locale = getTextValue(formData, "locale");
  return /^[a-z]{2}$/.test(locale) ? locale : "vi";
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
    console.error("Failed to rollback uploaded social post images", error);
  }
}

export async function createSocialPostAction(
  _previousState: CreateSocialPostActionState,
  formData: FormData
): Promise<CreateSocialPostActionState> {
  const input = validateCreateSocialPostInput(formData);
  const imageFiles = getSocialPostImageFiles(formData);
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

  const uploadedImages: UploadedSocialPostImage[] = [];

  try {
    for (const file of imageFiles) {
      uploadedImages.push(await uploadSocialPostImage(user.id, file));
    }
  } catch (error) {
    console.error("Failed to upload social post images", error);
    await rollbackUploadedImages(uploadedImages);

    return {
      ...INITIAL_ERROR_STATE,
      fieldErrors: { images: "uploadFailed" },
    };
  }

  const { data: post, error: postError } = await supabase
    .from("social_posts")
    .insert({
      user_id: user.id,
      caption: input.value.caption,
      description: input.value.description,
      visibility: "public",
    })
    .select("id")
    .single();

  if (postError || !post) {
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
    await supabase.from("social_posts").delete().eq("id", postId);
    await rollbackUploadedImages(uploadedImages);
    return INITIAL_ERROR_STATE;
  }

  if (uploadedImages.length > 0) {
    const { error: imageError } = await supabase
      .from("social_post_images")
      .insert(uploadedImages.map((image, index) => toImageRow(postId, image, index)));

    if (imageError) {
      await supabase.from("social_posts").delete().eq("id", postId);
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
