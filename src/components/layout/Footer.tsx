"use client";

import { Link } from "@/i18n/navigation";
import AppLogo from "@/components/common/AppLogo";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-auto border-t border-border bg-surface py-12">
      <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1">
          <div className="mb-4 flex items-center gap-2 text-fg">
            <AppLogo className=" w-[160px]" sizes="72px" />
          </div>
          <p className="text-sm text-fg-muted">{t("tagline")}</p>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-fg">{t("navigation")}</h4>
          <ul className="flex flex-col gap-2 text-sm text-fg-muted">
            <li><Link href="/" className="transition-colors hover:text-brand">{t("home")}</Link></li>
            <li><Link href="/feed" className="transition-colors hover:text-brand">{t("feed")}</Link></li>
            <li><Link href="/search" className="transition-colors hover:text-brand">{t("browse")}</Link></li>
            <li><Link href="/search?season=WINTER&seasonYear=2025" className="transition-colors hover:text-brand">{t("seasonal")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-fg">{t("account")}</h4>
          <ul className="flex flex-col gap-2 text-sm text-fg-muted">
            <li><a href="#" className="transition-colors hover:text-brand">{t("login")}</a></li>
            <li><a href="#" className="transition-colors hover:text-brand">{t("signup")}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-fg">{t("follow")}</h4>
          <div className="flex gap-4">
            <a href="#" className="text-fg-muted transition-colors hover:text-brand">
              <span className="sr-only">Twitter</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[1400px] border-t border-border px-6 pt-8 text-center text-sm text-fg-muted">
        <p>{t("copyright")}</p>
      </div>
    </footer>
  );
}
