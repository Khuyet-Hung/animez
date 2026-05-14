"use client";

import { useEffect, useMemo, useRef } from "react";
import { Loader2Icon, RefreshCcwIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { useAuth } from "@/hooks/useAuth";
import SocialPostCard, { SocialPostCardSkeleton } from "@/components/social/feed/SocialPostCard";
import { AppEmptyState, AppErrorState } from "@/components/ui";

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
      <AppErrorState
        title={t("errorTitle")}
        description={error instanceof Error ? error.message : t("errorDescription")}
        retryLabel={
          <span className="inline-flex items-center gap-2">
            <RefreshCcwIcon className="size-4" />
            {t("retry")}
          </span>
        }
        onRetry={() => void refetch()}
      />
    );
  }

  if (posts.length === 0) {
    return (
      <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
    );
  }

  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <SocialPostCard key={post.id} currentUserId={user?.id ?? null} post={post} />
      ))}

      <div ref={loadMoreRef} className="min-h-12">
        {isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2 py-5 text-sm font-bold text-fg-muted">
            <Loader2Icon className="size-4 animate-spin text-brand" />
            {t("loadingMore")}
          </div>
        )}

        {!hasNextPage && (
          <p className="py-5 text-center text-xs font-bold uppercase tracking-normal text-fg-subtle">
            {t("end")}
          </p>
        )}
      </div>
    </div>
  );
}
