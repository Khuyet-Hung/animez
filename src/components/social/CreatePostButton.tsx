"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import momoAvatar from "@/assets/gif/momo_1.gif";
import { useQueryClient } from "@tanstack/react-query";
import {
  FilmIcon,
  HashIcon,
  ImagePlusIcon,
  Loader2Icon,
  MessageSquarePlusIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  SmileIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useToast } from "@/components/common/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { createSocialPostAction, updateSocialPostAction } from "@/lib/social/actions";
import { optimizeImageFile } from "@/lib/images/client-optimization";
import {
  SOCIAL_POST_CAPTION_MAX_LENGTH,
  SOCIAL_POST_DESCRIPTION_MAX_LENGTH,
  getDefaultSocialPostImageLayout,
  SOCIAL_POST_IMAGE_MIME_EXTENSIONS,
  SOCIAL_POST_MAX_IMAGES,
  SOCIAL_POST_MAX_IMAGE_SIZE,
  SOCIAL_POST_MAX_SUPPORTING_ANIME,
} from "@/lib/social/validators";
import { formatAnimeTitle } from "@/lib/anime-title";
import { cn } from "@/lib/cn";
import {
  AppButton,
  AppDialog,
  AppIconButton,
  AppTextarea,
} from "@/components/ui";
import type { AnimeMedia } from "@/types/anime";
import type { CreateSocialPostActionState, SocialFeedAnime, SocialFeedPost, SocialPostAnimeDraft } from "@/types/social";

interface CreatePostButtonProps {
  initialAnime?: AnimeMedia;
  className?: string;
  variant?: "inline" | "floating";
  title?: string;
}

interface SelectedImage {
  id: string;
  file: File;
  url: string;
}

const SOCIAL_POST_IMAGE_MAX_DIMENSION = 1600;
const SOCIAL_POST_IMAGE_TARGET_SIZE = 1024 * 1024;
const SOCIAL_POST_IMAGE_QUALITY = 0.82;
const SOCIAL_POST_IMAGE_OUTPUT_TYPE = "image/webp";

const INITIAL_ACTION_STATE: CreateSocialPostActionState = {
  status: "idle",
  messageKey: null,
  fieldErrors: {},
};

type ActiveAnimePicker = "primary" | "supporting:new" | `supporting:${number}`;

function getAnimeCover(anime: AnimeMedia) {
  return anime.coverImage?.large || anime.coverImage?.extraLarge || anime.coverImage?.medium || null;
}

function animeToDraft(anime: AnimeMedia): SocialPostAnimeDraft {
  return {
    anime_id: anime.id,
    episode: null,
    title_romaji: anime.title.romaji ?? null,
    title_english: anime.title.english ?? null,
    cover_image: getAnimeCover(anime),
    format: anime.format ?? null,
    season_year: anime.seasonYear ?? null,
  };
}

function socialFeedAnimeToDraft(anime: SocialFeedAnime): SocialPostAnimeDraft {
  return {
    anime_id: anime.anime_id,
    episode: anime.episode,
    title_romaji: anime.title_romaji,
    title_english: anime.title_english,
    cover_image: anime.cover_image,
    format: anime.format,
    season_year: anime.season_year,
  };
}

function getPrimaryAnimeDraft(post: SocialFeedPost) {
  const primaryAnime = post.anime.find((anime) => anime.role === "primary");
  return primaryAnime ? socialFeedAnimeToDraft(primaryAnime) : null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDraftTitle(anime: SocialPostAnimeDraft) {
  return anime.title_english || anime.title_romaji || `Anime #${anime.anime_id}`;
}

function getImageSelectionError(files: File[], currentImageCount: number) {
  if (currentImageCount + files.length > SOCIAL_POST_MAX_IMAGES) return "tooManyImages";

  for (const file of files) {
    if (!SOCIAL_POST_IMAGE_MIME_EXTENSIONS[file.type]) return "invalidImageType";
    if (file.size > SOCIAL_POST_MAX_IMAGE_SIZE) return "imageTooLarge";
  }

  return null;
}

function optimizeSocialPostImage(file: File) {
  return optimizeImageFile(file, {
    maxDimension: SOCIAL_POST_IMAGE_MAX_DIMENSION,
    targetSize: SOCIAL_POST_IMAGE_TARGET_SIZE,
    quality: SOCIAL_POST_IMAGE_QUALITY,
    outputType: SOCIAL_POST_IMAGE_OUTPUT_TYPE,
  });
}

function getActionErrorMessage(
  t: (key: string, values?: Record<string, string | number>) => string,
  fieldErrors: CreateSocialPostActionState["fieldErrors"],
  messageKey: string | null,
  fieldErrorValues?: CreateSocialPostActionState["fieldErrorValues"]
) {
  const firstFieldError = Object.entries(fieldErrors).find(([, errorKey]) => Boolean(errorKey));

  if (firstFieldError) {
    const [fieldName, errorKey] = firstFieldError as [
      keyof CreateSocialPostActionState["fieldErrors"],
      string,
    ];

    return t(`errors.${errorKey}`, fieldErrorValues?.[fieldName]);
  }

  if (messageKey) return t(`errors.${messageKey}`);
  return null;
}

function AnimePicker({
  excludeIds,
  onSelect,
}: {
  excludeIds: number[];
  onSelect: (anime: SocialPostAnimeDraft) => void;
}) {
  const t = useTranslations("social");
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const search = query.trim();
    if (search.length < 2) {
      setResults([]);
      setError(false);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(`/api/anime/suggestions?q=${encodeURIComponent(search)}`, {
          signal: abortController.signal,
        });
        if (!response.ok) throw new Error("Unable to load suggestions.");

        const data = (await response.json()) as { results?: AnimeMedia[] };
        setResults((data.results ?? []).filter((anime) => !excludeIds.includes(anime.id)));
      } catch (searchError) {
        if (searchError instanceof DOMException && searchError.name === "AbortError") return;

        setError(true);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [excludeIds, query]);

  return (
    <div className="relative z-20">
      <div className="flex h-11 overflow-hidden rounded-ui-sm border border-brand bg-surface shadow-[0_0_0_1px_rgba(244,158,11,0.25)] transition-colors">
        <div className="flex w-10 items-center justify-center text-fg-subtle">
          <SearchIcon className="size-4" />
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold text-fg outline-none placeholder:text-fg-subtle"
          placeholder={t("animeSearchPlaceholder")}
        />
        <div className="flex w-11 items-center justify-center text-brand">
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
        </div>
      </div>

      {error && (
        <p className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-ui-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 shadow-2xl shadow-black/60">
          {t("errors.animeSearchFailed")}
        </p>
      )}

      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 grid max-h-72 gap-2 overflow-y-auto rounded-ui-sm border border-border bg-bg-muted p-2 shadow-2xl shadow-black/60">
          {results.map((anime) => {
            const title = formatAnimeTitle(anime.title, locale);
            const cover = getAnimeCover(anime);

            return (
              <button
                key={anime.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(animeToDraft(anime));
                  setQuery("");
                  setResults([]);
                }}
                className="flex items-center gap-3 rounded-ui-sm border border-border bg-surface p-2 text-left transition-colors hover:border-brand/70"
              >
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-ui-sm bg-border">
                  {cover ? (
                    <Image src={cover} alt={title} fill sizes="40px" className="object-cover" unoptimized />
                  ) : (
                    <div className="flex size-full items-center justify-center text-fg-subtle">
                      <FilmIcon className="size-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-bold text-fg">{title}</p>
                  <p className="mt-0.5 text-xs font-semibold text-fg-subtle">
                    {[anime.format, anime.seasonYear].filter(Boolean).join(" · ") || `#${anime.id}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnimeSelectionSlot({
  active,
  anime,
  label,
  onClick,
  onEpisodeChange,
  onRemove,
  placeholder,
  size,
}: {
  active: boolean;
  anime: SocialPostAnimeDraft | null;
  label: string;
  onClick: () => void;
  onEpisodeChange?: (episode: number | null) => void;
  onRemove?: () => void;
  placeholder: "label" | "plus";
  size: "primary" | "supporting";
}) {
  const t = useTranslations("social");
  const title = anime ? getDraftTitle(anime) : label;
  const slotWidth = size === "primary" ? "w-[150px] sm:w-[165px]" : "w-[132px] sm:w-[140px]";

  return (
    <div className={`shrink-0 ${slotWidth}`}>
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "group relative aspect-[2/3] w-full overflow-hidden rounded-ui-sm border bg-surface text-left transition-colors",
            active
              ? "border-brand shadow-[0_0_0_1px_rgba(244,158,11,0.35)]"
              : anime
                ? "border-border hover:border-brand/70"
                : "border-dashed border-border-strong hover:border-brand"
          )}
          aria-label={anime ? `${t("changeAnime")}: ${title}` : label}
        >
          {anime?.cover_image ? (
            <Image
              src={anime.cover_image}
              alt={title}
              fill
              sizes={size === "primary" ? "165px" : "140px"}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 px-3 text-center text-fg-muted">
              {placeholder === "plus" ? (
                <PlusIcon className="size-8 text-fg" />
              ) : (
                <FilmIcon className="size-8 text-brand" />
              )}
              <span className="text-sm font-black text-fg">{label}</span>
            </div>
          )}

          {anime && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-3 pt-10">
              <p className="text-[10px] font-bold uppercase tracking-normal text-brand">{label}</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-black leading-tight text-fg">{title}</h3>
              <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-fg-soft">
                {[anime.format, anime.season_year].filter(Boolean).join(" · ") || `#${anime.anime_id}`}
              </p>
            </div>
          )}
        </button>

        {anime && onRemove && (
          <AppIconButton
            type="button"
            onClick={onRemove}
            aria-label={t("removeAnime")}
            variant="danger"
            size="sm"
            className="absolute right-2 top-2 bg-black/75"
          >
            <XIcon className="size-4" />
          </AppIconButton>
        )}
      </div>

      {anime && onEpisodeChange && (
        <label className="mt-2 flex h-9 items-center gap-2 rounded-ui-sm border border-border-strong bg-bg-muted px-2 focus-within:border-brand">
          <span className="text-[11px] font-bold text-fg-muted">{t("episode")}</span>
          <input
            type="number"
            min={0}
            value={anime.episode ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              onEpisodeChange(value ? Math.max(0, Math.trunc(Number(value))) : null);
            }}
            className="min-w-0 flex-1 bg-transparent text-right text-sm font-black text-fg outline-none"
          />
        </label>
      )}
    </div>
  );
}

export function SocialPostEditorModal({
  editPost,
  initialAnime,
  onClose,
  onPublished,
  onUpdated,
}: {
  editPost?: SocialFeedPost;
  initialAnime?: AnimeMedia;
  onClose: () => void;
  onPublished?: () => void | Promise<void>;
  onUpdated?: () => void | Promise<void>;
}) {
  const t = useTranslations("social");
  const locale = useLocale();
  const { showToast } = useToast();
  const isEditing = Boolean(editPost);
  const action = isEditing ? updateSocialPostAction : createSocialPostAction;
  const [state, formAction, actionPending] = useActionState(action, INITIAL_ACTION_STATE);
  const [isDispatching, startTransition] = useTransition();
  const [caption, setCaption] = useState(() => editPost?.caption ?? "");
  const [description, setDescription] = useState(() => editPost?.description ?? "");
  const [primaryAnime, setPrimaryAnime] = useState<SocialPostAnimeDraft | null>(() =>
    editPost
      ? getPrimaryAnimeDraft(editPost)
      : initialAnime
        ? animeToDraft(initialAnime)
        : null
  );
  const [supportingAnime, setSupportingAnime] = useState<SocialPostAnimeDraft[]>(() =>
    editPost
      ? editPost.anime
          .filter((anime) => anime.role === "supporting")
          .sort((first, second) => first.sort_order - second.sort_order)
          .map(socialFeedAnimeToDraft)
      : []
  );
  const [descriptionOpen, setDescriptionOpen] = useState(() => Boolean(editPost?.description));
  const [activePicker, setActivePicker] = useState<ActiveAnimePicker | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const imagesRef = useRef<SelectedImage[]>([]);
  const lastActionErrorSignature = useRef<string | null>(null);
  const pending = actionPending || isDispatching;
  const actionErrorMessage =
    state.status === "error"
      ? getActionErrorMessage(t, state.fieldErrors, state.messageKey, state.fieldErrorValues)
      : null;
  const actionErrorSignature =
    state.status === "error"
      ? JSON.stringify([state.messageKey, state.fieldErrors, state.fieldErrorValues ?? null])
      : null;
  const imageLayout = editPost ? editPost.image_layout : getDefaultSocialPostImageLayout(images.length);

  const showErrorToast = useCallback(
    (errorKey: string) => {
      showToast({
        title: t(`errors.${errorKey}`),
        variant: "error",
      });
    },
    [showToast, t]
  );

  useEffect(() => {
    if (state.status === "success") {
      if (isEditing) {
        void onUpdated?.();
      } else {
        void onPublished?.();
      }
      onClose();
    }
  }, [isEditing, onClose, onPublished, onUpdated, state.status]);

  useEffect(() => {
    if (state.status !== "error") {
      lastActionErrorSignature.current = null;
      return;
    }

    if (!actionErrorMessage || !actionErrorSignature) return;
    if (lastActionErrorSignature.current === actionErrorSignature) return;

    lastActionErrorSignature.current = actionErrorSignature;
    showToast({
      title: actionErrorMessage,
      variant: "error",
    });
  }, [actionErrorMessage, actionErrorSignature, showToast, state.status]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, []);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selectedFiles = Array.from(input.files ?? []);
    if (selectedFiles.length === 0) return;

    const imageError = getImageSelectionError(selectedFiles, images.length);
    if (imageError) {
      showErrorToast(imageError);
      input.value = "";
      return;
    }

    const slotsLeft = Math.max(0, SOCIAL_POST_MAX_IMAGES - images.length);
    const filesToAdd = selectedFiles.slice(0, slotsLeft);

    setImageProcessing(true);

    try {
      const optimizedFiles = await Promise.all(filesToAdd.map(optimizeSocialPostImage));
      const nextImages = optimizedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      }));

      setImages((current) => [...current, ...nextImages]);
    } catch (error) {
      console.error("Failed to optimize social post images", error);
      showErrorToast("uploadFailed");
    } finally {
      setImageProcessing(false);
      input.value = "";
    }
  }

  function removeImage(id: string) {
    setImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((image) => image.id !== id);
    });
  }

  function updateSupportingEpisode(index: number, episode: number | null) {
    setSupportingAnime((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, episode } : item))
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!primaryAnime) {
      showErrorToast("primaryAnimeRequired");
      setActivePicker("primary");
      return;
    }

    if (!isEditing) {
      const imageError = getImageSelectionError(
        images.map((image) => image.file),
        0
      );
      if (imageError) {
        showErrorToast(imageError);
        return;
      }
    }

    const formData = new FormData(event.currentTarget);
    formData.set("locale", locale);
    formData.set("image_layout", imageLayout);
    formData.set("primary_anime", JSON.stringify(primaryAnime));
    formData.set("supporting_anime", JSON.stringify(supportingAnime));
    if (editPost) formData.set("post_id", editPost.id);
    formData.delete("images");
    if (!isEditing) {
      images.forEach((image) => formData.append("images", image.file));
    }

    lastActionErrorSignature.current = null;
    startTransition(() => {
      formAction(formData);
    });
  }

  const primaryAnimeId = primaryAnime?.anime_id ?? null;
  const canAddSupporting = supportingAnime.length < SOCIAL_POST_MAX_SUPPORTING_ANIME;

  function getActiveExcludeIds() {
    if (activePicker === "primary") {
      return supportingAnime.map((item) => item.anime_id);
    }

    if (activePicker?.startsWith("supporting:")) {
      return [
        ...(primaryAnimeId ? [primaryAnimeId] : []),
        ...supportingAnime.map((item) => item.anime_id),
      ];
    }

    return [];
  }

  function handleAnimeSelect(nextAnime: SocialPostAnimeDraft) {
    if (activePicker === "primary") {
      setPrimaryAnime(nextAnime);
      setSupportingAnime((current) => current.filter((item) => item.anime_id !== nextAnime.anime_id));
      setActivePicker(null);
      return;
    }

    if (activePicker === "supporting:new") {
      setSupportingAnime((current) => [...current, nextAnime]);
      setActivePicker(null);
      return;
    }

    if (activePicker?.startsWith("supporting:")) {
      const targetIndex = Number(activePicker.split(":")[1]);
      setSupportingAnime((current) =>
        current.map((item, itemIndex) => (itemIndex === targetIndex ? nextAnime : item))
      );
      setActivePicker(null);
    }
  }

  return (
    <AppDialog open onClose={onClose} size="xl" closeLabel={t("cancel")} className="max-h-[86vh] bg-bg-muted">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="description" value={description} />
          <input type="hidden" name="image_layout" value={imageLayout} />

          <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-ui-pill border border-border-strong bg-bg-muted text-brand">
                <FilmIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="line-clamp-1 text-lg font-black leading-tight text-fg">
                  {t(isEditing ? "editPost" : "createPost")}
                </h2>
                <p className="mt-1 line-clamp-1 text-sm font-semibold text-fg-muted">
                  {t(isEditing ? "editPostTitle" : "createPostTitle")}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <AppIconButton
                type="button"
                onClick={onClose}
                className="bg-black/20"
                aria-label={t("cancel")}
              >
                <XIcon className="size-4" />
              </AppIconButton>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-6">
              <label className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-fg-soft">
                    <span className="size-2 rounded-ui-pill bg-brand" />
                    {t("caption")}
                  </span>
                  <span className="text-xs font-bold text-fg-subtle">
                    {caption.length}/{SOCIAL_POST_CAPTION_MAX_LENGTH}
                  </span>
                </div>
                <AppTextarea
                  name="caption"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  maxLength={SOCIAL_POST_CAPTION_MAX_LENGTH}
                  rows={4}
                  className="min-h-[100px]"
                  placeholder={t("captionPlaceholder")}
                />
              </label>

              <div className="-mt-3 space-y-3">
                {!descriptionOpen && !description && (
                  <div className="flex justify-end">
                    <AppButton
                      type="button"
                      onClick={() => setDescriptionOpen(true)}
                      variant="link"
                      size="sm"
                      leftIcon={<PlusIcon className="size-4" />}
                    >
                      {t("addDescription")}
                    </AppButton>
                  </div>
                )}

                {(descriptionOpen || description) && (
                  <label className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-normal text-fg-muted">
                        {t("description")}
                      </span>
                      <span className="text-xs font-bold text-fg-subtle">
                        {description.length}/{SOCIAL_POST_DESCRIPTION_MAX_LENGTH}
                      </span>
                    </div>
                    <AppTextarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={SOCIAL_POST_DESCRIPTION_MAX_LENGTH}
                      rows={4}
                      placeholder={t("descriptionPlaceholder")}
                    />
                  </label>
                )}
              </div>

              <section
                className="space-y-4"
                onBlur={(event) => {
                  const nextTarget = event.relatedTarget;
                  if (nextTarget && event.currentTarget.contains(nextTarget as Node)) return;

                  setActivePicker(null);
                }}
              >
                {activePicker && (
                  <AnimePicker
                    key={activePicker}
                    excludeIds={getActiveExcludeIds()}
                    onSelect={handleAnimeSelect}
                  />
                )}

                <div className="-mx-5 overflow-x-auto px-5 pb-2">
                  <div className="flex min-w-max items-start gap-4">
                    <AnimeSelectionSlot
                      active={activePicker === "primary"}
                      anime={primaryAnime}
                      label={t("primaryAnime")}
                      onClick={() => setActivePicker("primary")}
                      onEpisodeChange={
                        primaryAnime
                          ? (episode) => setPrimaryAnime((current) => (current ? { ...current, episode } : current))
                          : undefined
                      }
                      onRemove={
                        primaryAnime
                          ? () => {
                              setPrimaryAnime(null);
                              setActivePicker("primary");
                            }
                          : undefined
                      }
                      placeholder="label"
                      size="primary"
                    />

                    {primaryAnime && (
                      <div className="mt-10 flex items-start gap-4">
                        {supportingAnime.map((item, index) => (
                          <AnimeSelectionSlot
                            key={item.anime_id}
                            active={activePicker === `supporting:${index}`}
                            anime={item}
                            label={t("supportingAnime")}
                            onClick={() => setActivePicker(`supporting:${index}`)}
                            onEpisodeChange={(episode) => updateSupportingEpisode(index, episode)}
                            onRemove={() => {
                              setSupportingAnime((current) =>
                                current.filter((animeItem) => animeItem.anime_id !== item.anime_id)
                              );
                              if (activePicker === `supporting:${index}`) setActivePicker(null);
                            }}
                            placeholder="label"
                            size="supporting"
                          />
                        ))}

                        {canAddSupporting && (
                          <AnimeSelectionSlot
                            active={activePicker === "supporting:new"}
                            anime={null}
                            label={t("supportingAnime")}
                            onClick={() => setActivePicker("supporting:new")}
                            placeholder="plus"
                            size="supporting"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {editPost && editPost.images.length > 0 && (
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {editPost.images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square overflow-hidden rounded-ui-sm border border-border bg-surface"
                    >
                      <Image
                        src={image.public_url}
                        alt=""
                        fill
                        sizes="220px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </section>
              )}

              {!editPost && images.length > 0 && (
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square overflow-hidden rounded-ui-sm border border-border bg-surface"
                    >
                      <div
                        className="size-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${image.url})` }}
                        aria-label={image.file.name}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1.5 text-[11px] font-bold text-fg">
                        <p className="truncate">{image.file.name}</p>
                        <p className="text-fg-muted">{formatBytes(image.file.size)}</p>
                      </div>
                      <AppIconButton
                        type="button"
                        onClick={() => removeImage(image.id)}
                        aria-label={t("removeImage")}
                        variant="danger"
                        size="sm"
                        className="absolute right-2 top-2 bg-black/70 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2Icon className="size-4" />
                      </AppIconButton>
                    </div>
                  ))}
                </section>
              )}

            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface px-5 py-4">
            <div className="flex items-center gap-2">
              {!isEditing && (
                <label
                  className="flex size-10 cursor-pointer items-center justify-center rounded-ui-sm border border-border-strong text-fg-soft transition-colors hover:border-brand hover:text-fg has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                  title={t("chooseImages")}
                >
                  <ImagePlusIcon className="size-4" />
                  <input
                    type="file"
                    name="images"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    disabled={images.length >= SOCIAL_POST_MAX_IMAGES || imageProcessing || pending}
                    className="sr-only"
                  />
                </label>
              )}
              <AppIconButton
                type="button"
                aria-label="Hashtag"
                title="Hashtag"
              >
                <HashIcon className="size-4" />
              </AppIconButton>
              <AppIconButton
                type="button"
                aria-label="Emoji"
                title="Emoji"
              >
                <SmileIcon className="size-4" />
              </AppIconButton>
            </div>

            <AppButton
              type="submit"
              disabled={pending || imageProcessing}
              variant="secondary"
              size="sm"
              isLoading={pending || imageProcessing}
              leftIcon={<SendIcon className="size-4" />}
            >
              {pending ? t(isEditing ? "updating" : "publishing") : t(isEditing ? "updatePost" : "publish")}
            </AppButton>
          </div>
        </form>
    </AppDialog>
  );
}

export default function CreatePostButton({ initialAnime, className = "", variant = "inline", title }: CreatePostButtonProps) {
  const t = useTranslations("social");
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  const handlePublished = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["social-feed"] });
    showToast({
      title: t("published"),
    });
  }, [queryClient, showToast, t]);

  function handleClick() {
    if (!loading && !user) {
      setLoginPromptOpen(true);
      return;
    }

    setModalOpen(true);
  }

  const trigger =
    variant === "floating" ? (
      <button
        type="button"
        disabled={loading}
        onClick={handleClick}
        className={cn(
          "fixed bottom-20 right-4 z-40 inline-flex h-12 items-center justify-center gap-2 rounded-ui-pill border border-brand/45 bg-brand px-4 text-sm font-black text-brand-fg shadow-[0_18px_48px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 lg:bottom-6",
          className
        )}
        aria-label={t("createPost")}
        title={t("createPost")}
      >
        {loading ? <Loader2Icon className="size-4 animate-spin" /> : <MessageSquarePlusIcon className="size-4" />}
        <span className="hidden sm:inline">{t("publish")}</span>
      </button>
    ) : (
      <button
        type="button"
        disabled={loading}
        className={cn(
          "group mt-4 flex min-h-16 w-full max-w-md cursor-default! items-center gap-3 rounded-ui-sm border border-border bg-border px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-14",
          className
        )}
        aria-label={t("createPost")}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-ui-pill border border-border-strong bg-border text-fg-muted transition-colors">
          {loading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <Image
              src={momoAvatar}
              alt=""
              width={36}
              height={36}
              className="size-full rounded-ui-pill object-cover"
              unoptimized
            />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg-subtle transition-colors">
          {title || t("triggerPlaceholder")}
        </span>
        <span
          onClick={handleClick}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-ui-sm border border-brand bg-brand px-3 text-sm font-black text-brand-fg transition-colors hover:bg-brand-hover sm:px-4"
        >
          <MessageSquarePlusIcon className="size-4" />
          <span>{t("publish")}</span>
        </span>
      </button>
    );

  return (
    <>
      {trigger}

      <AppDialog
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        title={t("loginRequiredTitle")}
        closeLabel={t("cancel")}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <AppButton type="button" variant="secondary" size="sm" onClick={() => setLoginPromptOpen(false)}>
              {t("cancel")}
            </AppButton>
            <Link
              href={loginHref}
              className="inline-flex h-9 items-center rounded-ui-sm bg-brand px-4 text-sm font-black text-brand-fg transition-colors hover:bg-brand-hover"
            >
              {t("goToLogin")}
            </Link>
          </div>
        }
      >
        <p className="px-5 py-4 text-sm leading-6 text-fg-muted">
          {t("loginRequiredDescription")}
        </p>
      </AppDialog>

      {modalOpen && (
        <SocialPostEditorModal
          initialAnime={initialAnime}
          onClose={() => setModalOpen(false)}
          onPublished={handlePublished}
        />
      )}
    </>
  );
}
