import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LottieLoader from "@/components/common/LottieLoader";
import RecommendationLoading from "@/components/recommendations/RecommendationLoading";
import { getRecommendationProfileSummary } from "@/lib/anime-recommendations/actions";

export default async function RecommendationsLoadingPage() {
  const recommendationSummary = await getRecommendationProfileSummary();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0f] lg:pl-28 min-[1600px]:pl-6">
        {recommendationSummary.hasActiveSession ? <LottieLoader /> : <RecommendationLoading />}
      </main>
      <Footer />
    </>
  );
}
