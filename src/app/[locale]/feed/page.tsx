import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import SocialFeedPage from "@/components/social/feed/SocialFeedPage";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed - Animez",
};

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
