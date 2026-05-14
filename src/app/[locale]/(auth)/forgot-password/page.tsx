import { getTranslations } from "next-intl/server";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Link } from "@/i18n/navigation";
import AppLogo from "@/components/common/AppLogo";
import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo";
import { AppPanel } from "@/components/ui/AppPanel";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return createSeoMetadata({
    locale,
    path: "/forgot-password",
    title: t("forgotPasswordTitle"),
    noIndex: true,
  });
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/4 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-ui-pill bg-brand/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-8 flex flex-col items-center transition-opacity hover:opacity-80">
          <AppLogo className="h-24 w-36" priority sizes="144px" />
        </Link>

        {/* Card */}
        <AppPanel variant="muted" className="rounded-ui-xl p-8 shadow-2xl">
          <h2 className="mb-6 text-xl font-bold text-fg">{t("forgotPasswordTitle")}</h2>
          <ForgotPasswordForm />
        </AppPanel>
      </div>
    </main>
  );
}
