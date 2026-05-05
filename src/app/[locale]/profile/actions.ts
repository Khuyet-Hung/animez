"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProfileInput } from "@/lib/profile/validators";
import type { ProfileFieldErrorKey, ProfileFieldErrors, ProfileFormInput } from "@/types/profile";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_FILE_SIZE = 3 * 1024 * 1024;
const AVATAR_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface ProfileSettingsActionState {
  status: "idle" | "success" | "error";
  messageKey: string | null;
  fieldErrors: ProfileFieldErrors;
  profile?: {
    username: string;
    is_public: boolean;
  };
}

export interface ProfileVisibilityActionResult {
  status: "success" | "error";
  messageKey: string;
  profile?: {
    username: string;
    is_public: boolean;
  };
}

export interface ProfileAvatarActionState {
  status: "idle" | "success" | "error";
  messageKey: string | null;
  fieldErrors: Pick<ProfileFieldErrors, "avatar_url">;
  avatarUrl?: string | null;
}

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getSafeLocale(formData: FormData) {
  const locale = getTextValue(formData, "locale");
  return /^[a-z]{2}$/.test(locale) ? locale : "vi";
}

function getAvatarFile(formData: FormData) {
  const file = formData.get("avatar_file");
  return file instanceof File && file.size > 0 ? file : null;
}

function validateAvatarFile(file: File): ProfileFieldErrorKey | null {
  if (!AVATAR_MIME_EXTENSIONS[file.type]) {
    return "invalidAvatarFile";
  }

  if (file.size > MAX_AVATAR_FILE_SIZE) {
    return "avatarTooLarge";
  }

  return null;
}

function getAvatarStoragePath(avatarUrl: string, userId: string) {
  if (!avatarUrl) return null;

  try {
    const url = new URL(avatarUrl);
    const publicPath = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    const pathIndex = url.pathname.indexOf(publicPath);

    if (pathIndex === -1) return null;

    const storagePath = decodeURIComponent(url.pathname.slice(pathIndex + publicPath.length));
    return storagePath.startsWith(`${userId}/`) ? storagePath : null;
  } catch {
    return null;
  }
}

async function uploadAvatarFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File
) {
  const extension = AVATAR_MIME_EXTENSIONS[file.type];
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  return { path, publicUrl };
}

export async function updateProfileAction(
  _previousState: ProfileSettingsActionState,
  formData: FormData
): Promise<ProfileSettingsActionState> {
  const currentAvatarUrl = getTextValue(formData, "avatar_url");
  const input: ProfileFormInput = {
    username: getTextValue(formData, "username"),
    display_name: getTextValue(formData, "display_name"),
    avatar_url: currentAvatarUrl,
    bio: getTextValue(formData, "bio"),
    is_public: formData.get("is_public") === "on",
  };
  const validation = validateProfileInput(input);

  if (!validation.ok) {
    return {
      status: "error",
      messageKey: "updateFailed",
      fieldErrors: validation.errors,
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

  const avatarFile = getAvatarFile(formData);
  let nextAvatarUrl = validation.value.avatar_url;
  let uploadedAvatarPath: string | null = null;

  if (avatarFile) {
    const avatarError = validateAvatarFile(avatarFile);

    if (avatarError) {
      return {
        status: "error",
        messageKey: "updateFailed",
        fieldErrors: { avatar_url: avatarError },
      };
    }

    const uploadResult = await uploadAvatarFile(supabase, user.id, avatarFile);

    if (!uploadResult) {
      return {
        status: "error",
        messageKey: "updateFailed",
        fieldErrors: { avatar_url: "avatarUploadFailed" },
      };
    }

    uploadedAvatarPath = uploadResult.path;
    nextAvatarUrl = uploadResult.publicUrl;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      username: validation.value.username,
      display_name: validation.value.display_name,
      avatar_url: nextAvatarUrl || null,
      bio: validation.value.bio,
      is_public: validation.value.is_public,
    })
    .eq("id", user.id)
    .select("username,is_public")
    .single();

  if (error) {
    if (uploadedAvatarPath) {
      await supabase.storage.from(AVATAR_BUCKET).remove([uploadedAvatarPath]);
    }

    return {
      status: "error",
      messageKey: error.code === "23505" ? "usernameTaken" : "updateFailed",
      fieldErrors: error.code === "23505" ? { username: "usernameTaken" } : {},
    };
  }

  if (uploadedAvatarPath) {
    const previousAvatarPath = getAvatarStoragePath(currentAvatarUrl, user.id);
    if (previousAvatarPath && previousAvatarPath !== uploadedAvatarPath) {
      await supabase.storage.from(AVATAR_BUCKET).remove([previousAvatarPath]);
    }
  }

  const locale = getSafeLocale(formData);
  const previousUsername = getTextValue(formData, "current_username");
  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/u/${validation.value.username}`);
  if (previousUsername && previousUsername !== validation.value.username) {
    revalidatePath(`/${locale}/u/${previousUsername}`);
  }

  return {
    status: "success",
    messageKey: "saved",
    fieldErrors: {},
    profile: data as { username: string; is_public: boolean },
  };
}

export async function updateProfileVisibilityAction(
  isPublic: boolean,
  locale: string
): Promise<ProfileVisibilityActionResult> {
  const safeLocale = /^[a-z]{2}$/.test(locale) ? locale : "vi";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      messageKey: "loginRequired",
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ is_public: isPublic })
    .eq("id", user.id)
    .select("username,is_public")
    .single();

  if (error) {
    return {
      status: "error",
      messageKey: "updateFailed",
    };
  }

  const profile = data as { username: string; is_public: boolean };
  revalidatePath(`/${safeLocale}/profile`);
  revalidatePath(`/${safeLocale}/u/${profile.username}`);

  return {
    status: "success",
    messageKey: "saved",
    profile,
  };
}

export async function updateProfileAvatarAction(
  _previousState: ProfileAvatarActionState,
  formData: FormData
): Promise<ProfileAvatarActionState> {
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

  const avatarFile = getAvatarFile(formData);

  if (!avatarFile) {
    return {
      status: "error",
      messageKey: "updateFailed",
      fieldErrors: { avatar_url: "invalidAvatarFile" },
    };
  }

  const avatarError = validateAvatarFile(avatarFile);

  if (avatarError) {
    return {
      status: "error",
      messageKey: "updateFailed",
      fieldErrors: { avatar_url: avatarError },
    };
  }

  const uploadResult = await uploadAvatarFile(supabase, user.id, avatarFile);

  if (!uploadResult) {
    return {
      status: "error",
      messageKey: "updateFailed",
      fieldErrors: { avatar_url: "avatarUploadFailed" },
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: uploadResult.publicUrl })
    .eq("id", user.id)
    .select("username,avatar_url")
    .single();

  if (error) {
    await supabase.storage.from(AVATAR_BUCKET).remove([uploadResult.path]);

    return {
      status: "error",
      messageKey: "updateFailed",
      fieldErrors: { avatar_url: "avatarUploadFailed" },
    };
  }

  const currentAvatarUrl = getTextValue(formData, "current_avatar_url");
  const previousAvatarPath = getAvatarStoragePath(currentAvatarUrl, user.id);
  if (previousAvatarPath && previousAvatarPath !== uploadResult.path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previousAvatarPath]);
  }

  const locale = getSafeLocale(formData);
  const profile = data as { username: string; avatar_url: string | null };
  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/u/${profile.username}`);

  return {
    status: "success",
    messageKey: "saved",
    fieldErrors: {},
    avatarUrl: profile.avatar_url,
  };
}
