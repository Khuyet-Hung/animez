import type { ProfileStats as ProfileStatsType } from "@/types/profile";

interface ProfileStatsProps {
  stats: ProfileStatsType;
  labels: {
    totalAnime: string;
    watching: string;
    completed: string;
    planToWatch: string;
    averageScore: string;
    watchedEpisodes: string;
  };
}

function formatScore(score: number) {
  return score > 0 ? score.toFixed(1) : "-";
}

export default function ProfileStats({ stats, labels }: ProfileStatsProps) {
  const items = [
    { label: labels.totalAnime, value: stats.total_anime.toLocaleString() },
    { label: labels.watching, value: stats.watching.toLocaleString() },
    { label: labels.completed, value: stats.completed.toLocaleString() },
    { label: labels.planToWatch, value: stats.plan_to_watch.toLocaleString() },
    { label: labels.averageScore, value: formatScore(stats.average_score) },
    { label: labels.watchedEpisodes, value: stats.watched_episodes.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="rounded border border-[#1a1a24] bg-[#111118] px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-normal text-[#5f6472]">{item.label}</p>
          <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
