"use client";

import Image from "next/image";
import { useState } from "react";

interface ProfileAvatarProps {
  src?: string | null;
  name: string;
  size?: "md" | "lg";
}

export default function ProfileAvatar({ src, name, size = "lg" }: ProfileAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = name.trim().slice(0, 2).toUpperCase() || "AZ";
  const wrapperClassName =
    size === "lg"
      ? "relative flex size-[88px] shrink-0 items-center justify-center rounded-full ring-2 ring-[#f49e0b] ring-offset-2 ring-offset-[#0d0d14]"
      : "relative flex size-14 shrink-0 items-center justify-center rounded-full ring-2 ring-[#f49e0b] ring-offset-2 ring-offset-[#0d0d14]";
  const fallbackClassName =
    size === "lg"
      ? "flex size-full items-center justify-center rounded-full bg-[#f49e0b] text-2xl font-black text-[#0a0a0f]"
      : "flex size-full items-center justify-center rounded-full bg-[#f49e0b] text-base font-black text-[#0a0a0f]";

  if (src && failedSrc !== src) {
    return (
      <div className={wrapperClassName}>
        <Image
          src={src}
          alt={name}
          fill
          sizes={size === "lg" ? "88px" : "56px"}
          className="rounded-full object-cover"
          onError={() => setFailedSrc(src)}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <div className={fallbackClassName}>{initials}</div>
    </div>
  );
}
