"use client";

import { memo, useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  BookmarkPlusIcon,
  CheckIcon,
  ChevronLeftIcon,
  ImageIcon,
  ThumbsDownIcon,
  TvIcon,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { buildAnimeDetailHref } from "@/lib/anime-url";
import { AppBadge, AppButton } from "@/components/ui";
import {
  addRecommendationToPlan,
  getRecommendationSession,
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

function RecommendationSessionPanel({ initialView, locale }: RecommendationSessionPanelProps) {
  const t = useTranslations("recommendations");
  const taxonomyT = useTranslations("taxonomy");
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const validatingRef = useRef(false);
  const item = view.currentItem;
  const busy = isPending || pendingAction !== null;

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!view.session || !view.currentItem) {
      router.replace("/profile");
    }
  }, [router, view.currentItem, view.session]);

  const validateSession = useCallback(() => {
    if (validatingRef.current || pendingAction !== null) return;

    validatingRef.current = true;
    setIsValidating(true);
    startTransition(async () => {
      try {
        const result = await getRecommendationSession();

        if (result.status === "error") {
          if (result.messageKey === "noActiveSession") {
            setView((currentView) => ({
              ...currentView,
              session: null,
              currentItem: null,
              pendingCount: 0,
            }));
            router.replace("/profile");
            return;
          }

          setError(t(`errors.${result.messageKey}`));
          return;
        }

        setView(result.view);
      } catch {
        setError(t("errors.recommendationFailed"));
      } finally {
        validatingRef.current = false;
        setIsValidating(false);
      }
    });
  }, [pendingAction, router, t]);

  useEffect(() => {
    function handlePageShow() {
      validateSession();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        validateSession();
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", validateSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    validateSession();

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", validateSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [validateSession]);

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

  if (isValidating || !view.session || !item) {
    return null;
  }

  const title = getTitle(item);

  return (
    <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-ui-sm border border-border-soft bg-bg-muted shadow-2xl">
      <div className="border-b border-border-soft px-4 py-3 sm:px-5">
        <Link
          href="/profile"
          className="inline-flex h-8 items-center gap-1.5 rounded-ui-sm border border-border-soft px-2.5 text-xs font-bold text-fg-muted transition-colors hover:border-brand hover:text-fg"
        >
          <ChevronLeftIcon className="size-4" />
          {t("backToProfile")}
        </Link>
      </div>
      <div className="grid md:grid-cols-[250px_minmax(0,1fr)]">
        <div className="relative min-h-[360px] overflow-hidden bg-surface-muted md:min-h-[440px]">
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
            <div className="flex size-full min-h-[360px] flex-col items-center justify-center gap-3 text-fg-subtle md:min-h-[440px]">
              <ImageIcon className="size-9" />
              <span className="text-xs font-semibold">poster</span>
            </div>
          )}
          <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black/70 to-transparent" />
          <AppBadge
            // variant="brand"
            className="absolute left-4 top-4 bg-black/50 text-brand!"
          >
            {[item.format, item.season_year].filter(Boolean).join(" · ") || "Anime"}
          </AppBadge>
        </div>

        <div className="flex min-h-[360px] flex-col px-5 py-6 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link href={buildAnimeDetailHref(item.anime_id, title)} className="group/title block">
                <h1 className="line-clamp-2 text-2xl font-black leading-tight text-fg transition-colors group-hover/title:text-brand sm:text-3xl">
                  {title}
                </h1>
              </Link>
              {item.title_romaji && item.title_romaji !== title && (
                <p className="mt-1 truncate text-sm font-bold text-fg-muted">{item.title_romaji}</p>
              )}
            </div>
            <AppBadge variant="brand" className="shrink-0 px-3 py-1.5 font-black">
              {t(`fit.${getFitLabelKey(item.match_score)}`)}
            </AppBadge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {item.genres.slice(0, 3).map((genre) => (
              <AppBadge key={genre} variant="neutral" className="px-3 py-1 text-sm">
                {taxonomyT(`genres.${genre}`)}
              </AppBadge>
            ))}
          </div>

          <div className="mt-5 grid gap-3 text-sm font-semibold text-fg-muted sm:grid-cols-2">
            <span>{t("score")}: {item.average_score ? `${item.average_score}/100` : t("unscored")}</span>
            <span className="inline-flex items-center gap-2">
              <TvIcon className="size-4" />
              {item.episodes ? t("episodes", { count: item.episodes }) : getFormatYear(item) || t("updating")}
            </span>
          </div>

          <div className="mt-auto pt-8">
            {error && (
              <p className="mb-4 rounded-ui-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
                {error}
              </p>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <AppButton
                type="button"
                variant="custom"
                size="md"
                disabled={busy}
                isLoading={pendingAction === "completed"}
                onClick={() => runAction("completed", () => markRecommendationCompleted(item.id, locale))}
                className="border-green-500/25 bg-green-500/15 text-green-300 hover:border-green-400"
                leftIcon={<CheckIcon className="size-4" />}
              >
                {t("markedCompleted")}
              </AppButton>
              <AppButton
                type="button"
                variant="danger"
                size="md"
                disabled={busy}
                isLoading={pendingAction === "notInterested"}
                onClick={() => runAction("notInterested", () => markRecommendationNotInterested(item.id, locale))}
                leftIcon={<ThumbsDownIcon className="size-4" />}
              >
                {t("notInterested")}
              </AppButton>
            </div>

            <AppButton
              type="button"
              onClick={() => runAction("plan", () => addRecommendationToPlan(item.id, locale))}
              disabled={busy}
              isLoading={pendingAction === "plan"}
              leftIcon={<BookmarkPlusIcon className="size-4" />}
              fullWidth
              className="mt-3"
            >
              {t("addToPlan")}
            </AppButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(RecommendationSessionPanel);
