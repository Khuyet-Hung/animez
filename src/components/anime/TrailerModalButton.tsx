"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { Play, X } from "lucide-react";

interface TrailerModalButtonProps {
  videoId: string;
  title: string;
  watchLabel: string;
  closeLabel: string;
}

function TrailerModalButton({
  videoId,
  title,
  watchLabel,
  closeLabel,
}: TrailerModalButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal, isOpen]);

  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label={watchLabel}
        className="absolute bottom-2 right-2 z-10 flex h-7 items-center gap-1 rounded border bg-[#111118]/90 px-2.5 text-xs font-bold text-white shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-[#f49e0b] hover:bg-[#f49e0b] hover:text-[#0a0a0f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f49e0b]"
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        <span>{watchLabel}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]/90 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${watchLabel}: ${title}`}
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded border border-white/10 bg-[#111118] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#1a1a24] px-4 py-3">
              <p className="min-w-0 truncate text-sm font-bold text-white">{title}</p>
              <button
                type="button"
                onClick={closeModal}
                aria-label={closeLabel}
                className="flex h-9 w-9 flex-none items-center justify-center rounded border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={embedUrl}
                title={`${title} trailer`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(TrailerModalButton);
