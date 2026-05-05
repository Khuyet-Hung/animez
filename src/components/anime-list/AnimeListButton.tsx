"use client";

import { useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ListPlusIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  StarIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  ANIME_LIST_SCORE_OPTIONS,
  ANIME_LIST_STATUS_BADGE_CLASS,
  ANIME_LIST_STATUSES,
  formatAnimeListScoreLabel,
} from "@/lib/anime-list/constants";
import { useAnimeListEntry } from "@/hooks/useAnimeListEntry";
import type { AnimeMedia } from "@/types/anime";
import type { AnimeListScore, AnimeListStatus } from "@/types/anime-list";
import AnimeListEditor from "@/components/anime-list/AnimeListEditor";

const SCORE_SELECT_OPTIONS = ANIME_LIST_SCORE_OPTIONS.filter((option) => option > 0);

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
  const detailT = useTranslations("detail");
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
  const totalEpisodes = entry?.total_episodes ?? anime.episodes ?? null;
  const quickControlsDisabled = saving || loading;

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

  async function handleStatusChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value as AnimeListStatus;
    const nextInput = {
      status: nextStatus,
      total_episodes: totalEpisodes,
      ...(nextStatus === "completed" && typeof totalEpisodes === "number"
        ? { progress_episodes: totalEpisodes }
        : {}),
    };

    await saveEntry(nextInput);
  }

  async function handleScoreChange(event: React.ChangeEvent<HTMLSelectElement>) {
    await saveEntry({ score: Number(event.target.value) as AnimeListScore });
  }

  async function handleProgressIncrement() {
    if (!entry) return;

    const nextProgress =
      typeof totalEpisodes === "number"
        ? Math.min(entry.progress_episodes + 1, totalEpisodes)
        : entry.progress_episodes + 1;

    await saveEntry({
      progress_episodes: nextProgress,
      total_episodes: totalEpisodes,
    });
  }

  async function commitQuickProgress(value: string) {
    if (!entry) return null;

    const nextValue = value.trim();
    if (!nextValue) {
      return entry.progress_episodes;
    }

    const parsedProgress = Number(nextValue);
    if (!Number.isFinite(parsedProgress)) {
      return entry.progress_episodes;
    }

    const safeProgress = Math.max(0, Math.trunc(parsedProgress));
    const nextProgress =
      typeof totalEpisodes === "number" ? Math.min(safeProgress, totalEpisodes) : safeProgress;

    if (nextProgress === entry.progress_episodes) return nextProgress;

    const saved = await saveEntry({
      progress_episodes: nextProgress,
      total_episodes: totalEpisodes,
    });
    return saved ? nextProgress : entry.progress_episodes;
  }

  function handleEditClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (isCard) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (needsLogin) {
      setLoginPromptOpen(true);
      return;
    }

    setEditorOpen(true);
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

  const loginPrompt = loginPromptOpen ? (
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
  ) : null;

  if (!isCard && entry) {
    return (
      <>
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
          <label className="relative inline-flex h-10 min-w-[150px] items-center overflow-hidden rounded border border-[#2a2a35] bg-[#1a1a24] text-sm font-bold text-white shadow-sm transition-colors focus-within:border-[#f49e0b] hover:border-[#f49e0b]/70">
            <span className="sr-only">{t("status.label")}</span>
            <select
              value={entry.status}
              onChange={handleStatusChange}
              disabled={quickControlsDisabled}
              className="h-full w-full appearance-none bg-transparent py-0 pr-9 pl-3 text-sm font-bold text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ANIME_LIST_STATUSES.map((option) => (
                <option key={option} value={option} className="bg-[#111118] text-white">
                  {t(`status.${option}`)}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 size-4 text-[#d1d5db]" />
          </label>

          <label className="relative inline-flex h-10 min-w-[150px] items-center overflow-hidden rounded border border-[#2a2a35] bg-[#1a1a24] text-sm font-bold text-white shadow-sm transition-colors focus-within:border-[#f49e0b] hover:border-[#f49e0b]/70">
            <span className="sr-only">{t("score")}</span>
            <select
              value={entry.score || 0}
              onChange={handleScoreChange}
              disabled={quickControlsDisabled}
              className="h-full w-full appearance-none bg-transparent py-0 pr-16 pl-3 text-sm font-bold text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value={0} className="bg-[#111118] text-white">
                {t("unscored")}
              </option>
              {SCORE_SELECT_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-[#111118] text-white">
                  {formatAnimeListScoreLabel(option, t("unscored"))}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 flex items-center gap-2">
              <StarIcon className="size-4 fill-[#f49e0b] text-[#f49e0b]" />
              <ChevronDownIcon className="size-4 text-[#d1d5db]" />
            </div>
          </label>

          <div className="inline-flex h-10 min-w-[170px] items-center rounded border border-[#2a2a35] bg-[#1a1a24] px-3 text-sm shadow-sm">
            <span className="font-bold text-white">{detailT("episodes")}:</span>
            <input
              key={`${entry.id}-${entry.progress_episodes}`}
              type="number"
              min={0}
              max={totalEpisodes ?? undefined}
              defaultValue={entry.progress_episodes}
              onBlur={(event) => {
                const input = event.currentTarget;
                void commitQuickProgress(input.value).then((nextProgress) => {
                  if (nextProgress !== null) {
                    input.value = String(nextProgress);
                  }
                });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              disabled={quickControlsDisabled}
              className="ml-auto h-full w-11 bg-transparent text-right text-sm font-semibold text-sky-200 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={t("progress")}
            />
            <span className="shrink-0 font-semibold text-sky-200">/{totalEpisodes ?? "?"}</span>
            <button
              type="button"
              onClick={handleProgressIncrement}
              disabled={
                quickControlsDisabled ||
                (typeof totalEpisodes === "number" && entry.progress_episodes >= totalEpisodes)
              }
              className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-[#5f6472] text-white transition-colors hover:bg-[#f49e0b] hover:text-[#0a0a0f] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label={t("progress")}
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleEditClick}
            disabled={quickControlsDisabled}
            className="inline-flex size-10 items-center justify-center rounded border border-[#2a2a35] bg-[#111118] text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={t("editListEntry")}
            title={t("editListEntry")}
          >
            {quickControlsDisabled ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <PencilIcon className="size-4" />
            )}
          </button>
        </div>

        {loginPrompt}

        <AnimeListEditor
          key={`${entry.id}-${editorOpen ? "open" : "closed"}`}
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

      {loginPrompt}

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
