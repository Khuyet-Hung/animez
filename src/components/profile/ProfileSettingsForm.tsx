"use client";

import { useActionState, useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon, SaveIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { updateProfileAction } from "@/app/[locale]/profile/actions";
import type { ProfileSettingsActionState } from "@/app/[locale]/profile/actions";
import type { UserProfile } from "@/types/profile";

interface ProfileSettingsFormProps {
  profile: UserProfile;
  locale: string;
}

const INITIAL_PROFILE_SETTINGS_STATE: ProfileSettingsActionState = {
  status: "idle",
  messageKey: null,
  fieldErrors: {},
};

export default function ProfileSettingsForm({ profile, locale }: ProfileSettingsFormProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    INITIAL_PROFILE_SETTINGS_STATE
  );
  const [username, setUsername] = useState(profile.username);

  const publicUsername = state.profile?.username ?? username;
  const isPublic = state.profile?.is_public ?? profile.is_public;

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  function fieldError(name: keyof typeof state.fieldErrors) {
    const errorKey = state.fieldErrors?.[name];
    return errorKey ? <p className="text-xs font-semibold text-red-300">{t(errorKey)}</p> : null;
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="current_username" value={profile.username} />

      {state.messageKey && (
        <p
          className={`rounded border px-3 py-2 text-sm font-semibold ${
            state.status === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {t(state.messageKey)}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
            {t("username")}
          </span>
          <input
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="h-11 rounded border border-[#1a1a24] bg-[#111118] px-3 text-sm font-bold text-white outline-none transition-colors placeholder:text-[#5f6472] focus:border-[#f49e0b]"
            placeholder="anime-fan"
            required
          />
          {fieldError("username")}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
            {t("displayName")}
          </span>
          <input
            name="display_name"
            defaultValue={profile.display_name}
            className="h-11 rounded border border-[#1a1a24] bg-[#111118] px-3 text-sm font-bold text-white outline-none transition-colors placeholder:text-[#5f6472] focus:border-[#f49e0b]"
            required
          />
          {fieldError("display_name")}
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
          {t("avatarUrl")}
        </span>
        <input
          name="avatar_url"
          defaultValue={profile.avatar_url ?? ""}
          className="h-11 rounded border border-[#1a1a24] bg-[#111118] px-3 text-sm font-semibold text-white outline-none transition-colors placeholder:text-[#5f6472] focus:border-[#f49e0b]"
          placeholder="https://..."
        />
        {fieldError("avatar_url")}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
          {t("bio")}
        </span>
        <textarea
          name="bio"
          defaultValue={profile.bio}
          rows={4}
          maxLength={160}
          className="resize-none rounded border border-[#1a1a24] bg-[#111118] px-3 py-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-[#5f6472] focus:border-[#f49e0b]"
          placeholder={t("bioPlaceholder")}
        />
        {fieldError("bio")}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded bg-[#f49e0b] px-5 text-sm font-black text-[#0a0a0f] transition-colors hover:bg-[#d68a09] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <SaveIcon className="size-4" />
        {pending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
