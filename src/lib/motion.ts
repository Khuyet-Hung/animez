import type { Variants } from "framer-motion";

export const viewportOnce = {
  once: true,
  amount: 0.2,
  margin: "0px 0px -80px 0px",
} as const;

export const heroImageVariants: Variants = {
  hidden: { opacity: 0, scale: 1.06 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.95, ease: "easeOut" },
  },
};

export const heroOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.75, delay: 0.18, ease: "easeOut" },
  },
};

export const heroContentVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.28,
      staggerChildren: 0.08,
    },
  },
};

export const heroContentItemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

export const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export const reducedSectionVariants: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

export const sectionHeaderVariants: Variants = {
  hidden: { opacity: 0, x: -18 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export const reducedSectionHeaderVariants: Variants = {
  hidden: { opacity: 1, x: 0 },
  visible: { opacity: 1, x: 0 },
};

export const sectionContentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, delay: 0.12, ease: "easeOut" },
  },
};

export const reducedSectionContentVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

export const cardRevealVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: "easeOut" },
  },
};

export function createCardRevealVariants(delay = 0, reduceMotion = false): Variants {
  if (reduceMotion) {
    return {
      hidden: { opacity: 1, y: 0 },
      visible: { opacity: 1, y: 0 },
    };
  }

  return {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.42, delay, ease: "easeOut" },
    },
  };
}
