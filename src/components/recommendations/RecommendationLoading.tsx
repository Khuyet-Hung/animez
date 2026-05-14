"use client";

import Lottie from "lottie-react";
import { useTranslations } from "next-intl";
import analysisAnimation from "../../../public/animations/analysis.json";

export default function RecommendationLoading() {
  const t = useTranslations("recommendations");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-bg px-4 text-center">
      <div className="h-56 w-56 sm:h-72 sm:w-72">
        <Lottie animationData={analysisAnimation} loop autoplay />
      </div>
      <p className="mt-2 text-sm font-bold uppercase tracking-normal text-brand">
        {t("loadingTitle")}
      </p>
      <p className="mt-2 max-w-md text-sm leading-6 text-fg-muted">
        {t("loadingDescription")}
      </p>
    </div>
  );
}
