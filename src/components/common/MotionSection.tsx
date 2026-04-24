"use client";

import { Link } from "@/i18n/navigation";
import {
  reducedSectionContentVariants,
  reducedSectionHeaderVariants,
  reducedSectionVariants,
  sectionContentVariants,
  sectionHeaderVariants,
  sectionVariants,
  viewportOnce,
} from "@/lib/motion";
import useHydratedReducedMotion from "@/hooks/useHydratedReducedMotion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface MotionSectionProps {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  children: ReactNode;
  className?: string;
}

export default function MotionSection({
  title,
  viewAllHref,
  viewAllLabel,
  children,
  className = "",
}: MotionSectionProps) {
  const reduceMotion = useHydratedReducedMotion();
  const activeSectionVariants = reduceMotion ? reducedSectionVariants : sectionVariants;
  const activeHeaderVariants = reduceMotion ? reducedSectionHeaderVariants : sectionHeaderVariants;
  const activeContentVariants = reduceMotion ? reducedSectionContentVariants : sectionContentVariants;

  return (
    <motion.section
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={activeSectionVariants}
    >
      <motion.div variants={activeHeaderVariants}>
        <SectionHeader title={title} viewAllHref={viewAllHref} viewAllLabel={viewAllLabel} />
      </motion.div>
      <motion.div variants={activeContentVariants}>{children}</motion.div>
    </motion.section>
  );
}

function SectionHeader({
  title,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  return (
    <div className="flex items-center justify-between mb-6 px-1">
      <h2 className="text-white text-2xl font-bold tracking-tight border-l-4 border-[#f49e0b] pl-3">
        {title}
      </h2>
      <Link
        href={viewAllHref}
        className="text-sm text-[#f49e0b] hover:text-white font-bold transition-colors"
      >
        {viewAllLabel}
      </Link>
    </div>
  );
}
