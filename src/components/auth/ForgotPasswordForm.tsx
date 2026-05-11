"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { getAuthCallbackUrl } from "@/lib/site-url";

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
          <div className="w-20 h-20 rounded-full bg-[#f49e0b]/10 border border-[#f49e0b]/30 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-[#f49e0b]"
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
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-white"
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
          <p className="text-white font-semibold text-base">
            {t("resetLinkSent")}
          </p>
          <p className="text-[#9ca3af] text-sm mt-1.5">{t("resetLinkSentDesc")}</p>
          <p className="text-[#f49e0b] text-sm font-semibold mt-1">{email}</p>
        </div>

        <Link
          href="/login"
          className="mt-1 text-sm text-[#9ca3af] hover:text-white transition-colors flex items-center gap-1.5"
        >
          <svg
            className="w-3.5 h-3.5"
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
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <p className="text-[#9ca3af] text-sm -mt-1">{t("forgotPasswordDesc")}</p>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-semibold text-[#9ca3af]">
          {t("email")}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full bg-[#111118] border border-[#1a1a24] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f49e0b] transition-colors placeholder:text-[#4a4a5a]"
          placeholder="anime@example.com"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-[#f49e0b] hover:bg-[#d68a09] disabled:opacity-50 disabled:cursor-not-allowed text-[#0a0a0f] text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f] rounded-full animate-spin" />
            {t("sendResetLink")}
          </>
        ) : (
          t("sendResetLink")
        )}
      </button>

      <Link
        href="/login"
        className="text-center text-sm text-[#9ca3af] hover:text-white transition-colors flex items-center justify-center gap-1.5"
      >
        <svg
          className="w-3.5 h-3.5"
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
