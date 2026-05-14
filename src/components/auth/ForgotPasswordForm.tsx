"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { getAuthCallbackUrl } from "@/lib/site-url";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";

export default function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: getAuthCallbackUrl("/reset-password"),
      }
    );

    setLoading(false);

    if (resetError) {
      setError(t("resetPasswordError"));
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-5 py-4">
        {/* Success icon */}
        <div className="relative">
          <div className="flex size-20 items-center justify-center rounded-ui-pill border border-brand/30 bg-brand/10">
            <svg
              className="size-10 text-brand"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-ui-pill bg-green-500">
            <svg
              className="size-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <p className="text-base font-semibold text-fg">
            {t("resetLinkSent")}
          </p>
          <p className="mt-1.5 text-sm text-fg-muted">{t("resetLinkSentDesc")}</p>
          <p className="mt-1 text-sm font-semibold text-brand">{email}</p>
        </div>

        <Link
          href="/login"
          className="mt-1 flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
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

      <p className="-mt-1 text-sm text-fg-muted">{t("forgotPasswordDesc")}</p>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-semibold text-fg-muted">
          {t("email")}
        </label>
        <AppInput
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="anime@example.com"
        />
      </div>

      <AppButton
        type="submit"
        fullWidth
        isLoading={loading}
      >
        {t("sendResetLink")}
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
