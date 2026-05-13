"use client";

import { memo, useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Image from "next/image";
import {
  ClockIcon,
  EllipsisIcon,
  HeartIcon,
  Loader2Icon,
  MessageCircleIcon,
  PencilIcon,
  Share2Icon,
  Trash2Icon,
  UserCircleIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/components/common/ToastProvider";
import { SocialPostEditorModal } from "@/components/social/CreatePostButton";
import SocialPostAnime from "@/components/social/feed/SocialPostAnime";
import SocialPostCommentsModal from "@/components/social/feed/SocialPostCommentsModal";
import SocialPostImageViewer from "@/components/social/feed/SocialPostImageViewer";
import SocialPostImages from "@/components/social/feed/SocialPostImages";
import {
  deleteSocialPostAction,
  shareSocialPostAction,
  toggleSocialPostLikeAction,
  updateSocialPostShareAction,
} from "@/lib/social/actions";
import type { SocialFeedAuthor, SocialFeedPost, SocialFeedPostBase } from "@/types/social";

interface SocialPostLikeState {
  count: number;
  liked: boolean;
}

const SHARE_CAPTION_MAX_LENGTH = 280;

function formatPostDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAuthorName(post: SocialFeedPostBase, fallbackName: string) {
  return post.author.display_name || post.author.username || fallbackName;
}

function hasPostBeenEdited(post: SocialFeedPost) {
  const createdAt = new Date(post.created_at).getTime();
  const updatedAt = new Date(post.updated_at).getTime();

  return Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt - createdAt > 1000;
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

function SocialPostActionStat({
  count,
  icon: Icon,
  label,
}: {
  count: number;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div
      aria-label={label}
      className="inline-flex h-9 min-w-10 items-center justify-center rounded border border-[#2a2a35] px-3 text-sm font-black tabular-nums text-[#d1d5db]"
    >
      <Icon className="size-4 shrink-0" />
      <span className="ml-1.5 min-w-3">{count}</span>
    </div>
  );
}

const SharedPostPreview = memo(function SharedPostPreview({
  onImageClick,
  post,
}: {
  onImageClick?: (index: number) => void;
  post: SocialFeedPostBase;
}) {
  const locale = useLocale();
  const t = useTranslations("feed");
  const authorName = getAuthorName(post, t("unknownAuthor"));
  const authorContent = (
    <>
      <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-[#2a2a35] bg-[#111118]">
        {post.author.avatar_url ? (
          <Image src={post.author.avatar_url} alt={authorName} fill sizes="36px" className="object-cover" unoptimized />
        ) : (
          <div className="flex size-full items-center justify-center text-[#6b7280]">
            <UserCircleIcon className="size-5" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white">{authorName}</p>
        <time dateTime={post.created_at} className="mt-0.5 block text-xs font-bold text-[#6b7280]" suppressHydrationWarning>
          {formatPostDate(post.created_at, locale)}
        </time>
      </div>
    </>
  );

  return (
    <div className="px-4 pb-4 sm:px-5">
      <article className="overflow-hidden rounded-lg border border-[#2a2a35] bg-[#0f0f16]">
        <div className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4">
          {post.author.username ? (
            <Link href={`/u/${post.author.username}`} className="flex min-w-0 items-center gap-3">
              {authorContent}
            </Link>
          ) : (
            authorContent
          )}
        </div>

        {(post.caption || post.description) && (
          <div className="px-3 pb-3 sm:px-4">
            {post.caption && (
              <h3 className="whitespace-pre-wrap break-words text-sm font-black leading-6 text-white">
                {post.caption}
              </h3>
            )}
            {post.description && (
              <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-[#cbd5e1]">
                {post.description}
              </p>
            )}
          </div>
        )}

        <SocialPostImages
          getImageAriaLabel={(index) =>
            t("openOriginalImageViewer", {
              count: post.images.length,
              index: index + 1,
            })
          }
          imageLayout={post.image_layout}
          images={post.images}
          onImageClick={onImageClick}
        />

        <div className="px-3 sm:px-4">
          <SocialPostAnime anime={post.anime} />
        </div>
      </article>
    </div>
  );
});

function SharePostModal({
  actor,
  initialCaption = "",
  isPending,
  mode,
  onClose,
  onSubmit,
  post,
}: {
  actor?: SocialFeedAuthor;
  initialCaption?: string;
  isPending: boolean;
  mode: "create" | "edit";
  onClose: () => void;
  onSubmit: (caption: string) => void;
  post: SocialFeedPostBase;
}) {
  const t = useTranslations("feed");
  const [caption, setCaption] = useState(initialCaption);
  const captionLength = caption.trim().length;
  const captionTooLong = captionLength > SHARE_CAPTION_MAX_LENGTH;
  const isEditing = mode === "edit";
  const actorName = actor?.display_name || actor?.username || t("shareAsCurrentUser");
  const actorContent = (
    <>
      <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-[#2a2a35] bg-[#0f0f16] text-[#6b7280]">
        {actor?.avatar_url ? (
          <Image src={actor.avatar_url} alt={actorName} fill sizes="40px" className="object-cover" unoptimized />
        ) : (
          <div className="flex size-full items-center justify-center">
            <UserCircleIcon className="size-6" />
          </div>
        )}
      </div>
      <p className="min-w-0 truncate text-sm font-black text-white">{actorName}</p>
    </>
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || captionTooLong) return;

    onSubmit(caption);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[min(720px,calc(100vh-32px))] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-[#2a2a35] bg-[#111118] shadow-2xl shadow-black/60"
      >
        <div className="relative flex h-14 items-center justify-center border-b border-[#2a2a35] px-12">
          <h2 className="truncate text-lg font-black text-white">{t(isEditing ? "editShareTitle" : "shareModalTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#171720] text-[#d1d5db] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={t("closeShareModal")}
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
            {actor?.username ? (
              <Link href={`/u/${actor.username}`} className="flex min-w-0 items-center gap-3">
                {actorContent}
              </Link>
            ) : (
              actorContent
            )}
          </div>

          <div className="px-4 sm:px-5">
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              disabled={isPending}
              rows={4}
              placeholder={t("shareCaptionPlaceholder")}
              className="block max-h-40 min-h-24 w-full resize-none border-0 bg-transparent p-0 text-base font-semibold leading-7 text-white outline-none placeholder:text-[#9ca3af] disabled:cursor-not-allowed disabled:opacity-70"
            />
            <div className="mt-2 flex justify-end">
              <span className={clsx("text-xs font-bold tabular-nums", captionTooLong ? "text-red-300" : "text-[#6b7280]")}>
                {captionLength}/{SHARE_CAPTION_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div className="pt-1">
            <SharedPostPreview post={post} />
          </div>
        </div>

        <div className="flex justify-end border-t border-[#2a2a35] px-4 py-3 sm:px-5">
          <button
            type="submit"
            disabled={isPending || captionTooLong}
            className="inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-lg border border-[#f49e0b]/45 bg-[#f49e0b] px-5 text-sm font-black text-[#111118] transition-colors hover:border-[#fbbf24] hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:border-[#2a2a35] disabled:bg-[#242434] disabled:text-[#6b7280]"
          >
            {isPending && <Loader2Icon className="size-4 animate-spin" />}
            {isPending ? t(isEditing ? "updatingShare" : "sharing") : t(isEditing ? "updateShare" : "shareNow")}
          </button>
        </div>
      </form>
    </div>
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
  const [editOpen, setEditOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState<number | null>(null);
  const [sharedImageViewerIndex, setSharedImageViewerIndex] = useState<number | null>(null);
  const [optimisticLikeState, setOptimisticLikeState] = useState<SocialPostLikeState | null>(null);
  const [sharedOptimisticLikeState, setSharedOptimisticLikeState] = useState<SocialPostLikeState | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isLiking, startLikeTransition] = useTransition();
  const [isSharedLiking, startSharedLikeTransition] = useTransition();
  const [isSharing, startShareTransition] = useTransition();
  const [isUpdatingShare, startUpdateShareTransition] = useTransition();
  const canManage = currentUserId === post.author.user_id;
  const originalPostAuthorId = post.shared_post?.author.user_id ?? post.author.user_id;
  const canShare = !currentUserId || (currentUserId !== post.author.user_id && currentUserId !== originalPostAuthorId);
  const shouldShowShareAction = canShare;
  const shouldShowShareCountOnly = !shouldShowShareAction && post.share_count > 0;
  const authorName = getAuthorName(post, t("unknownAuthor"));
  const edited = hasPostBeenEdited(post);
  const likeState = optimisticLikeState ?? {
    count: post.like_count,
    liked: post.liked_by_current_user,
  };
  const sharedLikeState = sharedOptimisticLikeState ?? {
    count: post.shared_post?.like_count ?? 0,
    liked: post.shared_post?.liked_by_current_user ?? false,
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

  function handleToggleSharedLike() {
    if (!post.shared_post) return;

    if (!currentUserId) {
      showToast({
        title: t("likeLoginRequiredTitle"),
        description: t("likeLoginRequired"),
      });
      return;
    }

    const previousState = sharedLikeState;
    const nextLiked = !previousState.liked;
    setSharedOptimisticLikeState({
      count: Math.max(0, previousState.count + (nextLiked ? 1 : -1)),
      liked: nextLiked,
    });

    startSharedLikeTransition(async () => {
      const result = await toggleSocialPostLikeAction(post.shared_post!.id);

      if (result.status === "error") {
        setSharedOptimisticLikeState(previousState);
        showToast({
          title: t("likeFailedTitle"),
          description: t(result.messageKey),
        });
        return;
      }

      setSharedOptimisticLikeState({
        count: result.likeCount ?? 0,
        liked: result.liked ?? false,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
      ]);
    });
  }

  const handleOpenShareModal = useCallback(() => {
    if (!currentUserId) {
      showToast({
        title: t("shareLoginRequiredTitle"),
        description: t("shareLoginRequired"),
      });
      return;
    }

    if (!canShare) {
      showToast({
        title: t("shareFailedTitle"),
        description: t("shareOwnPostNotAllowed"),
      });
      return;
    }

    setShareOpen(true);
  }, [canShare, currentUserId, showToast, t]);

  const handleSharePost = useCallback((caption: string) => {
    startShareTransition(async () => {
      const result = await shareSocialPostAction(post.id, caption);

      if (result.status === "error") {
        showToast({
          title: t("shareFailedTitle"),
          description: t(result.messageKey ?? "updateFailed"),
        });
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
      ]);
      setShareOpen(false);
      showToast({
        title: t("shared"),
      });
    });
  }, [post.id, queryClient, showToast, t]);

  const handleUpdateSharePost = useCallback((caption: string) => {
    startUpdateShareTransition(async () => {
      const result = await updateSocialPostShareAction(post.id, caption);

      if (result.status === "error") {
        showToast({
          title: t("shareFailedTitle"),
          description: t(result.messageKey ?? "updateFailed"),
        });
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
      ]);
      setEditOpen(false);
      showToast({
        title: t("edited"),
      });
    });
  }, [post.id, queryClient, showToast, t]);

  async function handleUpdatedPost() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
      queryClient.invalidateQueries({ queryKey: ["profile-posts"] }),
    ]);
    showToast({
      title: t("edited"),
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
          {edited && (
            <>
              <span aria-hidden="true">·</span>
              <span title={formatPostDate(post.updated_at, locale)}>{t("editedBadge")}</span>
            </>
          )}
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

        {canManage && (
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
                    setEditOpen(true);
                    setMenuOpen(false);
                  }}
                  className="flex h-10 w-full items-center gap-2 rounded px-3 text-left text-sm font-bold text-[#d1d5db] transition-colors hover:bg-[#f49e0b]/10 hover:text-white"
                >
                  <PencilIcon className="size-4" />
                  {t("editPost")}
                </button>
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

      {(post.caption || post.description) && (
        <div className="px-4 py-4 sm:px-5">
          {post.caption && (
            <h2 className="whitespace-pre-wrap break-words text-base font-black leading-6 text-white">{post.caption}</h2>
          )}
          {post.description && (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-[#cbd5e1]">
              {post.description}
            </p>
          )}
        </div>
      )}

      <SocialPostImages
        getImageAriaLabel={(index) =>
          t("openImageViewer", {
            count: post.images.length,
            index: index + 1,
          })
        }
        imageLayout={post.image_layout}
        images={post.images}
        onImageClick={setImageViewerIndex}
      />

      <div className="px-4 sm:px-5">
        <SocialPostAnime anime={post.anime} />
      </div>

      {post.shared_post && (
        <SharedPostPreview
          onImageClick={setSharedImageViewerIndex}
          post={post.shared_post}
        />
      )}

      <div className="flex items-center gap-3 border-t border-[#1a1a24] px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <SocialPostActionButton
            count={likeState.count}
            disabled={isLiking}
            icon={HeartIcon}
            label={t("likePost")}
            onClick={handleToggleLike}
            pressed={likeState.liked}
          />
          <SocialPostActionButton
            count={post.comment_count}
            icon={MessageCircleIcon}
            label={t("commentPost")}
            onClick={() => setCommentsOpen(true)}
          />
          {shouldShowShareAction && (
            <SocialPostActionButton
              count={post.share_count}
              disabled={isSharing}
              icon={Share2Icon}
              label={t("sharePost")}
              onClick={handleOpenShareModal}
            />
          )}
          {shouldShowShareCountOnly && (
            <SocialPostActionStat count={post.share_count} icon={Share2Icon} label={t("shareCount")} />
          )}
        </div>
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

      {editOpen && (
        post.shared_post ? (
          <SharePostModal
            actor={post.author}
            initialCaption={post.caption}
            isPending={isUpdatingShare}
            mode="edit"
            onClose={() => setEditOpen(false)}
            onSubmit={handleUpdateSharePost}
            post={post.shared_post}
          />
        ) : (
          <SocialPostEditorModal
            editPost={post}
            onClose={() => setEditOpen(false)}
            onUpdated={handleUpdatedPost}
          />
        )
      )}

      {commentsOpen && (
        <SocialPostCommentsModal
          currentUserId={currentUserId}
          onClose={() => setCommentsOpen(false)}
          post={post}
        />
      )}

      {shareOpen && (
        <SharePostModal
          actor={post.author}
          isPending={isSharing}
          mode="create"
          onClose={() => setShareOpen(false)}
          onSubmit={handleSharePost}
          post={post.shared_post ?? post}
        />
      )}

      {imageViewerIndex !== null && (
        <SocialPostImageViewer
          currentUserId={currentUserId}
          initialImageIndex={imageViewerIndex}
          isLiking={isLiking}
          likeState={likeState}
          onClose={() => setImageViewerIndex(null)}
          onToggleLike={handleToggleLike}
          post={post}
        />
      )}

      {sharedImageViewerIndex !== null && post.shared_post && (
        <SocialPostImageViewer
          currentUserId={currentUserId}
          initialImageIndex={sharedImageViewerIndex}
          isLiking={isSharedLiking}
          likeState={sharedLikeState}
          onClose={() => setSharedImageViewerIndex(null)}
          onToggleLike={handleToggleSharedLike}
          post={post.shared_post}
        />
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
      <div className="flex items-center border-t border-[#1a1a24] px-3 py-3 sm:px-4">
        <div className="flex gap-1.5">
          <div className="h-9 w-10 rounded bg-[#1a1a24]" />
          <div className="h-9 w-10 rounded bg-[#1a1a24]" />
          <div className="h-9 w-10 rounded bg-[#1a1a24]" />
        </div>
      </div>
    </div>
  );
}

export default SocialPostCard;
