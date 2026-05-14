"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { createGravatarUrl } from "@/lib/gravatar";
import { PROFILE_AVATAR_UPDATED_EVENT } from "@/lib/profile/avatar-events";
import { Link } from "@/i18n/navigation";
import { LogOutIcon, ChevronDownIcon, UserIcon } from "lucide-react";
import { AppSkeleton } from "@/components/ui";

function AvatarCircle({
  src,
  initials,
  name,
  size,
}: {
  src: string | null;
  initials: string;
  name: string;
  size: "sm" | "md";
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const dimension = size === "sm" ? 24 : 32;
  const className =
    size === "sm"
      ? "h-6 w-6 rounded-ui-pill bg-brand object-cover"
      : "h-8 w-8 flex-none rounded-ui-pill bg-brand object-cover";
  const fallbackClassName =
    size === "sm"
      ? "flex h-6 w-6 items-center justify-center rounded-ui-pill bg-brand text-xs font-black text-brand-fg"
      : "flex h-8 w-8 flex-none items-center justify-center rounded-ui-pill bg-brand text-xs font-black text-brand-fg";

  if (src && failedSrc !== src) {
    return (
      <Image
        src={src}
        alt={name}
        width={dimension}
        height={dimension}
        className={className}
        onError={() => setFailedSrc(src)}
        unoptimized
      />
    );
  }

  return <div className={fallbackClassName}>{initials}</div>;
}

export default function AuthButton() {
  const t = useTranslations("auth");
  const profileT = useTranslations("profile");
  const router = useRouter();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [gravatarResult, setGravatarResult] = useState<{
    email: string;
    url: string | null;
  } | null>(null);
  const [profileAvatarResult, setProfileAvatarResult] = useState<{
    userId: string;
    url: string | null;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!user?.email) {
      return;
    }

    const email = user.email;
    let active = true;

    createGravatarUrl(email).then((url) => {
      if (active) setGravatarResult({ email, url });
    });

    return () => {
      active = false;
    };
  }, [user?.email]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const userId = user.id;
    const supabase = createClient();
    let active = true;

    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setProfileAvatarResult({
            userId,
            url: typeof data?.avatar_url === "string" ? data.avatar_url : null,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;

    function handleProfileAvatarUpdated(event: Event) {
      if (!(event instanceof CustomEvent)) return;

      setProfileAvatarResult({
        userId,
        url: typeof event.detail?.avatarUrl === "string" ? event.detail.avatarUrl : null,
      });
    }

    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated);
    return () =>
      window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleProfileAvatarUpdated);
  }, [user?.id]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <AppSkeleton className="h-9 w-28 border border-border bg-surface" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex h-9 items-center justify-center gap-2 rounded-ui-sm bg-brand px-4 text-sm font-bold text-brand-fg transition-colors hover:bg-brand-hover"
      >
        <UserIcon className="size-4" />
        {t("login")}
      </Link>
    );
  }

  const displayName: string =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "AN";
  const initials = displayName.slice(0, 2).toUpperCase();
  const gravatarUrl =
    user.email && gravatarResult?.email === user.email
      ? gravatarResult.url
      : null;
  const profileAvatarUrl =
    profileAvatarResult?.userId === user.id ? profileAvatarResult.url : null;
  const avatarUrl = profileAvatarUrl ?? gravatarUrl;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-ui-sm border border-border bg-surface px-3 text-sm font-bold text-fg transition-all hover:border-brand"
      >
        <AvatarCircle src={avatarUrl} initials={initials} name={displayName} size="sm" />
        <ChevronDownIcon className="h-4 w-4 text-fg-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-ui-sm border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <AvatarCircle src={avatarUrl} initials={initials} name={displayName} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{displayName}</p>
                <p className="truncate text-xs text-fg-muted">{user.email}</p>
              </div>
            </div>
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg-muted transition-colors hover:bg-border hover:text-fg"
          >
            <UserIcon className="w-4 h-4" />
            {profileT("settings")}
          </Link>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOutIcon className="w-4 h-4" />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
