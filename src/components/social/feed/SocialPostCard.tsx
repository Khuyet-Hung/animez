"use client";

import { memo, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  BookmarkIcon,
  ClockIcon,
  EllipsisIcon,
  HeartIcon,
  Loader2Icon,
  MessageCircleIcon,
  Share2Icon,
  Trash2Icon,
  UserCircleIcon,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/components/common/ToastProvider";
import SocialPostAnime from "@/components/social/feed/SocialPostAnime";
import SocialPostImages from "@/components/social/feed/SocialPostImages";
import { deleteSocialPostAction, toggleSocialPostLikeAction } from "@/lib/social/actions";
import type { SocialFeedPost } from "@/types/social";

interface SocialPostLikeState {
  count: number;
  liked: boolean;
}

function formatPostDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAuthorName(post: SocialFeedPost, fallbackName: string) {
  return post.author.display_name || post.author.username || fallbackName;
}

function SocialPostActionButton({
  count,
  disabled,
  icon: Icon,
  label,
  onClick,
  pressed,
}: {
  count?: number;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={typeof pressed === "boolean" ? pressed : undefined}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "inline-flex h-9 min-w-10 items-center justify-center rounded border px-3 text-sm font-black tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        "border-[#2a2a35] text-[#d1d5db] hover:border-[#f49e0b] hover:text-white"
      )}
    >
      <Icon className="size-4 shrink-0" fill={pressed ? "currentColor" : "none"} />
      {typeof count === "number" && <span className="ml-1.5 min-w-3">{count}</span>}
    </button>
  );
}

const SocialPostCard = memo(function SocialPostCard({
  currentUserId,
  post,
}: {
  currentUserId: string | null;
  post: SocialFeedPost;
}) {
  const locale = useLocale();
  const t = useTranslations("feed");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [optimisticLikeState, setOptimisticLikeState] = useState<SocialPostLikeState | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isLiking, startLikeTransition] = useTransition();
  const canDelete = currentUserId === post.author.user_id;
  const authorName = getAuthorName(post, t("unknownAuthor"));
  const likeState = optimisticLikeState ?? {
    count: post.like_count,
    liked: post.liked_by_current_user,
  };

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  function handleDeletePost() {
    startDeleteTransition(async () => {
      const result = await deleteSocialPostAction(post.id);

      if (result.status === "error") {
        showToast({
          title: t("deleteFailedTitle"),
          description: t(result.messageKey),
        });
        return;
      }

      setConfirmOpen(false);
      setMenuOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
      ]);
      showToast({
        title: t("deleted"),
      });
    });
  }

  function handleToggleLike() {
    if (!currentUserId) {
      showToast({
        title: t("likeLoginRequiredTitle"),
        description: t("likeLoginRequired"),
      });
      return;
    }

    const previousState = likeState;
    const nextLiked = !previousState.liked;
    setOptimisticLikeState({
      count: Math.max(0, previousState.count + (nextLiked ? 1 : -1)),
      liked: nextLiked,
    });

    startLikeTransition(async () => {
      const result = await toggleSocialPostLikeAction(post.id);

      if (result.status === "error") {
        setOptimisticLikeState(previousState);
        showToast({
          title: t("likeFailedTitle"),
          description: t(result.messageKey),
        });
        return;
      }

      setOptimisticLikeState({
        count: result.likeCount ?? 0,
        liked: result.liked ?? false,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
      ]);
    });
  }

  const authorContent = (
    <>
      <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-[#2a2a35] bg-[#0f0f16]">
        {post.author.avatar_url ? (
          <Image src={post.author.avatar_url} alt={authorName} fill sizes="40px" className="object-cover" unoptimized />
        ) : (
          <div className="flex size-full items-center justify-center text-[#6b7280]">
            <UserCircleIcon className="size-6" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white">{authorName}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-[#6b7280]">
          <ClockIcon className="size-3.5" />
          <time dateTime={post.created_at} suppressHydrationWarning>
            {formatPostDate(post.created_at, locale)}
          </time>
        </div>
      </div>
    </>
  );

  return (
    <article className="overflow-hidden rounded-lg border border-[#1a1a24] bg-[#111118]">
      <div className="flex items-center justify-between gap-4 border-b border-[#1a1a24] bg-[#0f0f16] px-4 py-3 sm:px-5">
        {post.author.username ? (
          <Link href={`/u/${post.author.username}`} className="flex min-w-0 items-center gap-3">
            {authorContent}
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-3">{authorContent}</div>
        )}

        {canDelete && (
          <div ref={actionMenuRef} className="relative shrink-0">
            <button
              type="button"
              aria-label={t("postActions")}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
              className="flex size-9 items-center justify-center rounded border border-[#2a2a35] text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white"
            >
              <EllipsisIcon className="size-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-44 overflow-hidden rounded border border-[#2a2a35] bg-[#0f0f16] p-1 shadow-2xl shadow-black/50">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(true);
                    setMenuOpen(false);
                  }}
                  className="flex h-10 w-full items-center gap-2 rounded px-3 text-left text-sm font-bold text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                >
                  <Trash2Icon className="size-4" />
                  {t("deletePost")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-4 sm:px-5">
        <h2 className="whitespace-pre-wrap break-words text-base font-black leading-6 text-white">{post.caption}</h2>
        {post.description && (
          <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-[#cbd5e1]">
            {post.description}
          </p>
        )}
      </div>

      <SocialPostImages imageLayout={post.image_layout} images={post.images} />

      <div className="px-4 sm:px-5">
        <SocialPostAnime anime={post.anime} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#1a1a24] px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <SocialPostActionButton
            count={likeState.count}
            disabled={isLiking}
            icon={HeartIcon}
            label={t("likePost")}
            onClick={handleToggleLike}
            pressed={likeState.liked}
          />
          <SocialPostActionButton icon={MessageCircleIcon} label={t("commentPost")} />
          <SocialPostActionButton icon={Share2Icon} label={t("sharePost")} />
        </div>
        <SocialPostActionButton icon={BookmarkIcon} label={t("savePost")} />
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-[#2a2a35] bg-[#111118] p-5 shadow-2xl">
            <h3 className="text-lg font-black text-white">{t("deleteConfirmTitle")}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#9ca3af]">
              {t("deleteConfirmDescription")}
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={isDeleting}
                className="h-10 rounded border border-[#2a2a35] px-4 text-sm font-bold text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("cancelDelete")}
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="inline-flex h-10 items-center gap-2 rounded border border-red-400/40 bg-red-500/10 px-4 text-sm font-black text-red-200 transition-colors hover:border-red-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
                {isDeleting ? t("deleting") : t("deletePost")}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
});

export function SocialPostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-[#1a1a24] bg-[#111118]">
      <div className="flex items-center gap-3 border-b border-[#1a1a24] bg-[#0f0f16] px-4 py-3 sm:px-5">
        <div className="size-10 rounded-full bg-[#1a1a24]" />
        <div className="grid flex-1 gap-2">
          <div className="h-3 w-32 rounded bg-[#1a1a24]" />
          <div className="h-3 w-24 rounded bg-[#1a1a24]" />
        </div>
        <div className="size-9 rounded bg-[#1a1a24]" />
      </div>
      <div className="grid gap-3 px-4 py-4 sm:px-5">
        <div className="h-4 w-11/12 rounded bg-[#1a1a24]" />
        <div className="h-4 w-7/12 rounded bg-[#1a1a24]" />
        <div className="h-7 w-48 rounded-full bg-[#1a1a24]" />
      </div>
      <div className="aspect-[16/10] bg-[#0a0a0f]" />
      <div className="flex items-center justify-between border-t border-[#1a1a24] px-3 py-3 sm:px-4">
        <div className="flex gap-1.5">
          <div className="h-9 w-10 rounded bg-[#1a1a24]" />
          <div className="h-9 w-10 rounded bg-[#1a1a24]" />
          <div className="h-9 w-10 rounded bg-[#1a1a24]" />
        </div>
        <div className="h-9 w-10 rounded bg-[#1a1a24]" />
      </div>
    </div>
  );
}

export default SocialPostCard;
