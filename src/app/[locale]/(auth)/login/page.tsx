import { getTranslations } from "next-intl/server";
import LoginForm from "@/components/auth/LoginForm";
import { Link } from "@/i18n/navigation";
import AppLogo from "@/components/common/AppLogo";
import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return createSeoMetadata({
    locale,
    path: "/login",
    title: t("login"),
    noIndex: true,
  });
}

export default async function LoginPage({ searchParams }: Props) {
  const t = await getTranslations("auth");
  const { error, next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  const nextPath = safeNext.replace(/^\/(en|vi|ja)(?=\/|$)/, "") || "/";

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#f49e0b]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center mb-8 hover:opacity-80 transition-opacity">
          <AppLogo className="mb-4 h-24 w-36" priority sizes="144px" />
          <p className="text-[#9ca3af] text-sm mt-1">{t("welcome")}</p>
        </Link>

        {/* Card */}
        <div className="bg-[#0d0d14] border border-[#1a1a24] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-bold mb-6">{t("login")}</h2>
          {error === "invalid_reset_link" && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {t("resetPasswordError")}
            </div>
          )}
          <LoginForm nextPath={nextPath} />
        </div>
      </div>
    </main>
  );
}
