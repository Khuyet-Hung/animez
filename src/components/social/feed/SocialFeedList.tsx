"use client";

import { useEffect, useMemo, useRef } from "react";
import { Loader2Icon, RefreshCcwIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { useAuth } from "@/hooks/useAuth";
import SocialPostCard, { SocialPostCardSkeleton } from "@/components/social/feed/SocialPostCard";

export default function SocialFeedList() {
  const locale = useLocale();
  const t = useTranslations("feed");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useSocialFeed(locale);
  const posts = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "640px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SocialPostCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-red-500/25 bg-red-500/10 p-5">
        <h2 className="text-lg font-black text-white">{t("errorTitle")}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-red-200">
          {error instanceof Error ? error.message : t("errorDescription")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 inline-flex h-10 items-center gap-2 border border-red-400/40 px-4 text-sm font-black text-red-100 transition-colors hover:border-red-300 hover:text-white"
        >
          <RefreshCcwIcon className="size-4" />
          {t("retry")}
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="border border-[#1a1a24] bg-[#111118] p-8 text-center">
        <h2 className="text-xl font-black text-white">{t("emptyTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#9ca3af]">
          {t("emptyDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <SocialPostCard key={post.id} currentUserId={user?.id ?? null} post={post} />
      ))}

      <div ref={loadMoreRef} className="min-h-12">
        {isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2 py-5 text-sm font-bold text-[#9ca3af]">
            <Loader2Icon className="size-4 animate-spin text-[#f49e0b]" />
            {t("loadingMore")}
          </div>
        )}

        {!hasNextPage && (
          <p className="py-5 text-center text-xs font-bold uppercase tracking-normal text-[#5f6472]">
            {t("end")}
          </p>
        )}
      </div>
    </div>
  );
}
