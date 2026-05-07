"use client";

import { memo } from "react";
import Image from "next/image";
import {
  BookmarkIcon,
  ClockIcon,
  EllipsisIcon,
  HeartIcon,
  MessageCircleIcon,
  Share2Icon,
  UserCircleIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import SocialPostAnime from "@/components/social/feed/SocialPostAnime";
import SocialPostImages from "@/components/social/feed/SocialPostImages";
import type { SocialFeedPost } from "@/types/social";

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

function SocialPostActionButton({ icon: Icon, label }: { icon: typeof HeartIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-9 min-w-10 items-center justify-center rounded border border-[#2a2a35] px-3 text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white"
    >
      <Icon className="size-4" />
    </button>
  );
}

const SocialPostCard = memo(function SocialPostCard({ post }: { post: SocialFeedPost }) {
  const locale = useLocale();
  const t = useTranslations("feed");
  const authorName = getAuthorName(post, t("unknownAuthor"));
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

        <button
          type="button"
          aria-label="Tùy chọn bài viết"
          className="flex size-9 shrink-0 items-center justify-center rounded border border-[#2a2a35] text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white"
        >
          <EllipsisIcon className="size-4" />
        </button>
      </div>

      <SocialPostImages images={post.images} />

      <div className={`${post.images.length > 0 ? "border-t border-[#1a1a24]" : ""} px-4 py-4 sm:px-5`}>
        <h2 className="whitespace-pre-wrap break-words text-base font-black leading-6 text-white">{post.caption}</h2>
        {post.description && (
          <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-[#cbd5e1]">
            {post.description}
          </p>
        )}
        <SocialPostAnime anime={post.anime} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#1a1a24] px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <SocialPostActionButton icon={HeartIcon} label="Thích bài viết" />
          <SocialPostActionButton icon={MessageCircleIcon} label="Bình luận bài viết" />
          <SocialPostActionButton icon={Share2Icon} label="Chia sẻ bài viết" />
        </div>
        <SocialPostActionButton icon={BookmarkIcon} label="Lưu bài viết" />
      </div>
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
      <div className="aspect-[16/10] bg-[#0a0a0f]" />
      <div className="grid gap-3 border-t border-[#1a1a24] px-4 py-4 sm:px-5">
        <div className="h-4 w-11/12 rounded bg-[#1a1a24]" />
        <div className="h-4 w-7/12 rounded bg-[#1a1a24]" />
        <div className="h-7 w-48 rounded-full bg-[#1a1a24]" />
      </div>
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
