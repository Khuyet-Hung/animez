import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ProfileAnimeList from "@/components/profile/ProfileAnimeList";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileStats from "@/components/profile/ProfileStats";
import { Link } from "@/i18n/navigation";
import { coerceProfileStats } from "@/lib/profile/server";
import { getVisiblePageNumbers } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { ANIME_LIST_STATUSES } from "@/lib/anime-list/constants";
import type { AnimeListStatus } from "@/types/anime-list";
import type { ProfileStats as ProfileStatsType, PublicAnimeListEntry, PublicProfileView } from "@/types/profile";
import { ChevronLeftIcon, ChevronRightIcon, LockIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { createSeoMetadata, truncateSeoDescription } from "@/lib/seo";

interface PublicProfilePageProps {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}

const PROFILE_LIST_PAGE_SIZE = 12;
const STATUS_FILTERS = ["all", ...ANIME_LIST_STATUSES] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function getStatusFilter(value: string | undefined): StatusFilter {
  return STATUS_FILTERS.includes(value as StatusFilter) ? (value as StatusFilter) : "all";
}

function getStatusLabels(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    watching: t("status.watching"),
    completed: t("status.completed"),
    on_hold: t("status.on_hold"),
    dropped: t("status.dropped"),
    plan_to_watch: t("status.plan_to_watch"),
  } satisfies Record<AnimeListStatus, string>;
}

function getPageParam(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function getStatusCount(stats: ProfileStatsType, status: StatusFilter) {
  if (status === "all") return stats.total_anime;

  return stats[status];
}

function buildStatusHref(username: string, status: StatusFilter) {
  if (status === "all") return `/u/${username}`;
  return `/u/${username}?status=${status}`;
}

function buildPageHref(username: string, status: StatusFilter, page: number) {
  const params = new URLSearchParams();

  if (status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();

  return query ? `/u/${username}?${query}` : `/u/${username}`;
}

function PublicProfilePagination({
  username,
  activeStatus,
  currentPage,
  lastPage,
  labels,
}: {
  username: string;
  activeStatus: StatusFilter;
  currentPage: number;
  lastPage: number;
  labels: {
    previous: string;
    next: string;
  };
}) {
  if (lastPage <= 1) return null;

  const visiblePages = getVisiblePageNumbers(currentPage, lastPage);

  return (
    <nav className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang">
      <Link
        href={buildPageHref(username, activeStatus, currentPage - 1)}
        aria-disabled={currentPage <= 1}
        className={`inline-flex h-10 items-center gap-1 rounded border px-3 text-sm font-bold transition-colors ${
          currentPage <= 1
            ? "pointer-events-none border-[#1a1a24] bg-[#111118] text-white opacity-40"
            : "border-[#1a1a24] bg-[#111118] text-white hover:border-[#f49e0b]"
        }`}
      >
        <ChevronLeftIcon className="size-4" />
        {labels.previous}
      </Link>

      {visiblePages.map((page) => (
        <Link
          key={page}
          href={buildPageHref(username, activeStatus, page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`flex size-10 items-center justify-center rounded text-sm font-black transition-colors ${
            page === currentPage
              ? "bg-[#f49e0b] text-[#0a0a0f]"
              : "border border-[#1a1a24] bg-[#111118] text-white hover:border-[#f49e0b]"
          }`}
        >
          {page}
        </Link>
      ))}

      <Link
        href={buildPageHref(username, activeStatus, currentPage + 1)}
        aria-disabled={currentPage >= lastPage}
        className={`inline-flex h-10 items-center gap-1 rounded border px-3 text-sm font-bold transition-colors ${
          currentPage >= lastPage
            ? "pointer-events-none border-[#1a1a24] bg-[#111118] text-white opacity-40"
            : "border-[#1a1a24] bg-[#111118] text-white hover:border-[#f49e0b]"
        }`}
      >
        {labels.next}
        <ChevronRightIcon className="size-4" />
      </Link>
    </nav>
  );
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { locale, username } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("get_public_profile", { profile_username: username })
    .maybeSingle();
  const profile = data as PublicProfileView | null;

  if (!profile?.is_public) {
    return createSeoMetadata({
      locale,
      path: `/u/${username}`,
      title: `@${username}`,
      noIndex: true,
    });
  }

  const title = profile.display_name
    ? `${profile.display_name} (@${profile.username})`
    : `@${profile.username}`;
  const description = profile.bio
    ? truncateSeoDescription(profile.bio)
    : `View @${profile.username}'s public anime list and profile stats on Animez.`;

  return createSeoMetadata({
    locale,
    path: `/u/${profile.username}`,
    title,
    description,
    image: profile.avatar_url,
  });
}

function PrivateProfileState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex min-h-[52vh] w-full max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-[#1a1a24] bg-[#111118] text-[#f49e0b]">
        <LockIcon className="size-6" />
      </div>
      <h1 className="mt-5 text-2xl font-black text-white">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[#9ca3af]">{description}</p>
    </div>
  );
}

export default async function PublicProfilePage({ params, searchParams }: PublicProfilePageProps) {
  const { locale, username } = await params;
  const { status, page } = await searchParams;
  setRequestLocale(locale);

  const profileT = await getTranslations("profile");
  const animeListT = await getTranslations("animeList");
  const supabase = await createClient();
  const activeStatus = getStatusFilter(status);
  const requestedPage = getPageParam(page);

  const { data: profileData, error: profileError } = await supabase
    .rpc("get_public_profile", { profile_username: username })
    .maybeSingle();

  if (profileError || !profileData) {
    notFound();
  }

  const profile = profileData as PublicProfileView;

  if (!profile.is_public) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#0a0a0f] lg:pl-28 min-[1600px]:pl-6">
          <PrivateProfileState
            title={profileT("privateProfile")}
            description={profileT("privateProfileDescription")}
          />
        </main>
        <Footer />
      </>
    );
  }

  const statsResult = await supabase
    .rpc("get_public_profile_stats", { profile_username: username })
    .maybeSingle();
  const stats = coerceProfileStats(statsResult.data as Partial<ProfileStatsType> | null);
  const totalEntries = getStatusCount(stats, activeStatus);
  const lastPage = Math.max(1, Math.ceil(totalEntries / PROFILE_LIST_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, lastPage);
  const listResult = await supabase.rpc("get_public_anime_list", {
    profile_username: username,
    entry_status: activeStatus === "all" ? null : activeStatus,
    limit_count: PROFILE_LIST_PAGE_SIZE,
    offset_count: (currentPage - 1) * PROFILE_LIST_PAGE_SIZE,
  });
  const entries = ((listResult.data ?? []) as PublicAnimeListEntry[]).map((entry) => ({
    ...entry,
    anime_id: Number(entry.anime_id),
  }));
  const statusLabels = getStatusLabels(animeListT);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-8 pb-20 md:px-6 lg:pl-28 min-[1600px]:pl-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8">
          <section className="rounded border border-[#1a1a24] bg-[#0d0d14] px-5 py-8 md:px-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <ProfileAvatar src={profile.avatar_url} name={profile.display_name ?? profile.username} />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-normal text-[#f49e0b]">
                  {profileT("publicTitle")}
                </p>
                <h1 className="mt-1 text-3xl font-black text-white md:text-5xl">
                  {profile.display_name}
                </h1>
                <p className="mt-2 text-sm font-semibold text-[#9ca3af]">@{profile.username}</p>
                {profile.bio && (
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-[#d1d5db]">{profile.bio}</p>
                )}
              </div>
            </div>
          </section>

          <ProfileStats
            stats={stats}
            labels={{
              totalAnime: profileT("stats.totalAnime"),
              watching: profileT("stats.watching"),
              completed: profileT("stats.completed"),
              planToWatch: profileT("stats.planToWatch"),
              averageScore: profileT("stats.averageScore"),
              watchedEpisodes: profileT("stats.watchedEpisodes"),
            }}
          />

          <section>
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-[#f49e0b]">
                  {profileT("publicList")}
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">{profileT("animeList")}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((filter) => (
                  <Link
                    key={filter}
                    href={buildStatusHref(profile.username, filter)}
                    className={`rounded border px-3 py-2 text-xs font-bold transition-colors ${
                      activeStatus === filter
                        ? "border-[#f49e0b] bg-[#f49e0b]/10 text-[#f49e0b]"
                        : "border-[#1a1a24] bg-[#111118] text-[#9ca3af] hover:border-[#f49e0b]/60 hover:text-white"
                    }`}
                  >
                    {filter === "all" ? profileT("tabs.all") : statusLabels[filter]}
                  </Link>
                ))}
              </div>
            </div>

            {listResult.error ? (
              <div className="rounded border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-300">
                {profileT("listLoadFailed")}
              </div>
            ) : (
              <ProfileAnimeList
                entries={entries}
                emptyLabel={profileT("emptyPublicList")}
                labels={{
                  score: animeListT("score"),
                  progress: animeListT("progress"),
                  updated: profileT("updated"),
                  status: statusLabels,
                }}
              />
            )}
            {!listResult.error && (
              <PublicProfilePagination
                username={profile.username}
                activeStatus={activeStatus}
                currentPage={currentPage}
                lastPage={lastPage}
                labels={{
                  previous: profileT("pagination.previous"),
                  next: profileT("pagination.next"),
                }}
              />
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
