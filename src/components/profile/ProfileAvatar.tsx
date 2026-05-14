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
      ? "relative flex size-[88px] shrink-0 items-center justify-center rounded-ui-pill ring-2 ring-brand ring-offset-2 ring-offset-bg-muted"
      : "relative flex size-14 shrink-0 items-center justify-center rounded-ui-pill ring-2 ring-brand ring-offset-2 ring-offset-bg-muted";
  const fallbackClassName =
    size === "lg"
      ? "flex size-full items-center justify-center rounded-ui-pill bg-brand text-2xl font-black text-brand-fg"
      : "flex size-full items-center justify-center rounded-ui-pill bg-brand text-base font-black text-brand-fg";

  if (src && failedSrc !== src) {
    return (
      <div className={wrapperClassName}>
        <Image
          src={src}
          alt={name}
          fill
          sizes={size === "lg" ? "88px" : "56px"}
          className="rounded-ui-pill object-cover"
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
