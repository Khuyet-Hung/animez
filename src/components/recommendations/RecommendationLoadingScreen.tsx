import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import RecommendationLoading from "@/components/recommendations/RecommendationLoading";
import { cn } from "@/lib/cn";

interface RecommendationLoadingScreenProps {
  className?: string;
  contentAs?: "main" | "div";
}

export default function RecommendationLoadingScreen({
  className,
  contentAs = "main",
}: RecommendationLoadingScreenProps) {
  const Content = contentAs;

  return (
    <>
      <Navbar />
      <Content
        className={cn(
          "min-h-screen bg-bg px-4 py-8 pb-20 md:px-6 lg:pl-28 min-[1600px]:pl-6",
          className
        )}
      >
        <div className="mx-auto w-full max-w-5xl">
          <RecommendationLoading />
        </div>
      </Content>
      <Footer />
    </>
  );
}
