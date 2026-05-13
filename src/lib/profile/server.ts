import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getRandomDefaultAvatarUrl } from "@/lib/profile/default-avatars";
import { sanitizeUsernameSeed } from "@/lib/profile/validators";
import type { ProfileStats, PublicAnimeListEntry, UserProfile } from "@/types/profile";

const EMPTY_PROFILE_STATS: ProfileStats = {
  total_anime: 0,
  watching: 0,
  completed: 0,
  on_hold: 0,
  dropped: 0,
  plan_to_watch: 0,
  average_score: 0,
  watched_episodes: 0,
};

export function getProfileDisplayName(user: User) {
  const metadataName = user.user_metadata?.display_name;

  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim().slice(0, 40);
  }

  return user.email?.split("@")[0]?.slice(0, 40) || "Anime User";
}

function getDefaultUsernameCandidates(user: User) {
  const displayName = getProfileDisplayName(user);
  const emailPrefix = user.email?.split("@")[0] || "";
  const suffix = user.id.replaceAll("-", "").slice(0, 6);
  const base = sanitizeUsernameSeed(displayName || emailPrefix);

  return [
    base,
    sanitizeUsernameSeed(emailPrefix),
    `${base}-${suffix}`.slice(0, 24),
    `user-${suffix}`,
  ];
}

export async function ensureUserProfile(supabase: SupabaseClient, user: User) {
  const { data: existingProfile, error: loadError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  if (existingProfile) {
    return existingProfile as UserProfile;
  }

  const displayName = getProfileDisplayName(user);
  const candidates = getDefaultUsernameCandidates(user);
  const avatarUrl = getRandomDefaultAvatarUrl();

  for (const username of candidates) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username,
        display_name: displayName,
        avatar_url: avatarUrl,
        is_public: true,
      })
      .select("*")
      .single();

    if (!error && data) {
      return data as UserProfile;
    }

    if (error?.code !== "23505") {
      throw error;
    }
  }

  throw new Error("Could not create a unique profile username.");
}

export function calculateProfileStats(entries: Pick<
  PublicAnimeListEntry,
  "status" | "score" | "progress_episodes"
>[]): ProfileStats {
  const scoredEntries = entries.filter((entry) => entry.score > 0);
  const scoreTotal = scoredEntries.reduce((total, entry) => total + entry.score, 0);

  return entries.reduce<ProfileStats>(
    (stats, entry) => ({
      ...stats,
      [entry.status]: stats[entry.status] + 1,
      watched_episodes: stats.watched_episodes + entry.progress_episodes,
    }),
    {
      ...EMPTY_PROFILE_STATS,
      total_anime: entries.length,
      average_score: scoredEntries.length > 0 ? scoreTotal / scoredEntries.length : 0,
    }
  );
}

export function coerceProfileStats(value: Partial<ProfileStats> | null | undefined): ProfileStats {
  if (!value) return EMPTY_PROFILE_STATS;

  return {
    total_anime: Number(value.total_anime ?? 0),
    watching: Number(value.watching ?? 0),
    completed: Number(value.completed ?? 0),
    on_hold: Number(value.on_hold ?? 0),
    dropped: Number(value.dropped ?? 0),
    plan_to_watch: Number(value.plan_to_watch ?? 0),
    average_score: Number(value.average_score ?? 0),
    watched_episodes: Number(value.watched_episodes ?? 0),
  };
}
