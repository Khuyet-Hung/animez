import { getTranslations } from "next-intl/server";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Link } from "@/i18n/navigation";
import AppLogo from "@/components/common/AppLogo";
import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo";

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
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#f49e0b]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center mb-8 hover:opacity-80 transition-opacity">
          <AppLogo className="h-24 w-36" priority sizes="144px" />
        </Link>

        {/* Card */}
        <div className="bg-[#0d0d14] border border-[#1a1a24] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-bold mb-6">{t("forgotPasswordTitle")}</h2>
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
