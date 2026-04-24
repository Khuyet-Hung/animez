"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";

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
        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-400"
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
          <p className="text-white font-semibold text-base">
            {t("resetPasswordSuccess")}
          </p>
          <p className="text-[#9ca3af] text-sm mt-1.5">
            {t("backToLogin")}...
          </p>
        </div>
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

      <p className="text-[#9ca3af] text-sm -mt-1">{t("resetPasswordDesc")}</p>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="newPassword"
          className="text-sm font-semibold text-[#9ca3af]"
        >
          {t("newPassword")}
        </label>
        <input
          id="newPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full bg-[#111118] border border-[#1a1a24] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f49e0b] transition-colors placeholder:text-[#4a4a5a]"
          placeholder="••••••••"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="confirmNewPassword"
          className="text-sm font-semibold text-[#9ca3af]"
        >
          {t("confirmNewPassword")}
        </label>
        <input
          id="confirmNewPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full bg-[#111118] border border-[#1a1a24] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f49e0b] transition-colors placeholder:text-[#4a4a5a]"
          placeholder="••••••••"
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
            {t("resetPasswordButton")}
          </>
        ) : (
          t("resetPasswordButton")
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
