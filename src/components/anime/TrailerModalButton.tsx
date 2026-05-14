"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { Play } from "lucide-react";
import { AppDialog } from "@/components/ui";

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
        className="absolute bottom-2 right-2 z-10 flex h-7 items-center gap-1 rounded-ui-sm border border-border bg-surface/90 px-2.5 text-xs font-bold text-fg shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-brand hover:bg-brand hover:text-brand-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        <span>{watchLabel}</span>
      </button>

      <AppDialog
        open={isOpen}
        onClose={closeModal}
        title={title}
        closeLabel={closeLabel}
        closeOnOverlay
        size="xl"
        className="bg-surface"
      >
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
      </AppDialog>
    </>
  );
}

export default memo(TrailerModalButton);
