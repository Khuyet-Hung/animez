"use client";

import Image from "next/image";
import type { SocialFeedImage } from "@/types/social";

function getGridClass(count: number) {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  return "grid-cols-2";
}

function getImageAspect(count: number, index: number) {
  if (count === 1) return "aspect-[16/10]";
  if (count === 3 && index === 0) return "aspect-[16/10] col-span-2";
  return "aspect-square";
}

export default function SocialPostImages({ images }: { images: SocialFeedImage[] }) {
  if (images.length === 0) return null;

  const visibleImages = images.slice(0, 4);
  const remainingCount = images.length - visibleImages.length;

  return (
    <div className={`grid gap-1 bg-[#0a0a0f] ${getGridClass(visibleImages.length)}`}>
      {visibleImages.map((image, index) => (
        <div key={image.id} className={`relative overflow-hidden bg-[#1a1a24] ${getImageAspect(visibleImages.length, index)}`}>
          <Image
            src={image.public_url}
            alt=""
            fill
            sizes={visibleImages.length === 1 ? "(min-width: 768px) 720px, 100vw" : "(min-width: 768px) 360px, 50vw"}
            className="object-cover"
            unoptimized
          />
          {remainingCount > 0 && index === visibleImages.length - 1 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/65 text-2xl font-black text-white">
              +{remainingCount}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
