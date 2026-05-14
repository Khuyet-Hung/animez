import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import RecommendationSessionPanel from "@/components/recommendations/RecommendationSessionPanel";
import { AppErrorState } from "@/components/ui";
import { getRecommendationSession } from "@/lib/anime-recommendations/actions";
import { createSeoMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

interface RecommendationsPageProps {
  params: Promise<{ locale: string }>;
}
export async function generateMetadata({ params }: RecommendationsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "recommendations" });

  return createSeoMetadata({
    locale,
    path: "/profile/recommendations",
    title: t("metadataTitle"),
    noIndex: true,
  });
}

export default async function RecommendationsPage({ params }: RecommendationsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("recommendations");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/profile/recommendations`);
  }

  const result = await getRecommendationSession();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-bg px-4 py-8 pb-20 md:px-6 lg:pl-28 min-[1600px]:pl-6">
        <div className="mx-auto w-full max-w-5xl">
          {result.status === "success" ? (
            <RecommendationSessionPanel initialView={result.view} locale={locale} />
          ) : (
            <AppErrorState
              title={t(`pageErrors.${result.messageKey}.title`)}
              description={t(`pageErrors.${result.messageKey}.description`)}
              className="mx-auto mt-10 max-w-xl"
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
