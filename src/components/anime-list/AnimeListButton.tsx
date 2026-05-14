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
import { AppButton, AppDialog, AppIconButton, AppSelect } from "@/components/ui";
import { cn } from "@/lib/cn";

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
    "inline-flex items-center justify-center gap-2 rounded-ui-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const variantClasses = isCard
    ? `size-10 border bg-black/70 text-fg backdrop-blur-sm hover:border-brand hover:text-brand ${
        entry ? ANIME_LIST_STATUS_BADGE_CLASS[entry.status] : "border-white/15"
      }`
    : entry
      ? `h-10 px-3 border ${ANIME_LIST_STATUS_BADGE_CLASS[entry.status]} hover:border-brand`
      : "h-10 px-3 bg-brand text-brand-fg hover:bg-brand-hover";

  const loginPrompt = (
    <AppDialog
      open={loginPromptOpen}
      onClose={() => setLoginPromptOpen(false)}
      title={t("loginRequiredTitle")}
      closeLabel={t("cancel")}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setLoginPromptOpen(false)}
          >
            {t("cancel")}
          </AppButton>
          <Link
            href={loginHref}
            className="inline-flex h-9 items-center rounded-ui-sm bg-brand px-4 text-sm font-black text-brand-fg transition-colors hover:bg-brand-hover"
          >
            {t("goToLogin")}
          </Link>
        </div>
      }
    >
      <p className="px-5 py-4 text-sm leading-6 text-fg-muted">
        {t("loginRequiredDescription")}
      </p>
    </AppDialog>
  );

  if (!isCard && entry) {
    return (
      <>
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
          <label className="relative inline-flex h-10 min-w-[150px] items-center overflow-hidden rounded-ui-sm border border-border-strong bg-border text-sm font-bold text-fg shadow-sm transition-colors focus-within:border-brand hover:border-brand/70">
            <span className="sr-only">{t("status.label")}</span>
            <AppSelect
              value={entry.status}
              onChange={handleStatusChange}
              disabled={quickControlsDisabled}
              className="h-full appearance-none border-0 bg-transparent py-0 pr-9 pl-3 font-bold"
            >
              {ANIME_LIST_STATUSES.map((option) => (
                <option key={option} value={option} className="bg-surface text-fg">
                  {t(`status.${option}`)}
                </option>
              ))}
            </AppSelect>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 size-4 text-fg-soft" />
          </label>

          <label className="relative inline-flex h-10 min-w-[150px] items-center overflow-hidden rounded-ui-sm border border-border-strong bg-border text-sm font-bold text-fg shadow-sm transition-colors focus-within:border-brand hover:border-brand/70">
            <span className="sr-only">{t("score")}</span>
            <AppSelect
              value={entry.score || 0}
              onChange={handleScoreChange}
              disabled={quickControlsDisabled}
              className="h-full appearance-none border-0 bg-transparent py-0 pr-16 pl-3 font-bold"
            >
              <option value={0} className="bg-surface text-fg">
                {t("unscored")}
              </option>
              {SCORE_SELECT_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-surface text-fg">
                  {formatAnimeListScoreLabel(option, t("unscored"))}
                </option>
              ))}
            </AppSelect>
            <div className="pointer-events-none absolute right-2.5 flex items-center gap-2">
              <StarIcon className="size-4 fill-brand text-brand" />
              <ChevronDownIcon className="size-4 text-fg-soft" />
            </div>
          </label>

          <div className="inline-flex h-10 min-w-[170px] items-center rounded-ui-sm border border-border-strong bg-border px-3 text-sm shadow-sm">
            <span className="font-bold text-fg">{detailT("episodes")}:</span>
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
              className="ml-1.5 inline-flex size-5 items-center justify-center rounded-ui-pill bg-fg-subtle text-fg transition-colors hover:bg-brand hover:text-brand-fg disabled:cursor-not-allowed disabled:opacity-45"
              aria-label={t("progress")}
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>

          <AppIconButton
            type="button"
            onClick={handleEditClick}
            disabled={quickControlsDisabled}
            aria-label={t("editListEntry")}
            title={t("editListEntry")}
            isLoading={quickControlsDisabled}
          >
            <PencilIcon className="size-4" />
          </AppIconButton>
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
        className={cn(baseClasses, variantClasses, className)}
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
