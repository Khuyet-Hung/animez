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
      ? "w-6 h-6 rounded-full object-cover bg-[#f49e0b]"
      : "w-8 h-8 rounded-full object-cover bg-[#f49e0b] flex-none";
  const fallbackClassName =
    size === "sm"
      ? "w-6 h-6 rounded-full bg-[#f49e0b] text-[#0a0a0f] text-xs font-black flex items-center justify-center"
      : "w-8 h-8 rounded-full bg-[#f49e0b] text-[#0a0a0f] text-xs font-black flex items-center justify-center flex-none";

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
      <div className="flex gap-2">
        <div className="h-9 w-20 rounded bg-[#111118] border border-[#1a1a24] animate-pulse" />
        <div className="h-9 w-24 rounded bg-[#f49e0b]/20 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex gap-2">
        <Link
          href="/login"
          className="hidden sm:flex h-9 items-center justify-center rounded px-4 bg-transparent border border-[#1a1a24] hover:border-[#f49e0b] text-white hover:text-[#f49e0b] text-sm font-bold transition-all"
        >
          {t("login")}
        </Link>
        <Link
          href="/register"
          className="flex h-9 items-center justify-center rounded px-4 bg-[#f49e0b] hover:bg-[#d68a09] text-[#0a0a0f] text-sm font-bold transition-colors"
        >
          {t("register")}
        </Link>
      </div>
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
        className="flex items-center gap-2 h-9 px-3 rounded bg-[#111118] border border-[#1a1a24] hover:border-[#f49e0b] text-white text-sm font-bold transition-all"
      >
        <AvatarCircle src={avatarUrl} initials={initials} name={displayName} size="sm" />
        <ChevronDownIcon className="w-4 h-4 text-[#9ca3af]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[#111118] border border-[#1a1a24] rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a24]">
            <div className="flex items-center gap-2">
              <AvatarCircle src={avatarUrl} initials={initials} name={displayName} size="md" />
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{displayName}</p>
                <p className="text-[#9ca3af] text-xs truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#9ca3af] hover:text-white hover:bg-[#1a1a24] transition-colors"
          >
            <UserIcon className="w-4 h-4" />
            {profileT("settings")}
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOutIcon className="w-4 h-4" />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
