"use client";

import Image from "next/image";
import type { SocialFeedImage, SocialPostImageLayout } from "@/types/social";

type ResolvedImageLayout =
  | "single"
  | "stacked"
  | "side_by_side"
  | "featured_top"
  | "featured_side"
  | "mosaic_top"
  | "mosaic_side";

const MULTI_IMAGE_HEIGHT_CLASS = "md:h-[520px] md:max-h-[calc(100vh-220px)] lg:h-[560px]";

function getVisibleImageLimit(count: number) {
  if (count >= 5) return 5;
  return count;
}

function resolveImageLayout(count: number, layout: SocialPostImageLayout): ResolvedImageLayout {
  if (count <= 1) return "single";
  if (count === 2) return layout === "side_by_side" ? "side_by_side" : "stacked";
  if (count <= 4) return layout === "featured_side" ? "featured_side" : "featured_top";
  return layout === "mosaic_side" ? "mosaic_side" : "mosaic_top";
}

function getGridClass(layout: ResolvedImageLayout, count: number) {
  if (layout === "single") return "grid-cols-1";
  if (layout === "stacked") return `grid-cols-1 md:grid-rows-2 ${MULTI_IMAGE_HEIGHT_CLASS}`;
  if (layout === "side_by_side") return `grid-cols-1 sm:grid-cols-2 ${MULTI_IMAGE_HEIGHT_CLASS}`;
  if (layout === "featured_top") {
    return count === 3
      ? `grid-cols-2 md:grid-rows-[2fr_1fr] ${MULTI_IMAGE_HEIGHT_CLASS}`
      : `grid-cols-3 md:grid-rows-[2fr_1fr] ${MULTI_IMAGE_HEIGHT_CLASS}`;
  }
  if (layout === "featured_side") {
    return count === 3
      ? `grid-cols-2 md:grid-cols-[2fr_1fr] md:grid-rows-2 ${MULTI_IMAGE_HEIGHT_CLASS}`
      : `grid-cols-3 md:grid-cols-[2fr_1fr] md:grid-rows-3 ${MULTI_IMAGE_HEIGHT_CLASS}`;
  }
  if (layout === "mosaic_side") return `grid-cols-6 md:grid-cols-2 md:grid-rows-6 ${MULTI_IMAGE_HEIGHT_CLASS}`;
  return `grid-cols-6 md:grid-rows-2 ${MULTI_IMAGE_HEIGHT_CLASS}`;
}

function getImageClass(layout: ResolvedImageLayout, count: number, index: number) {
  if (layout === "single") return "aspect-[16/10]";
  if (layout === "stacked" || layout === "side_by_side") return "aspect-[16/10] md:aspect-auto";

  if (layout === "featured_top") {
    if (index === 0) {
      return count === 3 ? "col-span-2 aspect-[16/10] md:aspect-auto" : "col-span-3 aspect-[16/10] md:aspect-auto";
    }

    return count === 4 ? "aspect-[3/4] md:aspect-auto" : "aspect-square md:aspect-auto";
  }

  if (layout === "featured_side") {
    if (index === 0) {
      return count === 3
        ? "col-span-2 aspect-[16/10] md:col-span-1 md:row-span-2 md:aspect-auto"
        : "col-span-3 aspect-[16/10] md:col-span-1 md:row-span-3 md:aspect-auto";
    }

    return count === 4 ? "aspect-[3/4] md:aspect-auto" : "aspect-square md:aspect-auto";
  }

  if (layout === "mosaic_side") {
    const baseClass = index < 2 ? "col-span-3 aspect-[4/5]" : "col-span-2 aspect-[3/4]";
    const desktopClasses = [
      "md:col-start-1 md:row-start-1 md:row-span-3",
      "md:col-start-1 md:row-start-4 md:row-span-3",
      "md:col-start-2 md:row-start-1 md:row-span-2",
      "md:col-start-2 md:row-start-3 md:row-span-2",
      "md:col-start-2 md:row-start-5 md:row-span-2",
    ];

    return `${baseClass} md:col-span-1 md:aspect-auto ${desktopClasses[index] ?? ""}`;
  }

  return index < 2 ? "col-span-3 aspect-[4/5] md:aspect-auto" : "col-span-2 aspect-[3/4] md:aspect-auto";
}

function getImageSizes(layout: ResolvedImageLayout, index: number) {
  if (layout === "single") return "(min-width: 768px) 720px, 100vw";
  if (layout === "featured_side" && index === 0) return "(min-width: 768px) 480px, 100vw";
  if (layout === "featured_top" && index === 0) return "(min-width: 768px) 720px, 100vw";
  if (layout === "mosaic_top" && index < 2) return "(min-width: 768px) 360px, 50vw";
  return "(min-width: 768px) 280px, 50vw";
}

export default function SocialPostImages({
  imageLayout = "auto",
  images,
  getImageAriaLabel,
  onImageClick,
}: {
  imageLayout?: SocialPostImageLayout;
  images: SocialFeedImage[];
  getImageAriaLabel?: (index: number) => string;
  onImageClick?: (index: number) => void;
}) {
  if (images.length === 0) return null;

  const visibleImages = images.slice(0, getVisibleImageLimit(images.length));
  const remainingCount = images.length - visibleImages.length;
  const resolvedLayout = resolveImageLayout(visibleImages.length, imageLayout);

  return (
    <div className={`grid gap-1 bg-bg ${getGridClass(resolvedLayout, visibleImages.length)}`}>
      {visibleImages.map((image, index) => {
        const imageContent = (
          <>
            <Image
              src={image.public_url}
              alt=""
              fill
              sizes={getImageSizes(resolvedLayout, index)}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              unoptimized
            />
            {remainingCount > 0 && index === visibleImages.length - 1 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/65 text-2xl font-black text-fg">
                +{remainingCount}
              </div>
            )}
          </>
        );

        return (
          <div
            key={image.id}
            className={`relative overflow-hidden bg-border ${getImageClass(resolvedLayout, visibleImages.length, index)}`}
          >
            {onImageClick ? (
              <button
                type="button"
                aria-label={getImageAriaLabel?.(index) ?? `Ảnh ${index + 1}`}
                onClick={() => onImageClick(index)}
                className="group absolute inset-0 block size-full overflow-hidden text-left"
              >
                {imageContent}
              </button>
            ) : (
              <div className="group absolute inset-0">{imageContent}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
