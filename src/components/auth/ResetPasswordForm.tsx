"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";

export default function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(t("resetPasswordError"));
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="flex size-20 items-center justify-center rounded-ui-pill border border-green-500/30 bg-green-500/10">
          <svg
            className="size-10 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-fg">
            {t("resetPasswordSuccess")}
          </p>
          <p className="mt-1.5 text-sm text-fg-muted">
            {t("backToLogin")}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-ui-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <p className="-mt-1 text-sm text-fg-muted">{t("resetPasswordDesc")}</p>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="newPassword"
          className="text-sm font-semibold text-fg-muted"
        >
          {t("newPassword")}
        </label>
        <AppInput
          id="newPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="confirmNewPassword"
          className="text-sm font-semibold text-fg-muted"
        >
          {t("confirmNewPassword")}
        </label>
        <AppInput
          id="confirmNewPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </div>

      <AppButton
        type="submit"
        fullWidth
        isLoading={loading}
      >
        {t("resetPasswordButton")}
      </AppButton>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-center text-sm text-fg-muted transition-colors hover:text-fg"
      >
        <svg
          className="size-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        {t("backToLogin")}
      </Link>
    </form>
  );
}
