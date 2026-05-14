"use client";

import { useActionState, useEffect, useState } from "react";
import { SaveIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updateProfileAction } from "@/app/[locale]/profile/actions";
import type { ProfileSettingsActionState } from "@/app/[locale]/profile/actions";
import type { UserProfile } from "@/types/profile";
import { cn } from "@/lib/cn";
import { AppButton, AppInput, AppTextarea } from "@/components/ui";

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
      <input type="hidden" name="avatar_url" value={profile.avatar_url ?? ""} />
      <input type="hidden" name="is_public" value={isPublic ? "on" : "off"} />

      {state.messageKey && (
        <p
          className={cn(
            "rounded-ui-sm border px-3 py-2 text-sm font-semibold",
            state.status === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          )}
        >
          {t(state.messageKey)}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-normal text-fg-muted">
            {t("username")}
          </span>
          <AppInput
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="anime-fan"
            required
          />
          {fieldError("username")}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-normal text-fg-muted">
            {t("displayName")}
          </span>
          <AppInput
            name="display_name"
            defaultValue={profile.display_name}
            required
          />
          {fieldError("display_name")}
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-normal text-fg-muted">
          {t("bio")}
        </span>
        <AppTextarea
          name="bio"
          defaultValue={profile.bio}
          rows={4}
          maxLength={160}
          placeholder={t("bioPlaceholder")}
        />
        {fieldError("bio")}
      </label>

      <AppButton
        type="submit"
        isLoading={pending}
        leftIcon={<SaveIcon className="size-4" />}
      >
        {pending ? t("saving") : t("save")}
      </AppButton>
    </form>
  );
}
