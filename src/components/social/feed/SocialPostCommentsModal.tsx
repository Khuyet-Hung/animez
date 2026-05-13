"use client";

import { memo, useTransition, useState, type FormEvent, type MouseEvent } from "react";
import Image from "next/image";
import {
  HeartIcon,
  Loader2Icon,
  MessageCircleIcon,
  SendIcon,
  UserCircleIcon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/common/ToastProvider";
import SocialPostAnime from "@/components/social/feed/SocialPostAnime";
import SocialPostImages from "@/components/social/feed/SocialPostImages";
import { createSocialPostCommentAction } from "@/lib/social/actions";
import { useSocialPostComments } from "@/hooks/useSocialPostComments";
import type { SocialFeedAuthor, SocialFeedPost, SocialPostComment } from "@/types/social";

const COMMENT_MAX_LENGTH = 1000;

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

function countComments(comments: SocialPostComment[]) {
  return comments.reduce((total, comment) => total + 1 + comment.replies.length, 0);
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
        <time
          dateTime={comment.created_at}
          className="mt-1 block text-xs font-bold text-[#6b7280]"
          suppressHydrationWarning
        >
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

export default function SocialPostCommentsModal({
  currentUserId,
  onClose,
  post,
}: {
  currentUserId: string | null;
  onClose: () => void;
  post: SocialFeedPost;
}) {
  const locale = useLocale();
  const t = useTranslations("feed");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const authorName = getAuthorName(post.author, t("unknownAuthor"));
  const { data: comments = [], isError, isLoading, refetch } = useSocialPostComments(post.id, true);
  const displayedCommentCount = Math.max(post.comment_count, countComments(comments));

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

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

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6"
      onMouseDown={handleBackdropMouseDown}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-comments-title"
        className="flex h-full w-full flex-col overflow-hidden border border-[#2a2a35] bg-[#111118] shadow-2xl shadow-black/60 sm:h-[min(92vh,900px)] sm:max-w-3xl sm:rounded-lg"
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#2a2a35] bg-[#0f0f16] px-4 sm:h-16 sm:px-5">
          <h2 id="social-comments-title" className="min-w-0 truncate text-lg font-black text-white sm:text-xl">
            {t("commentsModalTitle", { name: authorName })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#2a2a35] text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white"
            aria-label={t("closeComments")}
          >
            <XIcon className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-[#1a1a24]">
            <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
              <AuthorAvatar author={post.author} name={authorName} sizeClass="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{authorName}</p>
                <time
                  dateTime={post.created_at}
                  className="mt-0.5 block text-xs font-bold text-[#6b7280]"
                  suppressHydrationWarning
                >
                  {formatDateTime(post.created_at, locale)}
                </time>
              </div>
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

            <SocialPostImages imageLayout={post.image_layout} images={post.images} />

            <div className="px-4 sm:px-5">
              <SocialPostAnime anime={post.anime} />
            </div>

            <div className="flex items-center gap-4 border-t border-[#1a1a24] px-4 py-3 text-sm font-bold text-[#9ca3af] sm:px-5">
              <span className="inline-flex items-center gap-1.5">
                <HeartIcon className="size-4" />
                {post.like_count}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircleIcon className="size-4" />
                {displayedCommentCount}
              </span>
            </div>
          </div>

          <div className="grid gap-4 px-4 py-4 sm:px-5">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-[#9ca3af]">
                <Loader2Icon className="size-4 animate-spin text-[#f49e0b]" />
                {t("loadingComments")}
              </div>
            )}

            {isError && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-4">
                <p className="text-sm font-bold text-red-100">{t("commentsLoadFailed")}</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-3 h-9 rounded border border-red-400/40 px-3 text-sm font-black text-red-100 transition-colors hover:border-red-300 hover:text-white"
                >
                  {t("retry")}
                </button>
              </div>
            )}

            {!isLoading && !isError && comments.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#2a2a35] bg-[#0f0f16] p-5 text-center">
                <p className="text-sm font-black text-white">{t("emptyCommentsTitle")}</p>
                <p className="mt-1 text-sm font-semibold text-[#9ca3af]">{t("emptyCommentsDescription")}</p>
              </div>
            )}

            {!isLoading &&
              !isError &&
              comments.map((comment) => (
                <CommentBubble
                  key={comment.id}
                  comment={comment}
                  fallbackName={t("unknownAuthor")}
                  locale={locale}
                />
              ))}
          </div>
        </div>

        <CommentForm currentUserId={currentUserId} onSubmit={handleSubmitComment} pending={isSubmitting} />
      </section>
    </div>
  );
}
