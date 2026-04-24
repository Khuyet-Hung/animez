"use client";

import { useEffect, useState } from "react";

export default function useHydratedReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncReducedMotion() {
      setReduceMotion(mediaQuery.matches);
    }

    syncReducedMotion();
    mediaQuery.addEventListener("change", syncReducedMotion);

    return () => mediaQuery.removeEventListener("change", syncReducedMotion);
  }, []);

  return reduceMotion;
}

