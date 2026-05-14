import Image from "next/image";
import { cn } from "@/lib/cn";

type AppAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AppAvatarProps {
  src?: string | null;
  alt: string;
  fallback: string;
  size?: AppAvatarSize;
  className?: string;
  priority?: boolean;
}

const sizeClassNames: Record<AppAvatarSize, string> = {
  xs: "size-6 text-xs",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-[88px] text-2xl",
};

export function AppAvatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
  priority = false,
}: AppAvatarProps) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-ui-pill border border-border-strong bg-surface text-fg-subtle",
        sizeClassNames[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          priority={priority}
          sizes={size === "xl" ? "88px" : size === "lg" ? "56px" : "40px"}
        />
      ) : (
        <span className="flex size-full items-center justify-center bg-brand font-black text-brand-fg">
          {fallback}
        </span>
      )}
    </span>
  );
}
