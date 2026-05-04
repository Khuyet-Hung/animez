"use client";

import { useState } from "react";
import { CheckIcon, ListPlusIcon, Loader2Icon, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ANIME_LIST_STATUS_BADGE_CLASS } from "@/lib/anime-list/constants";
import { useAnimeListEntry } from "@/hooks/useAnimeListEntry";
import type { AnimeMedia } from "@/types/anime";
import AnimeListEditor from "@/components/anime-list/AnimeListEditor";

interface AnimeListButtonProps {
  anime: AnimeMedia;
  variant?: "detail" | "hero" | "card";
  className?: string;
}

export default function AnimeListButton({
  anime,
  variant = "detail",
  className = "",
}: AnimeListButtonProps) {
  const t = useTranslations("animeList");
  const pathname = usePathname();
  const [editorOpen, setEditorOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const {
    entry,
    loading,
    saving,
    error,
    needsLogin,
    quickAdd,
    saveEntry,
    deleteEntry,
  } = useAnimeListEntry(anime);

  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;
  const label = entry ? t(`status.${entry.status}`) : t("addToList");
  const isCard = variant === "card";

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (isCard) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (needsLogin) {
      setLoginPromptOpen(true);
      return;
    }

    if (entry) {
      setEditorOpen(true);
      return;
    }

    await quickAdd();
  }

  const Icon = saving || loading ? Loader2Icon : entry ? CheckIcon : ListPlusIcon;
  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const variantClasses = isCard
    ? `size-10 border bg-black/70 text-white backdrop-blur-sm hover:border-[#f49e0b] hover:text-[#f49e0b] ${
        entry ? ANIME_LIST_STATUS_BADGE_CLASS[entry.status] : "border-white/15"
      }`
    : entry
      ? `h-10 px-3 border ${ANIME_LIST_STATUS_BADGE_CLASS[entry.status]} hover:border-[#f49e0b]`
      : "h-10 px-3 bg-[#f49e0b] text-[#0a0a0f] hover:bg-[#d68a09]";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={saving || loading}
        className={`${baseClasses} ${variantClasses} ${className}`}
        aria-label={isCard ? label : undefined}
        title={isCard ? label : undefined}
      >
        <Icon className={`size-4 ${saving || loading ? "animate-spin" : ""}`} />
        {!isCard && <span>{label}</span>}
        {!isCard && entry && <PencilIcon className="size-3.5 opacity-80" />}
      </button>

      {loginPromptOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-[#1a1a24] bg-[#111118] p-5 shadow-2xl">
            <h2 className="text-lg font-black text-white">{t("loginRequiredTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-[#9ca3af]">
              {t("loginRequiredDescription")}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLoginPromptOpen(false)}
                className="h-10 rounded border border-[#1a1a24] px-4 text-sm font-bold text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white"
              >
                {t("cancel")}
              </button>
              <Link
                href={loginHref}
                className="inline-flex h-10 items-center rounded bg-[#f49e0b] px-4 text-sm font-black text-[#0a0a0f] transition-colors hover:bg-[#d68a09]"
              >
                {t("goToLogin")}
              </Link>
            </div>
          </div>
        </div>
      )}

      <AnimeListEditor
        key={`${entry?.id ?? anime.id}-${editorOpen ? "open" : "closed"}`}
        anime={anime}
        entry={entry}
        open={editorOpen}
        saving={saving}
        error={error}
        onClose={() => setEditorOpen(false)}
        onSave={saveEntry}
        onDelete={deleteEntry}
      />
    </>
  );
}
