"use client";

import { memo, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  BookmarkPlusIcon,
  CheckIcon,
  ChevronLeftIcon,
  ImageIcon,
  Loader2Icon,
  ThumbsDownIcon,
  TvIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  addRecommendationToPlan,
  markRecommendationCompleted,
  markRecommendationNotInterested,
} from "@/lib/anime-recommendations/actions";
import type {
  RecommendationActionResult,
  RecommendationItem,
  RecommendationSessionView,
} from "@/types/anime-recommendations";

interface RecommendationSessionPanelProps {
  initialView: RecommendationSessionView;
  locale: string;
}

function getTitle(item: RecommendationItem) {
  return item.title_english || item.title_romaji || `Anime #${item.anime_id}`;
}

function getFitLabelKey(score: number) {
  if (score >= 80) return "veryHigh";
  if (score >= 60) return "high";
  if (score >= 40) return "possible";
  return "discovery";
}

function getFormatYear(item: RecommendationItem) {
  return [item.format?.replace("_", " "), item.season_year].filter(Boolean).join(" · ");
}

function ActionButton({
  children,
  disabled,
  onClick,
  className,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded border px-4 text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

function RecommendationSessionPanel({ initialView, locale }: RecommendationSessionPanelProps) {
  const t = useTranslations("recommendations");
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const item = view.currentItem;
  const busy = isPending || pendingAction !== null;

  useEffect(() => {
    if (!view.session || !view.currentItem) {
      router.replace("/profile");
    }
  }, [router, view.currentItem, view.session]);

  function runAction(actionName: string, action: () => Promise<RecommendationActionResult>) {
    setError(null);
    setPendingAction(actionName);
    startTransition(async () => {
      const result = await action();
      setPendingAction(null);

      if (result.status === "error") {
        setError(t(`errors.${result.messageKey}`));
        return;
      }

      setView(result.view);
    });
  }

  if (!view.session || !item) {
    return null;
  }

  const title = getTitle(item);

  return (
    <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-[#242432] bg-[#0d0d12] shadow-2xl">
      <div className="border-b border-[#242432] px-4 py-3 sm:px-5">
        <Link
          href="/profile"
          className="inline-flex h-8 items-center gap-1.5 rounded border border-[#242432] px-2.5 text-xs font-bold text-[#8c7ab2] transition-colors hover:border-[#f49e0b] hover:text-white"
        >
          <ChevronLeftIcon className="size-4" />
          {t("backToProfile")}
        </Link>
      </div>
      <div className="grid md:grid-cols-[250px_minmax(0,1fr)]">
        <div className="relative min-h-[360px] overflow-hidden bg-[#261a3b] md:min-h-[440px]">
          {item.cover_image ? (
            <Image
              src={item.cover_image}
              alt={title}
              fill
              sizes="(min-width: 768px) 250px, 100vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex size-full min-h-[360px] flex-col items-center justify-center gap-3 text-[#7f6aa7] md:min-h-[440px]">
              <ImageIcon className="size-9" />
              <span className="text-xs font-semibold">poster</span>
            </div>
          )}
          <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black/70 to-transparent" />
          <span className="absolute left-4 top-4 rounded bg-[#f49e0b] px-3 py-1 text-xs font-black text-[#0a0a0f]">
            {[item.format, item.season_year].filter(Boolean).join(" · ") || "Anime"}
          </span>
        </div>

        <div className="flex min-h-[360px] flex-col px-5 py-6 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link href={`/anime/${item.anime_id}`} className="group/title block">
                <h1 className="line-clamp-2 text-2xl font-black leading-tight text-white transition-colors group-hover/title:text-[#f49e0b] sm:text-3xl">
                  {title}
                </h1>
              </Link>
              {item.title_romaji && item.title_romaji !== title && (
                <p className="mt-1 truncate text-sm font-bold text-[#8c7ab2]">{item.title_romaji}</p>
              )}
            </div>
            <span className="shrink-0 rounded border border-[#6f4302] bg-[#f49e0b]/15 px-3 py-1.5 text-xs font-black text-[#f49e0b]">
              {t(`fit.${getFitLabelKey(item.match_score)}`)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {item.genres.slice(0, 3).map((genre) => (
              <span key={genre} className="rounded bg-[#241d38] px-3 py-1 text-sm font-bold text-[#c8b7f4]">
                {genre}
              </span>
            ))}
          </div>

          <div className="mt-5 grid gap-3 text-sm font-semibold text-[#8c7ab2] sm:grid-cols-2">
            <span>{t("score")}: {item.average_score ? `${item.average_score}/100` : t("unscored")}</span>
            <span className="inline-flex items-center gap-2">
              <TvIcon className="size-4" />
              {item.episodes ? t("episodes", { count: item.episodes }) : getFormatYear(item) || t("updating")}
            </span>
          </div>

          <div className="mt-auto pt-8">
            {error && (
              <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
                {error}
              </p>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <ActionButton
                disabled={busy}
                onClick={() => runAction("completed", () => markRecommendationCompleted(item.id, locale))}
                className="border-green-500/25 bg-green-500/15 text-green-300 hover:border-green-400"
              >
                {pendingAction === "completed" ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
                {t("markedCompleted")}
              </ActionButton>
              <ActionButton
                disabled={busy}
                onClick={() => runAction("notInterested", () => markRecommendationNotInterested(item.id, locale))}
                className="border-red-500/25 bg-red-500/15 text-red-300 hover:border-red-400"
              >
                {pendingAction === "notInterested" ? <Loader2Icon className="size-4 animate-spin" /> : <ThumbsDownIcon className="size-4" />}
                {t("notInterested")}
              </ActionButton>
            </div>

            <button
              type="button"
              onClick={() => runAction("plan", () => addRecommendationToPlan(item.id, locale))}
              disabled={busy}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-[#f49e0b] px-4 text-sm font-black text-[#0a0a0f] transition-colors hover:bg-[#d68a09] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction === "plan" ? <Loader2Icon className="size-4 animate-spin" /> : <BookmarkPlusIcon className="size-4" />}
              {t("addToPlan")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(RecommendationSessionPanel);
