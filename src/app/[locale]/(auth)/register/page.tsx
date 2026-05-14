import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import RegisterForm from "@/components/auth/RegisterForm";
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
    path: "/register",
    title: t("register"),
    noIndex: true,
  });
}

export default function RegisterPage() {
  const t = useTranslations("auth");

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
          <p className="mt-1 text-sm text-fg-muted">{t("createAccount")}</p>
        </Link>

        {/* Card */}
        <AppPanel variant="muted" className="rounded-ui-xl p-8 shadow-2xl">
          <h2 className="mb-6 text-xl font-bold text-fg">{t("register")}</h2>
          <RegisterForm />
        </AppPanel>
      </div>
    </main>
  );
}
