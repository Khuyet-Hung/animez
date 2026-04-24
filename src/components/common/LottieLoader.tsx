"use client";

import Lottie from "lottie-react";
import loadingAnimation from "../../../public/animations/Loading.json";

export default function LottieLoader() {
  return (
    <div className="lottie-loader-overlay">
      <Lottie
        animationData={loadingAnimation}
        loop
        autoplay
        style={{ width: 380, height: 380 }}
      />
    </div>
  );
}
