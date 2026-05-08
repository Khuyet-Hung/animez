"use client";

import { RadioIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import CreatePostButton from "@/components/social/CreatePostButton";
import SocialFeedList from "@/components/social/feed/SocialFeedList";

export default function SocialFeedPage() {
  const t = useTranslations("feed");

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-4 pb-20 pt-8 md:px-6 md:pt-10">
      <div className="mx-auto grid w-full max-w-3xl gap-8 min-[1400px]:max-w-none min-[1400px]:grid-cols-[minmax(0,1fr)_320px] min-[1400px]:items-start">
        <section className="min-w-0">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 border border-[#2a2a35] bg-[#111118] px-3 py-1.5 text-xs font-black uppercase tracking-normal text-[#f49e0b]">
                <RadioIcon className="size-3.5" />
                {t("eyebrow")}
              </div>
            </div>
          </div>

          <SocialFeedList />
        </section>

        <aside className="hidden min-[1400px]:sticky min-[1400px]:top-24 min-[1400px]:block">
          <div className="border-l border-[#1a1a24] pl-5">
            <p className="text-xs font-black uppercase tracking-normal text-[#f49e0b]">{t("createTitle")}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#9ca3af]">{t("createDescription")}</p>
            <CreatePostButton className="mt-4 max-w-none" title={t("triggerPlaceholder")} />
          </div>
        </aside>
      </div>
      <CreatePostButton variant="floating" className="min-[1400px]:hidden" />
    </main>
  );
}
