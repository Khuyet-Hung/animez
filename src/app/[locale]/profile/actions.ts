"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProfileInput } from "@/lib/profile/validators";
import type { ProfileFieldErrors, ProfileFormInput } from "@/types/profile";

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

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getSafeLocale(formData: FormData) {
  const locale = getTextValue(formData, "locale");
  return /^[a-z]{2}$/.test(locale) ? locale : "vi";
}

export async function updateProfileAction(
  _previousState: ProfileSettingsActionState,
  formData: FormData
): Promise<ProfileSettingsActionState> {
  const input: ProfileFormInput = {
    username: getTextValue(formData, "username"),
    display_name: getTextValue(formData, "display_name"),
    avatar_url: getTextValue(formData, "avatar_url"),
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

  const { data, error } = await supabase
    .from("profiles")
    .update({
      username: validation.value.username,
      display_name: validation.value.display_name,
      avatar_url: validation.value.avatar_url || null,
      bio: validation.value.bio,
      is_public: validation.value.is_public,
    })
    .eq("id", user.id)
    .select("username,is_public")
    .single();

  if (error) {
    return {
      status: "error",
      messageKey: error.code === "23505" ? "usernameTaken" : "updateFailed",
      fieldErrors: error.code === "23505" ? { username: "usernameTaken" } : {},
    };
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
