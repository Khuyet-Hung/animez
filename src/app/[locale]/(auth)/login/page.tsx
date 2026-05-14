import { getTranslations } from "next-intl/server";
import LoginForm from "@/components/auth/LoginForm";
import { Link } from "@/i18n/navigation";
import AppLogo from "@/components/common/AppLogo";
import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo";
import { AppPanel } from "@/components/ui/AppPanel";

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
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/4 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-ui-pill bg-brand/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-8 flex flex-col items-center transition-opacity hover:opacity-80">
          <AppLogo className="mb-4 h-24 w-36" priority sizes="144px" />
          <p className="mt-1 text-sm text-fg-muted">{t("welcome")}</p>
        </Link>

        {/* Card */}
        <AppPanel variant="muted" className="rounded-ui-xl p-8 shadow-2xl">
          <h2 className="mb-6 text-xl font-bold text-fg">{t("login")}</h2>
          {error === "invalid_reset_link" && (
            <div className="mb-5 rounded-ui-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {t("resetPasswordError")}
            </div>
          )}
          <LoginForm nextPath={nextPath} />
        </AppPanel>
      </div>
    </main>
  );
}
