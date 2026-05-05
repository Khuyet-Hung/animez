import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ProfileDashboard from "@/components/profile/ProfileDashboard";
import { calculateProfileStats, ensureUserProfile } from "@/lib/profile/server";
import { createGravatarUrl } from "@/lib/gravatar";
import { createClient } from "@/lib/supabase/server";
import type { AnimeListStatus } from "@/types/anime-list";
import type { UserAnimeListEntry } from "@/types/profile";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
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

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const profileT = await getTranslations("profile");
  const animeListT = await getTranslations("animeList");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/profile`);
  }

  const profile = await ensureUserProfile(supabase, user);
  const { data: entriesData } = await supabase
    .from("anime_list_entries")
    .select(
      "id,user_id,anime_id,status,score,progress_episodes,total_episodes,started_at,finished_at,is_rewatching,rewatch_count,rewatch_value,priority,tags,notes,title_romaji,title_english,cover_image,format,season,season_year,created_at,updated_at"
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(500);

  const entries = ((entriesData ?? []) as UserAnimeListEntry[]).map((entry) => ({
    ...entry,
    anime_id: Number(entry.anime_id),
  }));
  const stats = calculateProfileStats(entries);
  const gravatarUrl = await createGravatarUrl(user.email, 176);
  const avatarSrc = profile.avatar_url ?? gravatarUrl;

  return (
    <>
      <Navbar />
      <ProfileDashboard
        avatarSrc={avatarSrc}
        entries={entries}
        locale={locale}
        profile={profile}
        stats={stats}
        userEmail={user.email ?? null}
        labels={{
          emptyList: profileT("emptyList"),
          recentList: profileT("recentList"),
          settings: profileT("settings"),
          privateStatus: profileT("privateStatus"),
          publicStatus: profileT("publicStatus"),
          viewPublicProfile: profileT("viewPublicProfile"),
          status: getStatusLabels(animeListT),
          stats: {
            totalAnime: profileT("stats.totalAnime"),
            watching: profileT("stats.watching"),
            completed: profileT("stats.completed"),
            planToWatch: profileT("stats.planToWatch"),
            averageScore: profileT("stats.averageScore"),
            watchedEpisodes: profileT("stats.watchedEpisodes"),
          },
        }}
      />
      <Footer />
    </>
  );
}
