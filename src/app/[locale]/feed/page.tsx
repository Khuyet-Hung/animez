import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import SocialFeedPage from "@/components/social/feed/SocialFeedPage";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "feed" });

  return createSeoMetadata({
    locale,
    path: "/feed",
    title: t("title"),
    description: t("description"),
  });
}

export default async function FeedRoutePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <SocialFeedPage />
      <Footer />
    </>
  );
}
