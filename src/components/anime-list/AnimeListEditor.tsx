"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CalendarIcon,
  ChevronUpIcon,
  ImageIcon,
  MinusIcon,
  PlusIcon,
  StarIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ANIME_LIST_REWATCH_VALUE_OPTIONS,
  ANIME_LIST_SCORE_OPTIONS,
  formatAnimeListScoreLabel,
} from "@/lib/anime-list/constants";
import type { AnimeMedia } from "@/types/anime";
import type {
  AnimeListEntry,
  AnimeListEntryInput,
  AnimeListRewatchValue,
  AnimeListScore,
  AnimeListStatus,
} from "@/types/anime-list";

interface AnimeListEditorProps {
  anime: AnimeMedia;
  entry: AnimeListEntry | null;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: AnimeListEntryInput) => Promise<AnimeListEntry | null>;
  onDelete: () => Promise<boolean>;
}

const STATUS_DISPLAY_ORDER: AnimeListStatus[] = [
  "watching",
  "on_hold",
  "completed",
  "dropped",
  "plan_to_watch",
];

const SCORE_STAR_OPTIONS = ANIME_LIST_SCORE_OPTIONS.filter((option) => option > 0);

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AnimeListEditor({
  anime,
  entry,
  open,
  saving,
  error,
  onClose,
  onSave,
  onDelete,
}: AnimeListEditorProps) {
  const t = useTranslations("animeList");
  const [status, setStatus] = useState<AnimeListStatus>(entry?.status ?? "plan_to_watch");
  const [score, setScore] = useState<AnimeListScore>(entry?.score ?? 0);
  const [progress, setProgress] = useState(entry?.progress_episodes ?? 0);
  const [startedAt, setStartedAt] = useState(entry?.started_at ?? "");
  const [finishedAt, setFinishedAt] = useState(entry?.finished_at ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [isRewatching, setIsRewatching] = useState(entry?.is_rewatching ?? false);
  const [rewatchCount, setRewatchCount] = useState(entry?.rewatch_count ?? 0);
  const [rewatchValue, setRewatchValue] = useState<AnimeListRewatchValue>(
    entry?.rewatch_value ?? 0
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const totalEpisodes = anime.episodes ?? entry?.total_episodes ?? null;
  const title = anime.title.english || anime.title.romaji || "Anime";
  const coverImage = anime.coverImage?.large || anime.coverImage?.extraLarge || null;
  const progressPercent =
    typeof totalEpisodes === "number" && totalEpisodes > 0
      ? Math.min(100, Math.round((Math.max(0, progress) / totalEpisodes) * 100))
      : progress > 0
        ? 100
        : 0;

  if (!open) return null;

  function handleStatusChange(nextStatus: AnimeListStatus) {
    setStatus(nextStatus);

    if (nextStatus === "completed") {
      if (typeof totalEpisodes === "number" && progress < totalEpisodes) {
        setProgress(totalEpisodes);
      }
      if (!finishedAt) setFinishedAt(todayDate());
    }

    if (nextStatus === "watching" && !startedAt) {
      setStartedAt(todayDate());
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (score < 0 || score > 10) {
      setValidationError(t("invalidScore"));
      return;
    }

    if (progress < 0) {
      setValidationError(t("invalidProgress"));
      return;
    }

    if (typeof totalEpisodes === "number" && progress > totalEpisodes) {
      setValidationError(t("progressTooHigh", { count: totalEpisodes }));
      return;
    }

    const saved = await onSave({
      status,
      score,
      progress_episodes: progress,
      total_episodes: totalEpisodes,
      started_at: startedAt || null,
      finished_at: finishedAt || null,
      notes: notes.trim(),
      is_rewatching: isRewatching,
      rewatch_count: Math.max(0, rewatchCount),
      rewatch_value: rewatchValue,
    });

    if (saved) onClose();
  }

  async function handleDelete() {
    const deleted = await onDelete();
    if (deleted) onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-4 py-4 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-[#1a1a24] bg-[#0f0f16] shadow-2xl">
        <div className="relative flex items-center gap-4 border-b border-[#1a1a24] bg-[#111118] px-5 py-4 pr-14">
          <div className="relative flex h-20 w-14 shrink-0 overflow-hidden rounded border border-[#f49e0b]/50 bg-[#1a1a24]">
            {coverImage ? (
              <Image src={coverImage} alt={title} fill sizes="56px" className="object-cover" unoptimized />
            ) : (
              <div className="flex size-full items-center justify-center text-[#f49e0b]">
                <ImageIcon className="size-5" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="mt-1 line-clamp-2 text-lg font-black leading-tight text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full border border-[#1a1a24] bg-black/20 text-[#9ca3af] transition-colors hover:text-white"
            aria-label={t("cancel")}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[78vh] overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            <section className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                {t("status.label")}
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {STATUS_DISPLAY_ORDER.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleStatusChange(option)}
                    className={`h-9 rounded-lg border px-3 text-xs font-bold transition-colors ${
                      status === option
                        ? "border-[#f49e0b] bg-[#f49e0b]/10 text-[#f49e0b]"
                        : "border-[#1a1a24] bg-[#111118] text-[#9ca3af] hover:border-[#f49e0b]/60 hover:text-white"
                    }`}
                  >
                    {t(`status.${option}`)}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                  {t("score")}
                </span>
                <span className="text-sm font-black text-[#9ca3af]">
                  {score > 0 ? `${score}/10` : t("unscored")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {SCORE_STAR_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setScore((score === option ? 0 : option) as AnimeListScore)}
                    className={`rounded p-0.5 transition-colors ${
                      score >= option ? "text-[#f49e0b]" : "text-[#3a3a46] hover:text-[#9ca3af]"
                    }`}
                    aria-label={formatAnimeListScoreLabel(option as AnimeListScore, t("unscored"))}
                  >
                    <StarIcon className="size-5 fill-current" />
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                  {t("progress")}
                </span>
                {progressPercent === 100 && (
                  <span className="rounded bg-[#f49e0b]/15 px-2 py-1 text-[11px] font-bold text-[#f49e0b]">
                    {t("status.completed")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={totalEpisodes ?? undefined}
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                  className="h-11 w-24 rounded border border-[#1a1a24] bg-[#111118] px-3 text-base font-black text-white outline-none transition-colors focus:border-[#f49e0b]"
                />
                <span className="min-w-0 text-sm font-bold text-[#9ca3af]">
                  <span className="text-[#f49e0b]">/ {totalEpisodes ?? "?"}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#1a1a24]">
                <div
                  className="h-full rounded-full bg-[#f49e0b] transition-[width]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-right text-xs font-bold text-[#5f6472]">{progressPercent}%</p>
            </section>

            <div className="grid gap-4 border-t border-[#1a1a24] pt-5 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                  {t("startedAt")}
                </span>
                <span className="flex h-11 items-center gap-2 rounded border border-[#1a1a24] bg-[#111118] px-3 transition-colors focus-within:border-[#f49e0b]">
                  <CalendarIcon className="size-4 shrink-0 text-[#5f6472]" />
                  <input
                    type="date"
                    value={startedAt}
                    onChange={(event) => setStartedAt(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none"
                  />
                </span>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                  {t("finishedAt")}
                </span>
                <span className="flex h-11 items-center gap-2 rounded border border-[#1a1a24] bg-[#111118] px-3 transition-colors focus-within:border-[#f49e0b]">
                  <CalendarIcon className="size-4 shrink-0 text-[#5f6472]" />
                  <input
                    type="date"
                    value={finishedAt}
                    onChange={(event) => setFinishedAt(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none"
                  />
                </span>
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                {t("notes")}
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="resize-none rounded border border-[#1a1a24] bg-[#111118] px-3 py-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-[#5f6472] focus:border-[#f49e0b]"
                placeholder={t("notesPlaceholder")}
              />
            </label>

            <section className="rounded border border-[#1a1a24] bg-[#111118]">
              <div className="flex items-center justify-between gap-3 border-b border-[#1a1a24] px-4 py-3">
                <label className="flex items-center gap-3 text-sm font-bold text-[#d1d5db]">
                  <input
                    type="checkbox"
                    checked={isRewatching}
                    onChange={(event) => setIsRewatching(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-5 w-9 items-center rounded-full border border-[#1a1a24] bg-[#27272f] p-0.5 transition-colors peer-checked:border-[#f49e0b] peer-checked:bg-[#f49e0b] peer-checked:[&>span]:translate-x-4">
                    <span className="size-4 rounded-full bg-white transition-transform" />
                  </span>
                  {t("isRewatching")}
                </label>
                <div className="flex items-center gap-1 text-xs font-bold text-[#5f6472]">
                  <span>
                    {t("rewatch")} {rewatchCount}
                  </span>
                  <ChevronUpIcon className="size-3" />
                </div>
              </div>

              {isRewatching && (
                <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                      {t("rewatchCount")}
                    </span>
                    <div className="flex h-8 overflow-hidden rounded border border-[#1a1a24] bg-[#0f0f16] focus-within:border-[#f49e0b]">
                      <button
                        type="button"
                        onClick={() => setRewatchCount((current) => Math.max(0, current - 1))}
                        className="flex w-8 items-center justify-center border-r border-[#1a1a24] text-[#9ca3af] transition-colors hover:text-white"
                        aria-label="-"
                      >
                        <MinusIcon className="size-4" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={rewatchCount}
                        onChange={(event) => setRewatchCount(Number(event.target.value))}
                        className="min-w-0 flex-1 bg-transparent text-center text-sm font-black text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setRewatchCount((current) => current + 1)}
                        className="flex w-8 items-center justify-center border-l border-[#1a1a24] text-[#9ca3af] transition-colors hover:text-white"
                        aria-label="+"
                      >
                        <PlusIcon className="size-4" />
                      </button>
                    </div>
                  </label>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                      {t("rewatchValue")}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {ANIME_LIST_REWATCH_VALUE_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setRewatchValue(option)}
                          className={`h-8 rounded border px-3 text-xs font-bold transition-colors ${
                            rewatchValue === option
                              ? "border-[#f49e0b] bg-[#f49e0b]/10 text-[#f49e0b]"
                              : "border-[#1a1a24] bg-[#0f0f16] text-[#9ca3af] hover:border-[#f49e0b]/60 hover:text-white"
                          }`}
                        >
                          {t(`rewatchValueLabel.${option}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {(validationError || error) && (
              <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
                {validationError || t("updateFailed")}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || !entry}
                className="h-10 rounded border border-red-500/30 px-4 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("delete")}
              </button>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 rounded bg-[#f49e0b] px-5 text-sm font-black text-[#0a0a0f] transition-colors hover:bg-[#d68a09] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? t("saving") : t("save")}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
