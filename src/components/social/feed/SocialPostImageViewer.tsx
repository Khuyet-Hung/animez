"use client";

import { memo, useCallback, useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import Image from "next/image";
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  Loader2Icon,
  MessageCircleIcon,
  SendIcon,
  Share2Icon,
  UserCircleIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { useToast } from "@/components/common/ToastProvider";
import SocialPostAnime from "@/components/social/feed/SocialPostAnime";
import { useSocialPostComments } from "@/hooks/useSocialPostComments";
import { createSocialPostCommentAction } from "@/lib/social/actions";
import type { SocialFeedAuthor, SocialFeedPost, SocialPostComment } from "@/types/social";

const COMMENT_MAX_LENGTH = 1000;
const EMPTY_COMMENTS: SocialPostComment[] = [];

interface SocialPostLikeState {
  count: number;
  liked: boolean;
}

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAuthorName(author: SocialFeedAuthor, fallbackName: string) {
  return author.display_name || author.username || fallbackName;
}

function countComments(comments: SocialPostComment[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}

function AuthorAvatar({
  author,
  name,
  sizeClass = "size-9",
}: {
  author: SocialFeedAuthor;
  name: string;
  sizeClass?: string;
}) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full border border-[#2a2a35] bg-[#0f0f16] ${sizeClass}`}>
      {author.avatar_url ? (
        <Image src={author.avatar_url} alt={name} fill sizes="40px" className="object-cover" unoptimized />
      ) : (
        <div className="flex size-full items-center justify-center text-[#6b7280]">
          <UserCircleIcon className="size-5" />
        </div>
      )}
    </div>
  );
}

function ViewerActionButton({
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

const CommentBubble = memo(function CommentBubble({
  comment,
  fallbackName,
  locale,
}: {
  comment: SocialPostComment;
  fallbackName: string;
  locale: string;
}) {
  const authorName = getAuthorName(comment.author, fallbackName);

  return (
    <div className="flex gap-3">
      <AuthorAvatar author={comment.author} name={authorName} />
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-lg border border-[#242434] bg-[#171720] px-3 py-2">
          <p className="truncate text-sm font-black text-white">{authorName}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-[#d1d5db]">
            {comment.body}
          </p>
        </div>
        <time dateTime={comment.created_at} className="mt-1 block text-xs font-bold text-[#6b7280]" suppressHydrationWarning>
          {formatDateTime(comment.created_at, locale)}
        </time>

        {comment.replies.length > 0 && (
          <div className="mt-3 grid gap-3 border-l border-[#2a2a35] pl-4">
            {comment.replies.map((reply) => (
              <CommentBubble key={reply.id} comment={reply} fallbackName={fallbackName} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function CommentForm({
  currentUserId,
  onSubmit,
  pending,
}: {
  currentUserId: string | null;
  onSubmit: (body: string) => void;
  pending: boolean;
}) {
  const t = useTranslations("feed");
  const [body, setBody] = useState("");
  const disabled = pending || !currentUserId;
  const trimmedLength = body.trim().length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || trimmedLength === 0) return;

    onSubmit(body);
    setBody("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 border-t border-[#1a1a24] bg-[#0f0f16] p-3 sm:p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#2a2a35] bg-[#111118] text-[#6b7280]">
        <UserCircleIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value.slice(0, COMMENT_MAX_LENGTH))}
          disabled={disabled}
          rows={2}
          placeholder={currentUserId ? t("commentPlaceholder") : t("commentLoginRequired")}
          className="block max-h-28 min-h-12 w-full resize-none rounded-lg border border-[#2a2a35] bg-[#171720] px-3 py-2 text-sm font-semibold leading-6 text-white outline-none transition-colors placeholder:text-[#6b7280] focus:border-[#f49e0b] disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || trimmedLength === 0}
        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#f49e0b]/45 bg-[#f49e0b]/10 text-[#f49e0b] transition-colors hover:border-[#f49e0b] hover:bg-[#f49e0b]/20 hover:text-white disabled:cursor-not-allowed disabled:border-[#2a2a35] disabled:bg-[#171720] disabled:text-[#6b7280]"
        aria-label={t("sendComment")}
      >
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
      </button>
    </form>
  );
}

export default function SocialPostImageViewer({
  currentUserId,
  initialImageIndex,
  isLiking,
  likeState,
  onClose,
  onToggleLike,
  post,
}: {
  currentUserId: string | null;
  initialImageIndex: number;
  isLiking: boolean;
  likeState: SocialPostLikeState;
  onClose: () => void;
  onToggleLike: () => void;
  post: SocialFeedPost;
}) {
  const locale = useLocale();
  const t = useTranslations("feed");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [imageIndex, setImageIndex] = useState(initialImageIndex);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const commentsQuery = useSocialPostComments(post.id, true);
  const comments = commentsQuery.data ?? EMPTY_COMMENTS;
  const authorName = getAuthorName(post.author, t("unknownAuthor"));
  const imageCount = post.images.length;
  const selectedImage = post.images[imageIndex] ?? post.images[0];
  const hasMultipleImages = imageCount > 1;
  const displayedCommentCount = useMemo(
    () => Math.max(post.comment_count, countComments(comments)),
    [comments, post.comment_count]
  );

  const goToPreviousImage = useCallback(() => {
    setImageIndex((current) => (current - 1 + imageCount) % imageCount);
  }, [imageCount]);

  const goToNextImage = useCallback(() => {
    setImageIndex((current) => (current + 1) % imageCount);
  }, [imageCount]);

  useEffect(() => {
    setImageIndex(Math.min(initialImageIndex, Math.max(0, imageCount - 1)));
  }, [imageCount, initialImageIndex]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT" || target?.isContentEditable;

      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (isTyping || !hasMultipleImages) return;

      if (event.key === "ArrowLeft") {
        goToPreviousImage();
      }

      if (event.key === "ArrowRight") {
        goToNextImage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextImage, goToPreviousImage, hasMultipleImages, onClose]);

  function handleSubmitComment(body: string) {
    if (!currentUserId) {
      showToast({
        title: t("commentLoginRequiredTitle"),
        description: t("commentLoginRequired"),
      });
      return;
    }

    startSubmitTransition(async () => {
      const result = await createSocialPostCommentAction(post.id, body);

      if (result.status === "error") {
        showToast({
          title: t("commentFailedTitle"),
          description: t(result.messageKey),
        });
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["social-post-comments", post.id] }),
        queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
      ]);
      showToast({ title: t("commentCreated") });
    });
  }

  if (!selectedImage) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="social-image-viewer-title" className="fixed inset-0 z-[130] flex flex-col bg-black md:flex-row">
      <button
        type="button"
        onClick={onClose}
        className="absolute left-3 top-3 z-30 flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white shadow-2xl shadow-black/50 transition-colors hover:border-[#f49e0b] hover:text-[#f49e0b]"
        aria-label={t("closeImageViewer")}
      >
        <XIcon className="size-6" />
      </button>

      <div className="relative flex h-[42vh] shrink-0 items-center justify-center bg-black md:h-auto md:min-h-0 md:flex-1">
        <Image
          src={selectedImage.public_url}
          alt=""
          fill
          sizes="(min-width: 768px) calc(100vw - 420px), 100vw"
          className="object-contain"
          unoptimized
          priority
        />

        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={goToPreviousImage}
              className="absolute left-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-xl shadow-black/40 transition-colors hover:border-[#f49e0b] hover:text-[#f49e0b] sm:left-5"
              aria-label={t("previousImage")}
            >
              <ChevronLeftIcon className="size-6" />
            </button>
            <button
              type="button"
              onClick={goToNextImage}
              className="absolute right-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-xl shadow-black/40 transition-colors hover:border-[#f49e0b] hover:text-[#f49e0b] sm:right-5"
              aria-label={t("nextImage")}
            >
              <ChevronRightIcon className="size-6" />
            </button>
            <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-black text-white">
              {t("imageCounter", { index: imageIndex + 1, count: imageCount })}
            </div>
          </>
        )}
      </div>

      <aside className="flex h-[58vh] min-h-0 w-full flex-col border-t border-[#2a2a35] bg-[#111118] md:h-full md:w-[420px] md:border-l md:border-t-0 lg:w-[460px]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <article className="border-b border-[#1a1a24]">
            <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
              {post.author.username ? (
                <Link href={`/u/${post.author.username}`} className="flex min-w-0 items-center gap-3">
                  <AuthorAvatar author={post.author} name={authorName} sizeClass="size-10" />
                  <div className="min-w-0">
                    <h2 id="social-image-viewer-title" className="truncate text-sm font-black text-white">
                      {authorName}
                    </h2>
                    <time dateTime={post.created_at} className="mt-0.5 block text-xs font-bold text-[#6b7280]" suppressHydrationWarning>
                      {formatDateTime(post.created_at, locale)}
                    </time>
                  </div>
                </Link>
              ) : (
                <>
                  <AuthorAvatar author={post.author} name={authorName} sizeClass="size-10" />
                  <div className="min-w-0">
                    <h2 id="social-image-viewer-title" className="truncate text-sm font-black text-white">
                      {authorName}
                    </h2>
                    <time dateTime={post.created_at} className="mt-0.5 block text-xs font-bold text-[#6b7280]" suppressHydrationWarning>
                      {formatDateTime(post.created_at, locale)}
                    </time>
                  </div>
                </>
              )}
            </div>

            <div className="px-4 pb-4 sm:px-5">
              <h3 className="whitespace-pre-wrap break-words text-base font-black leading-6 text-white">
                {post.caption}
              </h3>
              {post.description && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-[#cbd5e1]">
                  {post.description}
                </p>
              )}
            </div>

            <div className="px-4 sm:px-5">
              <SocialPostAnime anime={post.anime} />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#1a1a24] px-3 py-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-1.5">
                <ViewerActionButton
                  count={likeState.count}
                  disabled={isLiking}
                  icon={HeartIcon}
                  label={t("likePost")}
                  onClick={onToggleLike}
                  pressed={likeState.liked}
                />
                <ViewerActionButton count={displayedCommentCount} icon={MessageCircleIcon} label={t("commentPost")} />
                <ViewerActionButton icon={Share2Icon} label={t("sharePost")} />
              </div>
              <ViewerActionButton icon={BookmarkIcon} label={t("savePost")} />
            </div>
          </article>

          <section aria-labelledby="image-viewer-comments-title" className="grid gap-4 px-4 py-4 sm:px-5">
            <h3 id="image-viewer-comments-title" className="text-sm font-black uppercase tracking-[0.08em] text-[#9ca3af]">
              {t("commentsHeading")}
            </h3>

            {commentsQuery.isLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-[#9ca3af]">
                <Loader2Icon className="size-4 animate-spin text-[#f49e0b]" />
                {t("loadingComments")}
              </div>
            )}

            {commentsQuery.isError && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-4">
                <p className="text-sm font-bold text-red-100">{t("commentsLoadFailed")}</p>
                <button
                  type="button"
                  onClick={() => void commentsQuery.refetch()}
                  className="mt-3 h-9 rounded border border-red-400/40 px-3 text-sm font-black text-red-100 transition-colors hover:border-red-300 hover:text-white"
                >
                  {t("retry")}
                </button>
              </div>
            )}

            {!commentsQuery.isLoading && !commentsQuery.isError && comments.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#2a2a35] bg-[#0f0f16] p-5 text-center">
                <p className="text-sm font-black text-white">{t("emptyCommentsTitle")}</p>
                <p className="mt-1 text-sm font-semibold text-[#9ca3af]">{t("emptyCommentsDescription")}</p>
              </div>
            )}

            {!commentsQuery.isLoading &&
              !commentsQuery.isError &&
              comments.map((comment) => (
                <CommentBubble key={comment.id} comment={comment} fallbackName={t("unknownAuthor")} locale={locale} />
              ))}
          </section>
        </div>

        <CommentForm currentUserId={currentUserId} onSubmit={handleSubmitComment} pending={isSubmitting} />
      </aside>
    </div>
  );
}
