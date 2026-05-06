"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
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
import { createSocialPostAction } from "@/lib/social/actions";
import {
  SOCIAL_POST_CAPTION_MAX_LENGTH,
  SOCIAL_POST_DESCRIPTION_MAX_LENGTH,
  SOCIAL_POST_MAX_IMAGES,
  SOCIAL_POST_MAX_SUPPORTING_ANIME,
} from "@/lib/social/validators";
import { formatAnimeTitle } from "@/lib/anime-title";
import type { AnimeMedia } from "@/types/anime";
import type { CreateSocialPostActionState, SocialPostAnimeDraft } from "@/types/social";

interface CreatePostButtonProps {
  initialAnime?: AnimeMedia;
  className?: string;
}

interface SelectedImage {
  id: string;
  file: File;
  url: string;
}

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

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDraftTitle(anime: SocialPostAnimeDraft) {
  return anime.title_english || anime.title_romaji || `Anime #${anime.anime_id}`;
}

function getActionErrorMessage(
  t: (key: string) => string,
  fieldErrors: CreateSocialPostActionState["fieldErrors"],
  messageKey: string | null
) {
  const firstFieldError = Object.values(fieldErrors)[0];
  if (firstFieldError) return t(`errors.${firstFieldError}`);
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
      <div className="flex h-11 overflow-hidden rounded border border-[#f49e0b] bg-[#111118] shadow-[0_0_0_1px_rgba(244,158,11,0.25)] transition-colors">
        <div className="flex w-10 items-center justify-center text-[#6b7280]">
          <SearchIcon className="size-4" />
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold text-white outline-none placeholder:text-[#5f6472]"
          placeholder={t("animeSearchPlaceholder")}
        />
        <div className="flex w-11 items-center justify-center text-[#f49e0b]">
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
        </div>
      </div>

      {error && (
        <p className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded border border-red-500/30 bg-[#2a1015] px-3 py-2 text-xs font-semibold text-red-300 shadow-2xl shadow-black/60">
          {t("errors.animeSearchFailed")}
        </p>
      )}

      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 grid max-h-72 gap-2 overflow-y-auto rounded border border-[#1a1a24] bg-[#0f0f16] p-2 shadow-2xl shadow-black/60">
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
                className="flex items-center gap-3 rounded border border-[#1a1a24] bg-[#111118] p-2 text-left transition-colors hover:border-[#f49e0b]/70"
              >
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-[#1a1a24]">
                  {cover ? (
                    <Image src={cover} alt={title} fill sizes="40px" className="object-cover" unoptimized />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[#5f6472]">
                      <FilmIcon className="size-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-bold text-white">{title}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#6b7280]">
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
          className={`group relative aspect-[2/3] w-full overflow-hidden rounded border bg-[#111118] text-left transition-colors ${
            active
              ? "border-[#f49e0b] shadow-[0_0_0_1px_rgba(244,158,11,0.35)]"
              : anime
                ? "border-[#1a1a24] hover:border-[#f49e0b]/70"
                : "border-dashed border-[#2a2a35] hover:border-[#f49e0b]"
          }`}
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
            <div className="flex size-full flex-col items-center justify-center gap-3 px-3 text-center text-[#9ca3af]">
              {placeholder === "plus" ? (
                <PlusIcon className="size-8 text-white" />
              ) : (
                <FilmIcon className="size-8 text-[#f49e0b]" />
              )}
              <span className="text-sm font-black text-white">{label}</span>
            </div>
          )}

          {anime && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-3 pt-10">
              <p className="text-[10px] font-bold uppercase tracking-normal text-[#f49e0b]">{label}</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-black leading-tight text-white">{title}</h3>
              <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-[#cbd5e1]">
                {[anime.format, anime.season_year].filter(Boolean).join(" · ") || `#${anime.anime_id}`}
              </p>
            </div>
          )}
        </button>

        {anime && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/75 text-white transition-colors hover:bg-red-500"
            aria-label={t("removeAnime")}
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      {anime && onEpisodeChange && (
        <label className="mt-2 flex h-9 items-center gap-2 rounded border border-[#2a2a35] bg-[#0f0f16] px-2 focus-within:border-[#f49e0b]">
          <span className="text-[11px] font-bold text-[#9ca3af]">{t("episode")}</span>
          <input
            type="number"
            min={0}
            value={anime.episode ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              onEpisodeChange(value ? Math.max(0, Math.trunc(Number(value))) : null);
            }}
            className="min-w-0 flex-1 bg-transparent text-right text-sm font-black text-white outline-none"
          />
        </label>
      )}
    </div>
  );
}

function CreatePostModal({
  initialAnime,
  onClose,
  onPublished,
}: {
  initialAnime?: AnimeMedia;
  onClose: () => void;
  onPublished: () => void;
}) {
  const t = useTranslations("social");
  const locale = useLocale();
  const [state, formAction, actionPending] = useActionState(createSocialPostAction, INITIAL_ACTION_STATE);
  const [isDispatching, startTransition] = useTransition();
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [primaryAnime, setPrimaryAnime] = useState<SocialPostAnimeDraft | null>(() =>
    initialAnime ? animeToDraft(initialAnime) : null
  );
  const [supportingAnime, setSupportingAnime] = useState<SocialPostAnimeDraft[]>([]);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [activePicker, setActivePicker] = useState<ActiveAnimePicker | null>(null);
  const [localErrorKey, setLocalErrorKey] = useState<string | null>(null);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const imagesRef = useRef<SelectedImage[]>([]);
  const pending = actionPending || isDispatching;
  const actionErrorMessage =
    state.status === "error" ? getActionErrorMessage(t, state.fieldErrors, state.messageKey) : null;
  const errorMessage = localErrorKey ? t(`errors.${localErrorKey}`) : actionErrorMessage;

  useEffect(() => {
    if (state.status === "success") {
      onPublished();
      onClose();
    }
  }, [onClose, onPublished, state.status]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, []);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const slotsLeft = Math.max(0, SOCIAL_POST_MAX_IMAGES - images.length);
    const nextImages = selectedFiles.slice(0, slotsLeft).map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }));

    setImages((current) => [...current, ...nextImages]);
    event.target.value = "";
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
      setLocalErrorKey("primaryAnimeRequired");
      setActivePicker("primary");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("locale", locale);
    formData.set("primary_anime", JSON.stringify(primaryAnime));
    formData.set("supporting_anime", JSON.stringify(supportingAnime));
    formData.delete("images");
    images.forEach((image) => formData.append("images", image.file));

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
      setLocalErrorKey(null);
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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-4 py-4 backdrop-blur-sm md:items-center">
      <div className="flex w-full max-w-3xl max-h-[86vh] flex-col overflow-hidden rounded-lg border border-[#1a1a24] bg-[#0f0f16] shadow-2xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="description" value={description} />

          <div className="flex items-center justify-between gap-4 border-b border-[#1a1a24] bg-[#111118] px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#2a2a35] bg-[#0f0f16] text-[#f49e0b]">
                <FilmIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="line-clamp-1 text-lg font-black leading-tight text-white">{t("createPost")}</h2>
                <p className="mt-1 line-clamp-1 text-sm font-semibold text-[#9ca3af]">{t("createPostTitle")}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 items-center justify-center rounded-full border border-[#1a1a24] bg-black/20 text-[#9ca3af] transition-colors hover:text-white"
                aria-label={t("cancel")}
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-6">
              <label className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-[#d1d5db]">
                    <span className="size-2 rounded-full bg-[#f49e0b]" />
                    {t("caption")}
                  </span>
                  <span className="text-xs font-bold text-[#5f6472]">
                    {caption.length}/{SOCIAL_POST_CAPTION_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  name="caption"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  maxLength={SOCIAL_POST_CAPTION_MAX_LENGTH}
                  rows={4}
                  className="min-h-[100px] resize-none rounded border border-[#1a1a24] bg-[#111118] px-3 py-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-[#5f6472] focus:border-[#f49e0b]"
                  placeholder={t("captionPlaceholder")}
                />
              </label>

              <div className="-mt-3 space-y-3">
                {!descriptionOpen && !description && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDescriptionOpen(true)}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-blue-400 transition-colors hover:text-blue-300"
                    >
                      <PlusIcon className="size-4" />
                      {t("addDescription")}
                    </button>
                  </div>
                )}

                {(descriptionOpen || description) && (
                  <label className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-normal text-[#9ca3af]">
                        {t("description")}
                      </span>
                      <span className="text-xs font-bold text-[#5f6472]">
                        {description.length}/{SOCIAL_POST_DESCRIPTION_MAX_LENGTH}
                      </span>
                    </div>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={SOCIAL_POST_DESCRIPTION_MAX_LENGTH}
                      rows={4}
                      className="resize-none rounded border border-[#1a1a24] bg-[#111118] px-3 py-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-[#5f6472] focus:border-[#f49e0b]"
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

              {images.length > 0 && (
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square overflow-hidden rounded border border-[#1a1a24] bg-[#111118]"
                    >
                      <div
                        className="size-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${image.url})` }}
                        aria-label={image.file.name}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1.5 text-[11px] font-bold text-white">
                        <p className="truncate">{image.file.name}</p>
                        <p className="text-[#9ca3af]">{formatBytes(image.file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/70 text-white opacity-100 transition-colors hover:bg-red-500 md:opacity-0 md:group-hover:opacity-100"
                        aria-label={t("removeImage")}
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </div>
                  ))}
                </section>
              )}

              {errorMessage && (
                <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
                  {errorMessage}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[#1a1a24] bg-[#111118] px-5 py-4">
            <div className="flex items-center gap-2">
              <label
                className="flex size-10 cursor-pointer items-center justify-center rounded border border-[#2a2a35] text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                title={t("chooseImages")}
              >
                <ImagePlusIcon className="size-4" />
                <input
                  type="file"
                  name="images"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageChange}
                  disabled={images.length >= SOCIAL_POST_MAX_IMAGES}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded border border-[#2a2a35] text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white"
                aria-label="Hashtag"
                title="Hashtag"
              >
                <HashIcon className="size-4" />
              </button>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded border border-[#2a2a35] text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white"
                aria-label="Emoji"
                title="Emoji"
              >
                <SmileIcon className="size-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded border border-[#2a2a35] px-4 text-sm font-black text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
              {pending ? t("publishing") : t("publish")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreatePostButton({ initialAnime, className = "" }: CreatePostButtonProps) {
  const t = useTranslations("social");
  const pathname = usePathname();
  const { showToast } = useToast();
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  const handlePublished = useCallback(() => {
    showToast({
      title: t("published"),
    });
  }, [showToast, t]);

  function handleClick() {
    if (!loading && !user) {
      setLoginPromptOpen(true);
      return;
    }

    setModalOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex h-10 items-center justify-center gap-2 rounded border border-[#2a2a35] bg-[#111118] px-3 text-sm font-bold text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {loading ? <Loader2Icon className="size-4 animate-spin" /> : <MessageSquarePlusIcon className="size-4" />}
        <span>{t("createPost")}</span>
      </button>

      {loginPromptOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-[#1a1a24] bg-[#111118] p-5 shadow-2xl">
            <h2 className="text-lg font-black text-white">{t("loginRequiredTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-[#9ca3af]">
              {t("loginRequiredDescription")}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLoginPromptOpen(false)}
                className="h-10 rounded border border-[#1a1a24] px-4 text-sm font-bold text-[#d1d5db] transition-colors hover:border-[#f49e0b] hover:text-white"
              >
                {t("cancel")}
              </button>
              <Link
                href={loginHref}
                className="inline-flex h-10 items-center rounded bg-[#f49e0b] px-4 text-sm font-black text-[#0a0a0f] transition-colors hover:bg-[#d68a09]"
              >
                {t("goToLogin")}
              </Link>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <CreatePostModal
          initialAnime={initialAnime}
          onClose={() => setModalOpen(false)}
          onPublished={handlePublished}
        />
      )}
    </>
  );
}
