import Image from "next/image";
import { APP_LOGO_ALT, APP_LOGOS } from "@/lib/branding";

type AppLogoVariant = keyof typeof APP_LOGOS;

interface AppLogoProps {
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
  variant?: AppLogoVariant;
}

const variantClassNames: Record<AppLogoVariant, string> = {
  mark: "aspect-square",
  wide: "aspect-[3/2]",
};

export default function AppLogo({
  alt = APP_LOGO_ALT,
  className = "",
  imageClassName = "",
  priority = false,
  sizes,
  variant = "wide",
}: AppLogoProps) {
  const logo = APP_LOGOS[variant];

  return (
    <span
      className={`relative block flex-none overflow-hidden ${variantClassNames[variant]} ${className}`}
    >
      <Image
        src={logo.src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={`object-contain ${imageClassName}`}
      />
    </span>
  );
}
