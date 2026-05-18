"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import AnimeListEditor from "@/components/anime-list/AnimeListEditor";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfilePostsList from "@/components/profile/ProfilePostsList";
import ProfileSettingsForm from "@/components/profile/ProfileSettingsForm";
import RecommendationLoadingScreen from "@/components/recommendations/RecommendationLoadingScreen";
import { AppAlertDialog, AppButton, AppEmptyState, AppPanel } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import {
  updateProfileAvatarAction,
  updateProfileVisibilityAction,
} from "@/app/[locale]/profile/actions";
import { createClient } from "@/lib/supabase/client";
import { optimizeImageFile } from "@/lib/images/client-optimization";
import { PROFILE_AVATAR_UPDATED_EVENT } from "@/lib/profile/avatar-events";
import {
  clampAnimeListProgress,
  createAnimeListUpsertInput,
} from "@/lib/anime-list/normalizers";
import { ANIME_LIST_STATUS_BADGE_CLASS } from "@/lib/anime-list/constants";
import { buildAnimeDetailHref } from "@/lib/anime-url";
import { getVisiblePageNumbers } from "@/lib/pagination";
import type { AnimeMedia } from "@/types/anime";
import type { AnimeListEntry, AnimeListEntryInput, AnimeListStatus } from "@/types/anime-list";
import {
  replaceRecommendationSession,
  type RecommendationProfileSummary,
} from "@/lib/anime-recommendations/actions";
import type {
  ProfileFieldErrorKey,
  ProfileStats,
  PublicAnimeListEntry,
  UserAnimeListEntry,
  UserProfile,
} from "@/types/profile";
import type { ChangeEvent, MouseEvent } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeOffIcon,
  GlobeIcon,
  ImageIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";

const STATUS_FILTERS = [
  "all",
  "watching",
  "plan_to_watch",
  "completed",
  "on_hold",
  "dropped",
] as const;

type ContentTab = "list" | "posts" | "settings";
type StatusFilter = (typeof STATUS_FILTERS)[number];

const INITIAL_PROFILE_AVATAR_STATE = {
  status: "idle",
  messageKey: null,
  fieldErrors: {},
} satisfies Awaited<ReturnType<typeof updateProfileAvatarAction>>;

const ACCEPTED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_FILE_SIZE = 3 * 1024 * 1024;
const AVATAR_IMAGE_DIMENSION = 512;
const AVATAR_IMAGE_TARGET_SIZE = 256 * 1024;
const AVATAR_IMAGE_QUALITY = 0.84;
const AVATAR_IMAGE_OUTPUT_TYPE = "image/webp";
const PROFILE_LIST_PAGE_SIZE = 12;

const STATUS_CHART_COLORS: Record<AnimeListStatus, string> = {
  watching: "#60a5fa",
  completed: "#4ade80",
  on_hold: "#fde68a",
  dropped: "#f87171",
  plan_to_watch: "#67e8f9",
};

function getEntryTitle(entry: PublicAnimeListEntry) {
  return entry.title_english || entry.title_romaji || `Anime #${entry.anime_id}`;
}

function formatScore(score: number) {
  return score > 0 ? score.toFixed(1) : "-";
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(value));
}

function optimizeAvatarImage(file: File) {
  return optimizeImageFile(file, {
    maxDimension: AVATAR_IMAGE_DIMENSION,
    targetSize: AVATAR_IMAGE_TARGET_SIZE,
    quality: AVATAR_IMAGE_QUALITY,
    outputType: AVATAR_IMAGE_OUTPUT_TYPE,
    resizeMode: "cover-square",
    errorMessage: "Could not optimize avatar.",
  });
}

function getProgressPercent(entry: PublicAnimeListEntry) {
  if (!entry.total_episodes || entry.total_episodes <= 0) return 0;
  return Math.min(100, Math.round((entry.progress_episodes / entry.total_episodes) * 100));
}

function getStatusCount(stats: ProfileStats, status: AnimeListStatus) {
  return stats[status];
}

function createAnimeMediaFromEntry(entry: UserAnimeListEntry): AnimeMedia {
  return {
    id: entry.anime_id,
    title: {
      romaji: entry.title_romaji || entry.title_english || `Anime #${entry.anime_id}`,
      english: entry.title_english,
      native: null,
    },
    coverImage: {
      large: entry.cover_image || "",
      extraLarge: entry.cover_image || undefined,
    },
    format: entry.format,
    episodes: entry.total_episodes,
    season: entry.season,
    seasonYear: entry.season_year,
  };
}

function StatStrip({
  stats,
  labels,
}: {
  stats: ProfileStats;
  labels: {
    totalAnime: string;
    watching: string;
    completed: string;
    planToWatch: string;
    averageScore: string;
    watchedEpisodes: string;
  };
}) {
  const items = [
    { label: labels.totalAnime, value: stats.total_anime.toLocaleString() },
    { label: labels.watching, value: stats.watching.toLocaleString() },
    { label: labels.completed, value: stats.completed.toLocaleString() },
    { label: labels.planToWatch, value: stats.plan_to_watch.toLocaleString() },
    { label: labels.averageScore, value: formatScore(stats.average_score), accent: true },
    { label: labels.watchedEpisodes, value: stats.watched_episodes.toLocaleString() },
  ];

  return (
    <section className="grid grid-cols-2 border-y border-border bg-bg-muted md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="border-r border-border px-4 py-4 text-center last:border-r-0 md:px-6"
        >
          <p className={`text-xl font-black ${item.accent ? "text-brand" : "text-fg"}`}>
            {item.value}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-normal text-fg-subtle">
            {item.label}
          </p>
        </div>
      ))}
    </section>
  );
}

function ProfileTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: ContentTab;
  onTabChange: (tab: ContentTab) => void;
}) {
  const t = useTranslations("profile");
  const tabs: { key: ContentTab; label: string }[] = [
    { key: "list", label: t("tabs.list") },
    { key: "posts", label: t("tabs.posts") },
    { key: "settings", label: t("tabs.settings") },
  ];

  return (
    <nav className="flex overflow-x-auto border-b border-border bg-bg-muted px-4 md:px-6">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`shrink-0 border-b-2 px-4 py-4 text-sm transition-colors ${
              isActive
                ? "border-brand font-black text-brand"
                : "border-transparent font-semibold text-fg-muted hover:text-fg"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

function StatusFilters({
  activeStatus,
  stats,
  statusLabels,
  onStatusChange,
}: {
  activeStatus: StatusFilter;
  stats: ProfileStats;
  statusLabels: Record<AnimeListStatus, string>;
  onStatusChange: (status: StatusFilter) => void;
}) {
  const t = useTranslations("profile");
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto hide-scrollbar px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
      {STATUS_FILTERS.map((filter) => {
        const isActive = activeStatus === filter;
        const count = filter === "all" ? stats.total_anime : getStatusCount(stats, filter);
        const label = filter === "all" ? t("tabs.all") : statusLabels[filter];

        return (
          <button
            key={filter}
            type="button"
            onClick={() => onStatusChange(filter)}
            className={`shrink-0 rounded-ui-pill border px-3 py-2 text-xs font-bold transition-colors ${
              isActive
                ? "border-brand bg-brand text-brand-fg"
                : "border-border bg-bg-muted text-fg-muted hover:border-brand/60 hover:text-fg"
            }`}
          >
            {label} ({count})
          </button>
        );
      })}
    </div>
  );
}

function PaginationControls({
  currentPage,
  lastPage,
  labels,
  onPageChange,
}: {
  currentPage: number;
  lastPage: number;
  labels: {
    previous: string;
    next: string;
  };
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("profile");
  if (lastPage <= 1) return null;

  const visiblePages = getVisiblePageNumbers(currentPage, lastPage);

  return (
    <nav className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label={t("pagination.label")}>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex h-10 items-center gap-1 rounded-ui-sm border border-border bg-surface px-3 text-sm font-bold text-fg transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border"
      >
        <ChevronLeftIcon className="size-4" />
        {labels.previous}
      </button>

      {visiblePages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`flex size-10 items-center justify-center rounded-ui-sm text-sm font-black transition-colors ${
            page === currentPage
              ? "bg-brand text-brand-fg"
              : "border border-border bg-surface text-fg hover:border-brand"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= lastPage}
        className="inline-flex h-10 items-center gap-1 rounded-ui-sm border border-border bg-surface px-3 text-sm font-bold text-fg transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border"
      >
        {labels.next}
        <ChevronRightIcon className="size-4" />
      </button>
    </nav>
  );
}

function VisibilityToggle({
  isPublic,
  disabled,
  pendingValue,
  labels,
  onChange,
}: {
  isPublic: boolean;
  disabled: boolean;
  pendingValue: boolean | null;
  labels: {
    privateStatus: string;
    publicStatus: string;
  };
  onChange: (nextPublic: boolean) => void;
}) {
  const options = [
    { value: false, label: labels.privateStatus, Icon: EyeOffIcon },
    { value: true, label: labels.publicStatus, Icon: GlobeIcon },
  ];

  return (
    <div className="inline-grid h-11 grid-cols-2 overflow-hidden rounded-ui-pill border border-border-strong bg-surface py-1">
      {options.map(({ value, label, Icon }) => {
        const active = isPublic === value;

        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(value)}
            disabled={disabled || active}
            className={`inline-flex min-w-[108px] cursor-pointer items-center justify-center gap-2 rounded-ui-pill px-3 text-sm font-black transition-colors disabled:cursor-not-allowed ${
              active
                ? "bg-brand text-brand-fg shadow-sm"
                : "bg-surface text-fg-muted"
            }`}
            aria-pressed={active}
          >
            {pendingValue === value ? (
              <Loader2Icon className={`size-4 animate-spin ${active ? "text-brand-fg" : "text-brand"}`} />
            ) : (
              <Icon className={`size-4 ${active ? "text-brand-fg" : "text-fg-subtle"}`} />
            )}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function AnimeCover({ entry, title }: { entry: PublicAnimeListEntry; title: string }) {
  return (
    <div className="relative row-span-2 h-full min-h-[128px] w-20 self-stretch overflow-hidden rounded-ui-sm border border-border bg-border md:row-span-1 md:min-h-[104px] md:w-[72px]">
      {entry.cover_image ? (
        <Image
          src={entry.cover_image}
          alt={title}
          fill
          sizes="(min-width: 768px) 72px, 80px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex size-full items-center justify-center text-fg-subtle">
          <ImageIcon className="size-4" />
        </div>
      )}
    </div>
  );
}

function RecentAnimeList({
  entries,
  emptyLabel,
  locale,
  labels,
  onEdit,
  onDelete,
  deletingAnimeId,
}: {
  entries: UserAnimeListEntry[];
  emptyLabel: string;
  locale: string;
  labels: {
    status: Record<AnimeListStatus, string>;
  };
  onEdit: (entry: UserAnimeListEntry) => void;
  onDelete: (entry: UserAnimeListEntry) => Promise<boolean>;
  deletingAnimeId: number | null;
}) {
  const t = useTranslations("profile");
  const [openMenuAnimeId, setOpenMenuAnimeId] = useState<number | null>(null);

  useEffect(() => {
    if (openMenuAnimeId === null) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest("[data-anime-action-menu]")) {
        return;
      }

      setOpenMenuAnimeId(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openMenuAnimeId]);

  if (entries.length === 0) {
    return <AppEmptyState title={emptyLabel} className="py-12" />;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const title = getEntryTitle(entry);
        const progressPercent = getProgressPercent(entry);
        const progressLabel = `${entry.progress_episodes}/${entry.total_episodes ?? "?"}`;
        const menuOpen = openMenuAnimeId === entry.anime_id;
        const deleting = deletingAnimeId === entry.anime_id;

        return (
          <div
            key={entry.anime_id}
            className="grid grid-cols-[80px_minmax(0,1fr)_40px] gap-3 rounded-ui-sm border border-border bg-surface px-3 py-4 transition-colors sm:px-4 md:grid-cols-[72px_minmax(0,1fr)_40px] md:items-stretch"
          >
            <Link href={buildAnimeDetailHref(entry.anime_id, title)} aria-label={title}>
              <AnimeCover entry={entry} title={title} />
            </Link>

            <div className="min-w-0">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <Link
                  href={buildAnimeDetailHref(entry.anime_id, title)}
                  className="block min-w-0 flex-1 truncate text-sm font-black text-fg transition-colors hover:text-brand"
                >
                  {title}
                </Link>
                <span className="shrink-0 text-right text-xs font-semibold text-fg-subtle">
                  {formatDate(entry.updated_at, locale)}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-fg-subtle">
                {[entry.format?.replace("_", " "), entry.season_year].filter(Boolean).join(" · ") ||
                  t("animeFallback")}
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`w-fit rounded-ui-pill border px-3 py-1 text-[11px] font-bold ${
                    ANIME_LIST_STATUS_BADGE_CLASS[entry.status]
                  }`}
                >
                  {labels.status[entry.status]}
                </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-fg">
                    <StarIcon className="size-3 fill-brand text-brand" />
                    {formatScore(entry.score)}
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="h-1.5 overflow-hidden rounded-ui-pill bg-border-soft">
                  <div
                    className="h-full"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: STATUS_CHART_COLORS[entry.status],
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-fg-muted">{progressLabel}</span>
                </div>
              </div>
            </div>

            <div className="relative flex justify-end" data-anime-action-menu>
              <button
                type="button"
                onClick={() =>
                  setOpenMenuAnimeId((current) =>
                    current === entry.anime_id ? null : entry.anime_id
                  )
                }
                disabled={deleting}
                className="inline-flex cursor-pointer justify-center text-fg-soft transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={t("animeMenuLabel")}
                aria-expanded={menuOpen}
                title={t("options")}
              >
                {deleting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <MoreHorizontalIcon className="size-4" />
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-6 z-20 w-36 overflow-hidden rounded-ui-sm border border-border-strong bg-bg-muted py-1 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuAnimeId(null);
                      onEdit(entry);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-bold text-fg-soft transition-colors hover:bg-border hover:text-fg"
                  >
                    <PencilIcon className="size-4 text-brand" />
                    {t("edit")}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const deleted = await onDelete(entry);
                      if (deleted) setOpenMenuAnimeId(null);
                    }}
                    disabled={deleting}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-bold text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <Trash2Icon className="size-4" />
                    )}
                    {t("delete")}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OverviewCard({
  stats,
  labels,
}: {
  stats: ProfileStats;
  labels: {
    watching: string;
    completed: string;
    planToWatch: string;
    averageScore: string;
  };
}) {
  const t = useTranslations("profile");
  const chartData = useMemo(
    () =>
      [
        { name: labels.watching, value: stats.watching, status: "watching" as const },
        { name: labels.planToWatch, value: stats.plan_to_watch, status: "plan_to_watch" as const },
        { name: labels.completed, value: stats.completed, status: "completed" as const },
        { name: t("statusSummary.onHold"), value: stats.on_hold, status: "on_hold" as const },
        { name: t("statusSummary.dropped"), value: stats.dropped, status: "dropped" as const },
      ].filter((item) => item.value > 0),
    [labels.completed, labels.planToWatch, labels.watching, stats.completed, stats.dropped, stats.on_hold, stats.plan_to_watch, stats.watching, t]
  );
  const visibleChartData =
    chartData.length > 0 ? chartData : [{ name: t("statusSummary.noData"), value: 1, status: "completed" as const }];

  return (
    <aside className="rounded-ui-sm border border-border bg-surface p-5">
      <p className="text-xs font-bold uppercase tracking-normal text-fg-subtle">{t("overview")}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-ui-sm border border-border bg-bg-muted p-3">
          <p className="text-xl font-black text-green-300">{stats.watching}</p>
          <p className="mt-1 text-xs font-semibold text-fg-subtle">{labels.watching}</p>
        </div>
        <div className="rounded-ui-sm border border-border bg-bg-muted p-3">
          <p className="text-xl font-black text-fg">{stats.plan_to_watch}</p>
          <p className="mt-1 text-xs font-semibold text-fg-subtle">{labels.planToWatch}</p>
        </div>
        <div className="rounded-ui-sm border border-border bg-bg-muted p-3">
          <p className="text-xl font-black text-fg">{stats.completed}</p>
          <p className="mt-1 text-xs font-semibold text-fg-subtle">{labels.completed}</p>
        </div>
        <div className="rounded-ui-sm border border-border bg-bg-muted p-3">
          <p className="text-xl font-black text-brand">{formatScore(stats.average_score)}</p>
          <p className="mt-1 text-xs font-semibold text-fg-subtle">{labels.averageScore}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative size-20 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visibleChartData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={38}
                paddingAngle={chartData.length > 1 ? 2 : 0}
                stroke="none"
              >
                {visibleChartData.map((item) => (
                  <Cell key={item.status} fill={STATUS_CHART_COLORS[item.status]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-black text-fg">{stats.total_anime}</span>
            <span className="text-[9px] font-semibold text-fg-subtle">anime</span>
          </div>
        </div>
        <div className="space-y-2 text-xs font-semibold text-fg-muted">
          {chartData.map((item) => (
            <p key={item.status}>
              <span
                className="mr-2 inline-block size-2 rounded-ui-pill"
                style={{ backgroundColor: STATUS_CHART_COLORS[item.status] }}
              />
              {item.name} ({item.value})
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}

function EditableProfileAvatar({
  avatarSrc,
  currentAvatarUrl,
  displayName,
  locale,
  onAvatarUpdated,
}: {
  avatarSrc: string | null;
  currentAvatarUrl: string | null;
  displayName: string;
  locale: string;
  onAvatarUpdated: (avatarUrl: string | null) => void;
}) {
  const t = useTranslations("profile");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    updateProfileAvatarAction,
    INITIAL_PROFILE_AVATAR_STATE
  );
  const [clientError, setClientError] = useState<ProfileFieldErrorKey | null>(null);
  const [avatarProcessing, setAvatarProcessing] = useState(false);

  useEffect(() => {
    if (state.status !== "success") return;

    onAvatarUpdated(state.avatarUrl ?? null);
  }, [onAvatarUpdated, state.avatarUrl, state.status]);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
      setClientError("invalidAvatarFile");
      input.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setClientError("avatarTooLarge");
      input.value = "";
      return;
    }

    setClientError(null);
    setAvatarProcessing(true);

    try {
      const optimizedFile = await optimizeAvatarImage(file);

      if (optimizedFile !== file && typeof DataTransfer !== "undefined") {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(optimizedFile);
        input.files = dataTransfer.files;
      }

      formRef.current?.requestSubmit();
    } catch (error) {
      console.error("Failed to optimize profile avatar", error);
      setClientError("avatarUploadFailed");
      input.value = "";
    } finally {
      setAvatarProcessing(false);
    }
  }

  const serverErrorKey = state.fieldErrors.avatar_url;
  const errorKey = clientError ?? serverErrorKey;
  const busy = pending || avatarProcessing;

  return (
    <form ref={formRef} action={formAction} className="shrink-0">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="current_avatar_url" value={currentAvatarUrl ?? ""} />
      <input
        ref={inputRef}
        type="file"
        name="avatar_file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleAvatarChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="group relative block size-[88px] rounded-ui-pill outline-none transition-transform hover:scale-[1.02] focus-visible:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
        aria-label={t("changeAvatar")}
        title={t("changeAvatar")}
      >
        <ProfileAvatar src={avatarSrc} name={displayName} />
        <span className="absolute inset-0 rounded-ui-pill bg-black/0 transition-colors group-hover:bg-black/45 group-focus-visible:bg-black/45" />
        <span className="absolute inset-0 flex items-center justify-center rounded-ui-pill opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {busy ? (
            <Loader2Icon className="size-6 animate-spin text-white drop-shadow" />
          ) : (
            <PencilIcon className="size-6 text-white drop-shadow" />
          )}
        </span>
      </button>

      {errorKey && (
        <p className="mt-3 w-[120px] text-center text-xs font-semibold leading-5 text-red-300">
          {t(errorKey)}
        </p>
      )}
    </form>
  );
}

interface ProfileDashboardProps {
  avatarSrc: string | null;
  entries: UserAnimeListEntry[];
  locale: string;
  profile: UserProfile;
  stats: ProfileStats;
  userEmail: string | null;
  recommendationSummary: RecommendationProfileSummary;
  labels: {
    emptyList: string;
    recommendAnime: string;
    viewRecommendations: string;
    settings: string;
    privateStatus: string;
    publicStatus: string;
    viewPublicProfile: string;
    pagination: {
      previous: string;
      next: string;
    };
    status: Record<AnimeListStatus, string>;
    stats: {
      totalAnime: string;
      watching: string;
      completed: string;
      planToWatch: string;
      averageScore: string;
      watchedEpisodes: string;
    };
  };
}

export default function ProfileDashboard({
  avatarSrc,
  entries,
  locale,
  profile,
  stats,
  userEmail,
  recommendationSummary,
  labels,
}: ProfileDashboardProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ContentTab>("list");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [listPage, setListPage] = useState(1);
  const [dashboardEntries, setDashboardEntries] = useState(entries);
  const [isPublic, setIsPublic] = useState(profile.is_public);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(profile.avatar_url);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [pendingVisibility, setPendingVisibility] = useState<boolean | null>(null);
  const [isVisibilityPending, startVisibilityTransition] = useTransition();
  const [isRecommendationPending, startRecommendationTransition] = useTransition();
  const [editingEntry, setEditingEntry] = useState<UserAnimeListEntry | null>(null);
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [deletingAnimeId, setDeletingAnimeId] = useState<number | null>(null);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);
  const [showRecommendationLoading, setShowRecommendationLoading] = useState(false);
  const recommendationQuotaLabel = `${recommendationSummary.remainingMonthlySessions}/${recommendationSummary.monthlySessionLimit}`;

  useEffect(() => {
    setDashboardEntries(entries);
  }, [entries]);

  useEffect(() => {
    setIsPublic(profile.is_public);
  }, [profile.is_public]);

  useEffect(() => {
    setProfileAvatarUrl(profile.avatar_url);
  }, [profile.avatar_url]);

  const filteredEntries = useMemo(() => {
    if (activeStatus === "all") return dashboardEntries;

    return dashboardEntries.filter((entry) => entry.status === activeStatus);
  }, [activeStatus, dashboardEntries]);
  const listLastPage = Math.max(1, Math.ceil(filteredEntries.length / PROFILE_LIST_PAGE_SIZE));
  const listCurrentPage = Math.min(listPage, listLastPage);
  const paginatedEntries = useMemo(() => {
    const startIndex = (listCurrentPage - 1) * PROFILE_LIST_PAGE_SIZE;

    return filteredEntries.slice(startIndex, startIndex + PROFILE_LIST_PAGE_SIZE);
  }, [filteredEntries, listCurrentPage]);

  const resolvedAvatarSrc = profileAvatarUrl ?? avatarSrc;

  useEffect(() => {
    setListPage((currentPage) => Math.min(currentPage, listLastPage));
  }, [listLastPage]);

  function handleStatusChange(status: StatusFilter) {
    setActiveStatus(status);
    setListPage(1);
  }

  function handleListPageChange(page: number) {
    setListPage(Math.min(Math.max(page, 1), listLastPage));
  }

  const handleAvatarUpdated = useCallback(
    (avatarUrl: string | null) => {
      setProfileAvatarUrl(avatarUrl);
      window.dispatchEvent(
        new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, {
          detail: { avatarUrl },
        })
      );
      router.refresh();
    },
    [router]
  );

  function handleVisibilityChange(nextPublic: boolean) {
    if (nextPublic === isPublic) return;

    setVisibilityError(null);
    setPendingVisibility(nextPublic);
    setIsPublic(nextPublic);
    startVisibilityTransition(async () => {
      const result = await updateProfileVisibilityAction(nextPublic, locale);

      if (result.status === "error") {
        setIsPublic(!nextPublic);
        setPendingVisibility(null);
        setVisibilityError(result.messageKey);
        return;
      }

      setIsPublic(result.profile?.is_public ?? nextPublic);
      setPendingVisibility(null);
      router.refresh();
    });
  }

  function handleCreateNewAnalysis() {
    setShowRecommendationDialog(true);
  }

  function handleCreateRecommendation(event: MouseEvent<HTMLAnchorElement>) {
    if (
      recommendationSummary.hasActiveSession ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    setShowRecommendationLoading(true);

    startRecommendationTransition(async () => {
      const result = await replaceRecommendationSession(locale);

      if (result.status === "error") {
        setShowRecommendationLoading(false);
        window.alert(t(`recommendationErrors.${result.messageKey}`));
        return;
      }

      router.push("/profile/recommendations");
      router.refresh();
    });
  }

  function handleConfirmCreateNewAnalysis() {
    setShowRecommendationDialog(false);
    setShowRecommendationLoading(true);

    startRecommendationTransition(async () => {
      const result = await replaceRecommendationSession(locale);

      if (result.status === "error") {
        setShowRecommendationLoading(false);
        window.alert(t(`recommendationErrors.${result.messageKey}`));
        return;
      }

      router.push("/profile/recommendations");
      router.refresh();
    });
  }

  async function handleSaveEntry(input: AnimeListEntryInput) {
    if (!editingEntry) return null;

    setEntrySaving(true);
    setEntryError(null);

    const anime = createAnimeMediaFromEntry(editingEntry);
    const totalEpisodes = input.total_episodes ?? anime.episodes ?? null;
    const progressEpisodes =
      typeof input.progress_episodes === "number"
        ? clampAnimeListProgress(input.progress_episodes, totalEpisodes)
        : undefined;

    const payload = {
      user_id: editingEntry.user_id,
      ...createAnimeListUpsertInput(anime, {
        ...input,
        total_episodes: totalEpisodes,
        progress_episodes: progressEpisodes,
      }),
    };
    const supabase = createClient();
    const { data, error } = await supabase
      .from("anime_list_entries")
      .upsert(payload, { onConflict: "user_id,anime_id" })
      .select("*")
      .single();

    setEntrySaving(false);

    if (error) {
      setEntryError(error.message);
      return null;
    }

    const nextEntry = data as UserAnimeListEntry;
    setEditingEntry(nextEntry);
    setDashboardEntries((currentEntries) =>
      currentEntries.map((entry) => (entry.anime_id === nextEntry.anime_id ? nextEntry : entry))
    );
    router.refresh();
    return nextEntry as AnimeListEntry;
  }

  async function handleDeleteEntry(targetEntry = editingEntry) {
    if (!targetEntry) return false;

    setDeletingAnimeId(targetEntry.anime_id);
    setEntrySaving(true);
    setEntryError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("anime_list_entries")
      .delete()
      .eq("user_id", targetEntry.user_id)
      .eq("anime_id", targetEntry.anime_id);

    setDeletingAnimeId(null);
    setEntrySaving(false);

    if (error) {
      setEntryError(error.message);
      return false;
    }

    setDashboardEntries((currentEntries) =>
      currentEntries.filter((entry) => entry.anime_id !== targetEntry.anime_id)
    );
    router.refresh();
    return true;
  }

  return (
    <main className="min-h-screen bg-bg pb-20 lg:pl-28 min-[1600px]:pl-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col">
        <section className="border-b border-border bg-bg-muted px-4 py-6 md:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between items-center">
            <div className="flex items-center gap-4">
              <EditableProfileAvatar
                avatarSrc={resolvedAvatarSrc}
                currentAvatarUrl={profileAvatarUrl}
                displayName={profile.display_name}
                locale={locale}
                onAvatarUpdated={handleAvatarUpdated}
              />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black text-fg md:text-3xl">
                  {profile.display_name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-fg-muted">
                  <span>@{profile.username}</span>
                  {userEmail && (
                    <>
                      <span className="text-fg-subtle">·</span>
                      <span>{userEmail}</span>
                    </>
                  )}
                </div>
                {profile.bio && (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-fg-soft">{profile.bio}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <VisibilityToggle
                    isPublic={isPublic}
                    disabled={isVisibilityPending}
                    pendingValue={pendingVisibility}
                    labels={{
                      privateStatus: labels.privateStatus,
                      publicStatus: labels.publicStatus,
                    }}
                    onChange={handleVisibilityChange}
                  />
                </div>
                {visibilityError && (
                  <p className="text-xs font-semibold text-red-300">
                    {visibilityError === "loginRequired"
                      ? t("loginRequired")
                      : t("visibilityUpdateFailed")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <StatStrip stats={stats} labels={labels.stats} />
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="grid gap-5 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            {activeTab === "list" && (
              <>
                <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/profile/recommendations"
                      onClick={handleCreateRecommendation}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-ui-sm bg-brand px-3 text-xs font-black text-brand-fg transition-colors hover:bg-brand-hover"
                    >
                      <SparklesIcon className="size-4" />
                      {recommendationSummary.hasActiveSession ? labels.viewRecommendations : labels.recommendAnime}
                      <span className="rounded-ui-xs bg-bg/15 px-1.5 py-0.5 tabular-nums">
                        {recommendationQuotaLabel}
                      </span>
                    </Link>
                    {recommendationSummary.hasActiveSession && (
                      <AppButton
                        type="button"
                        variant="custom"
                        size="sm"
                        onClick={handleCreateNewAnalysis}
                        isLoading={isRecommendationPending}
                        disabled={recommendationSummary.remainingMonthlySessions <= 0}
                        leftIcon={<PlusIcon className="size-4" />}
                        className="border border-brand/40 bg-brand/10 text-brand hover:border-brand hover:text-fg"
                      >
                        {t("createNewAnalysis")}
                      </AppButton>
                    )}
                  </div>
                  <StatusFilters
                    activeStatus={activeStatus}
                    stats={stats}
                    statusLabels={labels.status}
                    onStatusChange={handleStatusChange}
                  />
                </div>
                <RecentAnimeList
                  entries={paginatedEntries}
                  emptyLabel={labels.emptyList}
                  locale={locale}
                  labels={{ status: labels.status }}
                  onEdit={setEditingEntry}
                  onDelete={handleDeleteEntry}
                  deletingAnimeId={deletingAnimeId}
                />
                <PaginationControls
                  currentPage={listCurrentPage}
                  lastPage={listLastPage}
                  labels={labels.pagination}
                  onPageChange={handleListPageChange}
                />
              </>
            )}

            {activeTab === "posts" && <ProfilePostsList profile={{ ...profile, avatar_url: profileAvatarUrl }} />}

            {activeTab === "settings" && (
              <AppPanel variant="muted" className="px-5 py-5 md:px-6">
                <div className="mb-5 flex items-center gap-2">
                  <SettingsIcon className="size-5 text-brand" />
                  <h2 className="text-xl font-black text-fg">{labels.settings}</h2>
                </div>
                <ProfileSettingsForm
                  profile={{ ...profile, avatar_url: profileAvatarUrl, is_public: isPublic }}
                  locale={locale}
                />
              </AppPanel>
            )}
          </section>

          <div className="hidden space-y-5 xl:block">
            <OverviewCard stats={stats} labels={labels.stats} />
          </div>
        </div>
      </div>
      {editingEntry && (
        <AnimeListEditor
          key={`${editingEntry.id}-${editingEntry.updated_at}`}
          anime={createAnimeMediaFromEntry(editingEntry)}
          entry={editingEntry}
          open={true}
          saving={entrySaving}
          error={entryError}
          onClose={() => setEditingEntry(null)}
          onSave={handleSaveEntry}
          onDelete={handleDeleteEntry}
        />
      )}
      <AppAlertDialog
        open={showRecommendationDialog}
        title={t("createNewAnalysis")}
        description={t("replaceRecommendationDescription")}
        confirmLabel={t("createNewAnalysis")}
        cancelLabel={t("cancel")}
        onConfirm={handleConfirmCreateNewAnalysis}
        onCancel={() => setShowRecommendationDialog(false)}
        isConfirming={isRecommendationPending}
      />
      {showRecommendationLoading && (
        <div className="fixed inset-0 z-[130] bg-bg">
          <RecommendationLoadingScreen contentAs="div" />
        </div>
      )}
    </main>
  );
}
