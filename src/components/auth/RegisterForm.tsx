"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { getAuthCallbackUrl } from "@/lib/site-url";

export default function RegisterForm() {
  const t = useTranslations("auth");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
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
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim() || email.split("@")[0],
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Supabase returns no error but empty identities when email already exists
    if (data.user && data.user.identities?.length === 0) {
      setError(t("emailAlreadyExists"));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthCallbackUrl(),
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-center text-white font-semibold">{t("checkEmail")}</p>
        <p className="text-center text-sm text-[#9ca3af]">{email}</p>
        <Link
          href="/login"
          className="mt-2 text-sm text-[#f49e0b] hover:text-[#d68a09] font-semibold transition-colors"
        >
          {t("signInHere")}
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

      {/* Display Name */}
      <div className="flex flex-col gap-2">
        <label htmlFor="displayName" className="text-sm font-semibold text-[#9ca3af]">
          {t("displayName")}
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          className="w-full bg-[#111118] border border-[#1a1a24] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f49e0b] transition-colors placeholder:text-[#4a4a5a]"
          placeholder={t("displayNamePlaceholder")}
        />
      </div>

      {/* Email */}
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

      {/* Password */}
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-semibold text-[#9ca3af]">
          {t("password")}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full bg-[#111118] border border-[#1a1a24] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f49e0b] transition-colors placeholder:text-[#4a4a5a]"
          placeholder="••••••••"
        />
      </div>

      {/* Confirm Password */}
      <div className="flex flex-col gap-2">
        <label htmlFor="confirmPassword" className="text-sm font-semibold text-[#9ca3af]">
          {t("confirmPassword")}
        </label>
        <input
          id="confirmPassword"
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
            {t("registerButton")}
          </>
        ) : (
          t("registerButton")
        )}
      </button>

      <div className="relative flex items-center py-2">
        <div className="grow border-t border-border-dark"></div>
        <span className="shrink-0 mx-4 text-[#4a4a5a] text-xs font-semibold uppercase">Or</span>
        <div className="grow border-t border-border-dark"></div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full h-11 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {t("loginWithGoogle")}
      </button>

      <p className="text-center text-sm text-text-secondary">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="text-primary hover:text-primary-hover font-semibold transition-colors"
        >
          {t("signInHere")}
        </Link>
      </p>
    </form>
  );
}
