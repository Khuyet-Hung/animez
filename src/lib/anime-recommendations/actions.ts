"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { anilistClient } from "@/lib/anilist";
import {
  RECOMMENDATION_CANDIDATES_QUERY,
  RECOMMENDATION_ENTRY_METADATA_QUERY,
} from "@/lib/anime-recommendations/queries";
import {
  buildRecommendationProfile,
  rankRecommendationCandidates,
  type RecommendationSourceEntry,
} from "@/lib/anime-recommendations/ranking";
import type { AnimeMedia, MediaFormat, MediaSort } from "@/types/anime";
import type {
  RecommendationActionResult,
  RecommendationItem,
  RecommendationSession,
  RecommendationSessionView,
} from "@/types/anime-recommendations";

const MONTHLY_SESSION_LIMIT = 20;
const RECOMMENDATION_COUNT = 30;
const RECOMMENDATIONS_PATH = "/profile/recommendations";

export interface RecommendationProfileSummary {
  hasActiveSession: boolean;
  monthlySessionLimit: number;
  remainingMonthlySessions: number;
}

interface EntryMetadataData {
  Page: {
    media: AnimeMedia[];
  };
}

interface CandidatesData {
  Page: {
    media: AnimeMedia[];
  };
}

interface RawRecommendationSession extends Omit<RecommendationSession, "profile_snapshot" | "search_fields"> {
  profile_snapshot: unknown;
  search_fields: unknown;
}

interface RawRecommendationItem extends Omit<RecommendationItem, "anime_id" | "match_score" | "reason"> {
  anime_id: string | number;
  match_score: string | number;
  reason: unknown;
}

function normalizeSession(session: RawRecommendationSession): RecommendationSession {
  return {
    ...session,
    profile_snapshot: session.profile_snapshot as RecommendationSession["profile_snapshot"],
    search_fields: session.search_fields as RecommendationSession["search_fields"],
  };
}

function normalizeItem(item: RawRecommendationItem): RecommendationItem {
  return {
    ...item,
    anime_id: Number(item.anime_id),
    match_score: Number(item.match_score),
    reason: item.reason as RecommendationItem["reason"],
  };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return { start: start.toISOString(), end: end.toISOString() };
}

function getRemainingSessions(createdThisMonth: number) {
  return Math.max(0, MONTHLY_SESSION_LIMIT - createdThisMonth);
}

function toDateInt(year: number | null) {
  return year ? Number(`${year}0101`) : undefined;
}

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

async function countMonthlySessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { start, end } = getMonthRange();
  const { count } = await supabase
    .from("anime_recommendation_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start)
    .lt("created_at", end);

  return count ?? 0;
}

async function buildSessionView(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  session: RecommendationSession | null
): Promise<RecommendationSessionView> {
  const createdThisMonth = await countMonthlySessions(supabase, userId);

  if (!session) {
    return {
      session: null,
      currentItem: null,
      totalCount: 0,
      pendingCount: 0,
      remainingMonthlySessions: getRemainingSessions(createdThisMonth),
    };
  }

  const { data: itemsData } = await supabase
    .from("anime_recommendation_items")
    .select("*")
    .eq("session_id", session.id)
    .eq("user_id", userId)
    .order("rank", { ascending: true });

  const items = ((itemsData ?? []) as RawRecommendationItem[]).map(normalizeItem);
  const pendingItems = items.filter((item) => item.state === "pending");

  return {
    session,
    currentItem: pendingItems[0] ?? null,
    totalCount: items.length,
    pendingCount: pendingItems.length,
    remainingMonthlySessions: getRemainingSessions(createdThisMonth),
  };
}

async function getActiveSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("anime_recommendation_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return data ? normalizeSession(data as RawRecommendationSession) : null;
}

async function fetchEntryMetadata(entries: RecommendationSourceEntry[]) {
  const ids = entries.map((entry) => entry.anime_id).slice(0, 50);
  if (ids.length === 0) return entries;

  try {
    const data = await anilistClient.request<EntryMetadataData>(RECOMMENDATION_ENTRY_METADATA_QUERY, {
      ids,
    });
    const metadataById = new Map(data.Page.media.map((anime) => [anime.id, anime]));

    return entries.map((entry) => {
      const metadata = metadataById.get(entry.anime_id);

      return {
        ...entry,
        genres: metadata?.genres ?? [],
        format: entry.format ?? metadata?.format ?? null,
        season_year: entry.season_year ?? metadata?.seasonYear ?? null,
        total_episodes: entry.total_episodes ?? metadata?.episodes ?? null,
      };
    });
  } catch {
    return entries;
  }
}

async function fetchCandidates(
  searchFields: ReturnType<typeof buildRecommendationProfile>["searchFields"]
) {
  const genres = searchFields.genres.length > 0 ? searchFields.genres : [undefined];
  const formats = searchFields.formats.length > 0 ? searchFields.formats.slice(0, 2) : [undefined];
  const sorts = searchFields.sortCandidates as MediaSort[];
  const requests: Promise<CandidatesData>[] = [];

  for (const sort of sorts) {
    for (const genre of genres.slice(0, 3)) {
      requests.push(
        anilistClient.request<CandidatesData>(RECOMMENDATION_CANDIDATES_QUERY, {
          page: 1,
          perPage: 20,
          genre,
          sort: [sort],
          seasonYearGreater: toDateInt(searchFields.yearRange.from),
          seasonYearLesser: toDateInt(searchFields.yearRange.to),
        })
      );
    }
  }

  for (const format of formats) {
    if (!format) continue;
    requests.push(
      anilistClient.request<CandidatesData>(RECOMMENDATION_CANDIDATES_QUERY, {
        page: 1,
        perPage: 20,
        format: format as MediaFormat,
        sort: ["POPULARITY_DESC"],
      })
    );
  }

  if (requests.length === 0) {
    requests.push(
      anilistClient.request<CandidatesData>(RECOMMENDATION_CANDIDATES_QUERY, {
        page: 1,
        perPage: 50,
        sort: ["TRENDING_DESC"],
      })
    );
  }

  const settled = await Promise.allSettled(requests);

  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value.Page.media : []));
}

async function createSessionForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<RecommendationActionResult> {
  const createdThisMonth = await countMonthlySessions(supabase, userId);
  if (createdThisMonth >= MONTHLY_SESSION_LIMIT) {
    return { status: "error", messageKey: "quotaExceeded" };
  }

  const { data: entriesData, error: entriesError } = await supabase
    .from("anime_list_entries")
    .select("anime_id,status,score,total_episodes,title_romaji,title_english,cover_image,format,season_year")
    .eq("user_id", userId)
    .limit(500);

  if (entriesError) {
    return { status: "error", messageKey: "recommendationFailed" };
  }

  const { data: notInterestedData } = await supabase
    .from("anime_not_interested")
    .select("anime_id")
    .eq("user_id", userId)
    .limit(1000);

  const sourceEntries = await fetchEntryMetadata(
    ((entriesData ?? []) as RecommendationSourceEntry[]).map((entry) => ({
      ...entry,
      anime_id: Number(entry.anime_id),
      genres: [],
    }))
  );
  const notInterestedAnimeIds = ((notInterestedData ?? []) as { anime_id: number | string }[]).map((entry) =>
    Number(entry.anime_id)
  );
  const { snapshot, searchFields } = buildRecommendationProfile(sourceEntries, notInterestedAnimeIds);
  const candidates = await fetchCandidates(searchFields);
  const excludedAnimeIds = new Set(snapshot.excludedAnimeIds);
  const rankedCandidates = rankRecommendationCandidates(
    candidates,
    snapshot,
    excludedAnimeIds,
    RECOMMENDATION_COUNT
  );

  if (rankedCandidates.length === 0) {
    return { status: "error", messageKey: "noCandidatesLeft" };
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from("anime_recommendation_sessions")
    .insert({
      user_id: userId,
      profile_snapshot: snapshot,
      search_fields: searchFields,
      current_rank: 1,
    })
    .select("*")
    .single();

  if (sessionError) {
    const activeSession = await getActiveSession(supabase, userId);
    if (activeSession) {
      return { status: "success", view: await buildSessionView(supabase, userId, activeSession) };
    }

    return { status: "error", messageKey: "recommendationFailed" };
  }

  const session = normalizeSession(sessionData as RawRecommendationSession);
  const items = rankedCandidates.map(({ anime, matchScore, reason }, index) => ({
    session_id: session.id,
    user_id: userId,
    anime_id: anime.id,
    rank: index + 1,
    match_score: matchScore,
    reason,
    title_romaji: anime.title.romaji || null,
    title_english: anime.title.english || null,
    cover_image: anime.coverImage?.large || anime.coverImage?.extraLarge || null,
    format: anime.format || null,
    episodes: anime.episodes ?? null,
    season_year: anime.seasonYear ?? null,
    average_score: anime.averageScore ?? null,
    popularity: anime.popularity ?? null,
    genres: anime.genres ?? [],
  }));
  const { error: itemsError } = await supabase.from("anime_recommendation_items").insert(items);

  if (itemsError) {
    await supabase
      .from("anime_recommendation_sessions")
      .update({ status: "exhausted", completed_at: new Date().toISOString() })
      .eq("id", session.id)
      .eq("user_id", userId);

    return { status: "error", messageKey: "recommendationFailed" };
  }

  return { status: "success", view: await buildSessionView(supabase, userId, session) };
}

export async function getOrCreateRecommendationSession(): Promise<RecommendationActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { status: "error", messageKey: "loginRequired" };

  const activeSession = await getActiveSession(supabase, user.id);
  if (activeSession) {
    return { status: "success", view: await buildSessionView(supabase, user.id, activeSession) };
  }

  return createSessionForUser(supabase, user.id);
}

export async function getRecommendationProfileSummary(): Promise<RecommendationProfileSummary> {
  const { supabase, user } = await getCurrentUser();
  if (!user) {
    return {
      hasActiveSession: false,
      monthlySessionLimit: MONTHLY_SESSION_LIMIT,
      remainingMonthlySessions: 0,
    };
  }

  const [activeSession, createdThisMonth] = await Promise.all([
    getActiveSession(supabase, user.id),
    countMonthlySessions(supabase, user.id),
  ]);

  return {
    hasActiveSession: activeSession !== null,
    monthlySessionLimit: MONTHLY_SESSION_LIMIT,
    remainingMonthlySessions: getRemainingSessions(createdThisMonth),
  };
}

async function advanceSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string
) {
  const { data: nextItemData } = await supabase
    .from("anime_recommendation_items")
    .select("rank")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .eq("state", "pending")
    .order("rank", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextItemData) {
    await supabase
      .from("anime_recommendation_sessions")
      .update({ status: "exhausted", completed_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", userId);
    return;
  }

  await supabase
    .from("anime_recommendation_sessions")
    .update({ current_rank: Number((nextItemData as { rank: number }).rank) })
    .eq("id", sessionId)
    .eq("user_id", userId);
}

async function loadPendingItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  itemId: string
) {
  const { data } = await supabase
    .from("anime_recommendation_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", userId)
    .eq("state", "pending")
    .maybeSingle();

  return data ? normalizeItem(data as RawRecommendationItem) : null;
}

async function returnUpdatedView(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  locale: string
): Promise<RecommendationActionResult> {
  const activeSession = await getActiveSession(supabase, userId);
  revalidatePath(`/${locale}${RECOMMENDATIONS_PATH}`);
  revalidatePath(`/${locale}/profile`);

  return {
    status: "success",
    view: await buildSessionView(supabase, userId, activeSession),
  };
}

export async function markRecommendationCompleted(
  itemId: string,
  locale: string
): Promise<RecommendationActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { status: "error", messageKey: "loginRequired" };

  const item = await loadPendingItem(supabase, user.id, itemId);
  if (!item) return { status: "error", messageKey: "recommendationFailed" };

  const totalEpisodes = item.episodes ?? null;
  const { error: listError } = await supabase.from("anime_list_entries").upsert(
    {
      user_id: user.id,
      anime_id: item.anime_id,
      status: "completed",
      score: 0,
      progress_episodes: totalEpisodes ?? 0,
      total_episodes: totalEpisodes,
      title_romaji: item.title_romaji,
      title_english: item.title_english,
      cover_image: item.cover_image,
      format: item.format,
      season_year: item.season_year,
    },
    { onConflict: "user_id,anime_id" }
  );

  if (listError) return { status: "error", messageKey: "recommendationFailed" };

  await supabase
    .from("anime_recommendation_items")
    .update({ state: "marked_completed", state_changed_at: new Date().toISOString() })
    .eq("id", item.id)
    .eq("user_id", user.id);
  await advanceSession(supabase, user.id, item.session_id);

  return returnUpdatedView(supabase, user.id, locale);
}

export async function markRecommendationNotInterested(
  itemId: string,
  locale: string
): Promise<RecommendationActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { status: "error", messageKey: "loginRequired" };

  const item = await loadPendingItem(supabase, user.id, itemId);
  if (!item) return { status: "error", messageKey: "recommendationFailed" };

  await supabase.from("anime_not_interested").upsert(
    {
      user_id: user.id,
      anime_id: item.anime_id,
      title_romaji: item.title_romaji,
      title_english: item.title_english,
      cover_image: item.cover_image,
      format: item.format,
    },
    { onConflict: "user_id,anime_id" }
  );
  await supabase
    .from("anime_recommendation_items")
    .update({ state: "not_interested", state_changed_at: new Date().toISOString() })
    .eq("id", item.id)
    .eq("user_id", user.id);
  await advanceSession(supabase, user.id, item.session_id);

  return returnUpdatedView(supabase, user.id, locale);
}

export async function addRecommendationToPlan(
  itemId: string,
  locale: string
): Promise<RecommendationActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { status: "error", messageKey: "loginRequired" };

  const item = await loadPendingItem(supabase, user.id, itemId);
  if (!item) return { status: "error", messageKey: "recommendationFailed" };

  const { error: listError } = await supabase.from("anime_list_entries").upsert(
    {
      user_id: user.id,
      anime_id: item.anime_id,
      status: "plan_to_watch",
      score: 0,
      progress_episodes: 0,
      total_episodes: item.episodes ?? null,
      title_romaji: item.title_romaji,
      title_english: item.title_english,
      cover_image: item.cover_image,
      format: item.format,
      season_year: item.season_year,
    },
    { onConflict: "user_id,anime_id" }
  );

  if (listError) return { status: "error", messageKey: "recommendationFailed" };

  await supabase
    .from("anime_recommendation_items")
    .update({ state: "added_plan_to_watch", state_changed_at: new Date().toISOString() })
    .eq("id", item.id)
    .eq("user_id", user.id);
  await supabase
    .from("anime_recommendation_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", item.session_id)
    .eq("user_id", user.id);

  return returnUpdatedView(supabase, user.id, locale);
}

export async function replaceRecommendationSession(locale: string): Promise<RecommendationActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { status: "error", messageKey: "loginRequired" };

  const activeSession = await getActiveSession(supabase, user.id);
  if (activeSession) {
    await supabase
      .from("anime_recommendation_sessions")
      .update({ status: "replaced", completed_at: new Date().toISOString() })
      .eq("id", activeSession.id)
      .eq("user_id", user.id);
  }

  const result = await createSessionForUser(supabase, user.id);
  revalidatePath(`/${locale}${RECOMMENDATIONS_PATH}`);
  revalidatePath(`/${locale}/profile`);

  return result;
}
