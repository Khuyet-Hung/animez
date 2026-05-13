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
import { getVisiblePageNumbers } from "@/lib/pagination";
import type { AnimeMedia } from "@/types/anime";
import type { AnimeListEntry, AnimeListEntryInput, AnimeListStatus } from "@/types/anime-list";
import type {
  ProfileFieldErrorKey,
  ProfileStats,
  PublicAnimeListEntry,
  UserAnimeListEntry,
  UserProfile,
} from "@/types/profile";
import type { ChangeEvent } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeOffIcon,
  GlobeIcon,
  ImageIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  SettingsIcon,
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
    <section className="grid grid-cols-2 border-y border-[#1a1a24] bg-[#0d0d14] md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="border-r border-[#1a1a24] px-4 py-4 text-center last:border-r-0 md:px-6"
        >
          <p className={`text-xl font-black ${item.accent ? "text-[#f49e0b]" : "text-white"}`}>
            {item.value}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-normal text-[#5f6472]">
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
  const tabs: { key: ContentTab; label: string }[] = [
    { key: "list", label: "Danh sách" },
    { key: "posts", label: "Bài đăng" },
    { key: "settings", label: "Cài đặt hồ sơ" },
  ];

  return (
    <nav className="flex overflow-x-auto border-b border-[#1a1a24] bg-[#0d0d14] px-4 md:px-6">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`shrink-0 border-b-2 px-4 py-4 text-sm transition-colors ${
              isActive
                ? "border-[#f49e0b] font-black text-[#f49e0b]"
                : "border-transparent font-semibold text-[#9ca3af] hover:text-white"
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
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_FILTERS.map((filter) => {
        const isActive = activeStatus === filter;
        const count = filter === "all" ? stats.total_anime : getStatusCount(stats, filter);
        const label = filter === "all" ? "Tất cả" : statusLabels[filter];

        return (
          <button
            key={filter}
            type="button"
            onClick={() => onStatusChange(filter)}
            className={`rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
              isActive
                ? "border-[#f49e0b] bg-[#f49e0b] text-[#0a0a0f]"
                : "border-[#1a1a24] bg-[#0d0d14] text-[#9ca3af] hover:border-[#f49e0b]/60 hover:text-white"
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
  if (lastPage <= 1) return null;

  const visiblePages = getVisiblePageNumbers(currentPage, lastPage);

  return (
    <nav className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex h-10 items-center gap-1 rounded border border-[#1a1a24] bg-[#111118] px-3 text-sm font-bold text-white transition-colors hover:border-[#f49e0b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#1a1a24]"
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
          className={`flex size-10 items-center justify-center rounded text-sm font-black transition-colors ${
            page === currentPage
              ? "bg-[#f49e0b] text-[#0a0a0f]"
              : "border border-[#1a1a24] bg-[#111118] text-white hover:border-[#f49e0b]"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= lastPage}
        className="inline-flex h-10 items-center gap-1 rounded border border-[#1a1a24] bg-[#111118] px-3 text-sm font-bold text-white transition-colors hover:border-[#f49e0b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#1a1a24]"
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
    <div className="inline-grid h-11 grid-cols-2 rounded-full p-1 bg-[#111118] border-[0.5px] border-[#2a2a35] overflow-hidden">
      {options.map(({ value, label, Icon }) => {
        const active = isPublic === value;

        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(value)}
            disabled={disabled || active}
            className={`inline-flex rounded-full cursor-pointer min-w-[108px] items-center justify-center gap-2 px-3 text-sm font-black transition-colors disabled:cursor-not-allowed ${
              active
                ? "bg-[#f49e0b] text-black shadow-sm"
                : "text-[#9ca3af] bg-[#111118]"
            }`}
            aria-pressed={active}
          >
            {pendingValue === value ? (
              <Loader2Icon className={`size-4 animate-spin ${active ? "text-black" : "text-[#f49e0b]"}`} />
            ) : (
              <Icon className={`size-4 ${active ? "text-black" : "text-[#5f6472]"}`} />
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
    <div className="relative row-span-2 h-full min-h-[128px] w-20 self-stretch overflow-hidden rounded border border-[#1a1a24] bg-[#1a1a24] md:row-span-1 md:min-h-[104px] md:w-[72px]">
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
        <div className="flex size-full items-center justify-center text-[#5f6472]">
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
    return (
      <div className="rounded border border-[#1a1a24] bg-[#111118] px-5 py-12 text-center">
        <p className="text-sm font-semibold text-[#9ca3af]">{emptyLabel}</p>
      </div>
    );
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
            className="grid grid-cols-[80px_minmax(0,1fr)_40px] gap-3 rounded border border-[#1a1a24] bg-[#111118] px-3 py-4 transition-colors sm:px-4 md:grid-cols-[72px_minmax(0,1fr)_40px] md:items-stretch"
          >
            <Link href={`/anime/${entry.anime_id}`} aria-label={title}>
              <AnimeCover entry={entry} title={title} />
            </Link>

            <div className="min-w-0">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <Link
                  href={`/anime/${entry.anime_id}`}
                  className="block min-w-0 flex-1 truncate text-sm font-black text-white transition-colors hover:text-[#f49e0b]"
                >
                  {title}
                </Link>
                <span className="shrink-0 text-right text-xs font-semibold text-[#5f6472]">
                  {formatDate(entry.updated_at, locale)}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#5f6472]">
                {[entry.format?.replace("_", " "), entry.season_year].filter(Boolean).join(" · ") ||
                  "Anime"}
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`w-fit rounded-full border px-3 py-1 text-[11px] font-bold ${
                    ANIME_LIST_STATUS_BADGE_CLASS[entry.status]
                  }`}
                >
                  {labels.status[entry.status]}
                </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
                    <StarIcon className="size-3 fill-[#f49e0b] text-[#f49e0b]" />
                    {formatScore(entry.score)}
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-[#27272f]">
                  <div
                    className="h-full"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: STATUS_CHART_COLORS[entry.status],
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-[#9ca3af]">{progressLabel}</span>
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
                className="inline-flex justify-center cursor-pointer text-[#d1d5db] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Mở menu anime"
                aria-expanded={menuOpen}
                title="Tùy chọn"
              >
                {deleting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <MoreHorizontalIcon className="size-4" />
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-6 z-20 w-36 overflow-hidden rounded border border-[#2a2a35] bg-[#0d0d14] py-1 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuAnimeId(null);
                      onEdit(entry);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-bold text-[#d1d5db] transition-colors hover:bg-[#1a1a24] hover:text-white"
                  >
                    <PencilIcon className="size-4 text-[#f49e0b]" />
                    Sửa
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
                    Xóa
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
  const chartData = useMemo(
    () =>
      [
        { name: labels.watching, value: stats.watching, status: "watching" as const },
        { name: labels.planToWatch, value: stats.plan_to_watch, status: "plan_to_watch" as const },
        { name: labels.completed, value: stats.completed, status: "completed" as const },
        { name: "Tạm dừng", value: stats.on_hold, status: "on_hold" as const },
        { name: "Đã bỏ", value: stats.dropped, status: "dropped" as const },
      ].filter((item) => item.value > 0),
    [labels.completed, labels.planToWatch, labels.watching, stats.completed, stats.dropped, stats.on_hold, stats.plan_to_watch, stats.watching]
  );
  const visibleChartData =
    chartData.length > 0 ? chartData : [{ name: "Chưa có dữ liệu", value: 1, status: "completed" as const }];

  return (
    <aside className="rounded border border-[#1a1a24] bg-[#111118] p-5">
      <p className="text-xs font-bold uppercase tracking-normal text-[#5f6472]">Tổng quan</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded border border-[#1a1a24] bg-[#0d0d14] p-3">
          <p className="text-xl font-black text-green-300">{stats.watching}</p>
          <p className="mt-1 text-xs font-semibold text-[#5f6472]">{labels.watching}</p>
        </div>
        <div className="rounded border border-[#1a1a24] bg-[#0d0d14] p-3">
          <p className="text-xl font-black text-white">{stats.plan_to_watch}</p>
          <p className="mt-1 text-xs font-semibold text-[#5f6472]">{labels.planToWatch}</p>
        </div>
        <div className="rounded border border-[#1a1a24] bg-[#0d0d14] p-3">
          <p className="text-xl font-black text-white">{stats.completed}</p>
          <p className="mt-1 text-xs font-semibold text-[#5f6472]">{labels.completed}</p>
        </div>
        <div className="rounded border border-[#1a1a24] bg-[#0d0d14] p-3">
          <p className="text-xl font-black text-[#f49e0b]">{formatScore(stats.average_score)}</p>
          <p className="mt-1 text-xs font-semibold text-[#5f6472]">{labels.averageScore}</p>
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
            <span className="text-sm font-black text-white">{stats.total_anime}</span>
            <span className="text-[9px] font-semibold text-[#5f6472]">anime</span>
          </div>
        </div>
        <div className="space-y-2 text-xs font-semibold text-[#9ca3af]">
          {chartData.map((item) => (
            <p key={item.status}>
              <span
                className="mr-2 inline-block size-2 rounded-full"
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
        className="group relative block size-[88px] rounded-full outline-none transition-transform hover:scale-[1.02] focus-visible:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
        aria-label={t("changeAvatar")}
        title={t("changeAvatar")}
      >
        <ProfileAvatar src={avatarSrc} name={displayName} />
        <span className="absolute inset-0 rounded-full bg-black/0 transition-colors group-hover:bg-black/45 group-focus-visible:bg-black/45" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
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
  labels: {
    emptyList: string;
    recentList: string;
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
  labels,
}: ProfileDashboardProps) {
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
  const [editingEntry, setEditingEntry] = useState<UserAnimeListEntry | null>(null);
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [deletingAnimeId, setDeletingAnimeId] = useState<number | null>(null);

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
    <main className="min-h-screen bg-[#0a0a0f] pb-20 lg:pl-28 min-[1600px]:pl-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col">
        <section className="border-b border-[#1a1a24] bg-[#0d0d14] px-4 py-6 md:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <EditableProfileAvatar
                avatarSrc={resolvedAvatarSrc}
                currentAvatarUrl={profileAvatarUrl}
                displayName={profile.display_name}
                locale={locale}
                onAvatarUpdated={handleAvatarUpdated}
              />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black text-white md:text-3xl">
                  {profile.display_name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-[#9ca3af]">
                  <span>@{profile.username}</span>
                  {userEmail && (
                    <>
                      <span className="text-[#5f6472]">·</span>
                      <span>{userEmail}</span>
                    </>
                  )}
                </div>
                {profile.bio && (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d1d5db]">{profile.bio}</p>
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
                      ? "Vui lòng đăng nhập để cập nhật hồ sơ."
                      : "Không thể cập nhật trạng thái hồ sơ."}
                  </p>
                )}
              </div>
              {/* <Link
                href={`/u/${profile.username}`}
                className="inline-flex h-10 items-center gap-2 rounded bg-[#f49e0b] px-4 text-sm font-black text-[#0a0a0f] transition-colors hover:bg-[#d68a09]"
              >
                {labels.viewPublicProfile}
                <ExternalLinkIcon className="size-4" />
              </Link> */}
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
                  <p className="text-xs font-bold uppercase tracking-normal text-[#5f6472]">
                    {labels.recentList}
                  </p>
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
              <div className="rounded border border-[#1a1a24] bg-[#0d0d14] px-5 py-5 md:px-6">
                <div className="mb-5 flex items-center gap-2">
                  <SettingsIcon className="size-5 text-[#f49e0b]" />
                  <h2 className="text-xl font-black text-white">{labels.settings}</h2>
                </div>
                <ProfileSettingsForm
                  profile={{ ...profile, avatar_url: profileAvatarUrl, is_public: isPublic }}
                  locale={locale}
                />
              </div>
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
    </main>
  );
}
