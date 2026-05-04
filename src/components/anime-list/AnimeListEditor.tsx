"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ANIME_LIST_PRIORITY_OPTIONS,
  ANIME_LIST_REWATCH_VALUE_OPTIONS,
  ANIME_LIST_SCORE_OPTIONS,
  ANIME_LIST_STATUSES,
} from "@/lib/anime-list/constants";
import type { AnimeMedia } from "@/types/anime";
import type {
  AnimeListEntry,
  AnimeListEntryInput,
  AnimeListPriority,
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
  const [priority, setPriority] = useState<AnimeListPriority>(entry?.priority ?? 0);
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [isRewatching, setIsRewatching] = useState(entry?.is_rewatching ?? false);
  const [rewatchCount, setRewatchCount] = useState(entry?.rewatch_count ?? 0);
  const [rewatchValue, setRewatchValue] = useState<AnimeListRewatchValue>(
    entry?.rewatch_value ?? 0
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const totalEpisodes = anime.episodes ?? entry?.total_episodes ?? null;

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
      priority,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
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
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 px-4 py-4 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-[#1a1a24] bg-[#0f0f16] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1a1a24] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-[#f49e0b]">
              {t("editListEntry")}
            </p>
            <h2 className="mt-1 line-clamp-1 text-lg font-black text-white">
              {anime.title.english || anime.title.romaji}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded border border-[#1a1a24] text-[#9ca3af] transition-colors hover:border-[#f49e0b] hover:text-white"
            aria-label={t("cancel")}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[78vh] overflow-y-auto px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                {t("status.label")}
              </span>
              <select
                value={status}
                onChange={(event) => handleStatusChange(event.target.value as AnimeListStatus)}
                className="h-11 rounded border border-[#1a1a24] bg-[#111118] px-3 text-sm font-semibold text-white outline-none transition-colors focus:border-[#f49e0b]"
              >
                {ANIME_LIST_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {t(`status.${option}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                {t("score")}
              </span>
              <select
                value={score}
                onChange={(event) => setScore(Number(event.target.value) as AnimeListScore)}
                className="h-11 rounded border border-[#1a1a24] bg-[#111118] px-3 text-sm font-semibold text-white outline-none transition-colors focus:border-[#f49e0b]"
              >
                {ANIME_LIST_SCORE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === 0 ? t("unscored") : option}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                {t("progress")}
              </span>
              <div className="flex h-11 overflow-hidden rounded border border-[#1a1a24] bg-[#111118] focus-within:border-[#f49e0b]">
                <input
                  type="number"
                  min={0}
                  max={totalEpisodes ?? undefined}
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                  className="w-full bg-transparent px-3 text-sm font-semibold text-white outline-none"
                />
                <span className="flex items-center border-l border-[#1a1a24] px-3 text-sm text-[#9ca3af]">
                  / {totalEpisodes ?? "?"}
                </span>
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                {t("priority")}
              </span>
              <select
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value) as AnimeListPriority)}
                className="h-11 rounded border border-[#1a1a24] bg-[#111118] px-3 text-sm font-semibold text-white outline-none transition-colors focus:border-[#f49e0b]"
              >
                {ANIME_LIST_PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`priorityValue.${option}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                {t("startedAt")}
              </span>
              <input
                type="date"
                value={startedAt}
                onChange={(event) => setStartedAt(event.target.value)}
                className="h-11 rounded border border-[#1a1a24] bg-[#111118] px-3 text-sm font-semibold text-white outline-none transition-colors focus:border-[#f49e0b]"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                {t("finishedAt")}
              </span>
              <input
                type="date"
                value={finishedAt}
                onChange={(event) => setFinishedAt(event.target.value)}
                className="h-11 rounded border border-[#1a1a24] bg-[#111118] px-3 text-sm font-semibold text-white outline-none transition-colors focus:border-[#f49e0b]"
              />
            </label>
          </div>

          <label className="mt-4 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
              {t("tags")}
            </span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder={t("tagsPlaceholder")}
              className="h-11 rounded border border-[#1a1a24] bg-[#111118] px-3 text-sm font-semibold text-white outline-none transition-colors placeholder:text-[#5f6472] focus:border-[#f49e0b]"
            />
          </label>

          <label className="mt-4 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
              {t("notes")}
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="resize-none rounded border border-[#1a1a24] bg-[#111118] px-3 py-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-[#5f6472] focus:border-[#f49e0b]"
              placeholder={t("notesPlaceholder")}
            />
          </label>

          <details className="mt-4 rounded border border-[#1a1a24] bg-[#111118] px-4 py-3">
            <summary className="cursor-pointer text-sm font-bold text-white">
              {t("rewatch")}
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#d1d5db]">
                <input
                  type="checkbox"
                  checked={isRewatching}
                  onChange={(event) => setIsRewatching(event.target.checked)}
                  className="size-4 accent-[#f49e0b]"
                />
                {t("isRewatching")}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                  {t("rewatchCount")}
                </span>
                <input
                  type="number"
                  min={0}
                  value={rewatchCount}
                  onChange={(event) => setRewatchCount(Number(event.target.value))}
                  className="h-10 rounded border border-[#1a1a24] bg-[#0f0f16] px-3 text-sm font-semibold text-white outline-none transition-colors focus:border-[#f49e0b]"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                  {t("rewatchValue")}
                </span>
                <select
                  value={rewatchValue}
                  onChange={(event) =>
                    setRewatchValue(Number(event.target.value) as AnimeListRewatchValue)
                  }
                  className="h-10 rounded border border-[#1a1a24] bg-[#0f0f16] px-3 text-sm font-semibold text-white outline-none transition-colors focus:border-[#f49e0b]"
                >
                  {ANIME_LIST_REWATCH_VALUE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {t(`rewatchValueLabel.${option}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          {(validationError || error) && (
            <p className="mt-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
              {validationError || t("updateFailed")}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#1a1a24] pt-4 sm:flex-row sm:items-center sm:justify-between">
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
                type="button"
                onClick={onClose}
                className="h-10 rounded border border-[#1a1a24] px-4 text-sm font-bold text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded bg-[#f49e0b] px-5 text-sm font-black text-[#0a0a0f] transition-colors hover:bg-[#d68a09] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
