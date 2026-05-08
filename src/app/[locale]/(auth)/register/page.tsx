import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import RegisterForm from "@/components/auth/RegisterForm";
import { Link } from "@/i18n/navigation";
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
    path: "/register",
    title: t("register"),
    noIndex: true,
  });
}

export default function RegisterPage() {
  const t = useTranslations("auth");

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#f49e0b]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center mb-8 hover:opacity-80 transition-opacity">
          <div className="size-12 text-[#f49e0b] mb-4">
            <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-white text-3xl font-black tracking-tight">ANIMEZ</h1>
          <p className="text-[#9ca3af] text-sm mt-1">{t("createAccount")}</p>
        </Link>

        {/* Card */}
        <div className="bg-[#0d0d14] border border-[#1a1a24] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-bold mb-6">{t("register")}</h2>
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
