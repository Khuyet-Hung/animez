"use client";

import { memo, useTransition, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  HeartIcon,
  Loader2Icon,
  MessageCircleIcon,
  SendIcon,
  UserCircleIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/common/ToastProvider";
import SocialPostAnime from "@/components/social/feed/SocialPostAnime";
import SocialPostImages from "@/components/social/feed/SocialPostImages";
import { AppButton, AppDialog, AppIconButton, AppTextarea } from "@/components/ui";
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
    <div className={`relative shrink-0 overflow-hidden rounded-ui-pill border border-border-strong bg-bg-muted ${sizeClass}`}>
      {author.avatar_url ? (
        <Image src={author.avatar_url} alt={name} fill sizes="40px" className="object-cover" unoptimized />
      ) : (
        <div className="flex size-full items-center justify-center text-fg-subtle">
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
        <div className="inline-block max-w-full rounded-ui-sm border border-border-soft bg-surface-elevated px-3 py-2">
          <p className="truncate text-sm font-black text-fg">{authorName}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-fg-soft">
            {comment.body}
          </p>
        </div>
        <time
          dateTime={comment.created_at}
          className="mt-1 block text-xs font-bold text-fg-subtle"
          suppressHydrationWarning
        >
          {formatDateTime(comment.created_at, locale)}
        </time>

        {comment.replies.length > 0 && (
          <div className="mt-3 grid gap-3 border-l border-border-strong pl-4">
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
    <form onSubmit={handleSubmit} className="flex items-end gap-3 border-t border-border bg-bg-muted p-3 sm:p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-ui-pill border border-border-strong bg-surface text-fg-subtle">
        <UserCircleIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <AppTextarea
          value={body}
          onChange={(event) => setBody(event.target.value.slice(0, COMMENT_MAX_LENGTH))}
          disabled={disabled}
          rows={2}
          placeholder={currentUserId ? t("commentPlaceholder") : t("commentLoginRequired")}
          className="block max-h-28 min-h-12 text-sm font-semibold leading-6"
        />
      </div>
      <AppIconButton
        type="submit"
        disabled={disabled || trimmedLength === 0}
        variant="brand"
        aria-label={t("sendComment")}
        isLoading={pending}
      >
        <SendIcon className="size-4" />
      </AppIconButton>
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
    <AppDialog
      open
      onClose={onClose}
      titleId="social-comments-title"
      title={t("commentsModalTitle", { name: authorName })}
      closeLabel={t("closeComments")}
      closeOnOverlay
      size="full"
      className="sm:max-w-3xl"
    >

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-border">
            <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
              <AuthorAvatar author={post.author} name={authorName} sizeClass="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-fg">{authorName}</p>
                <time
                  dateTime={post.created_at}
                  className="mt-0.5 block text-xs font-bold text-fg-subtle"
                  suppressHydrationWarning
                >
                  {formatDateTime(post.created_at, locale)}
                </time>
              </div>
            </div>

            <div className="px-4 pb-4 sm:px-5">
              <h3 className="whitespace-pre-wrap break-words text-base font-black leading-6 text-fg">
                {post.caption}
              </h3>
              {post.description && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-fg-soft">
                  {post.description}
                </p>
              )}
            </div>

            <SocialPostImages imageLayout={post.image_layout} images={post.images} />

            <div className="px-4 sm:px-5">
              <SocialPostAnime anime={post.anime} />
            </div>

            <div className="flex items-center gap-4 border-t border-border px-4 py-3 text-sm font-bold text-fg-muted sm:px-5">
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
              <div className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-fg-muted">
                <Loader2Icon className="size-4 animate-spin text-brand" />
                {t("loadingComments")}
              </div>
            )}

            {isError && (
              <div className="rounded-ui-sm border border-red-500/25 bg-red-500/10 p-4">
                <p className="text-sm font-bold text-red-100">{t("commentsLoadFailed")}</p>
                <AppButton
                  type="button"
                  onClick={() => void refetch()}
                  variant="danger"
                  size="sm"
                  className="mt-3"
                >
                  {t("retry")}
                </AppButton>
              </div>
            )}

            {!isLoading && !isError && comments.length === 0 && (
              <div className="rounded-ui-sm border border-dashed border-border-strong bg-bg-muted p-5 text-center">
                <p className="text-sm font-black text-fg">{t("emptyCommentsTitle")}</p>
                <p className="mt-1 text-sm font-semibold text-fg-muted">{t("emptyCommentsDescription")}</p>
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
    </AppDialog>
  );
}
