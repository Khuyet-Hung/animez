"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-[#1a1a24] bg-[#111118] py-12 mt-auto">
      <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1">
          <div className="flex items-center gap-2 text-white mb-4">
            <div className="size-6 text-[#f49e0b]">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" fill="currentColor"/>
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight">ANIMEZ</span>
          </div>
          <p className="text-[#9ca3af] text-sm">{t("tagline")}</p>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4">{t("navigation")}</h4>
          <ul className="flex flex-col gap-2 text-sm text-[#9ca3af]">
            <li><Link href="/" className="hover:text-[#f49e0b] transition-colors">{t("home")}</Link></li>
            <li><Link href="/feed" className="hover:text-[#f49e0b] transition-colors">{t("feed")}</Link></li>
            <li><Link href="/search" className="hover:text-[#f49e0b] transition-colors">{t("browse")}</Link></li>
            <li><Link href="/search?season=WINTER&seasonYear=2025" className="hover:text-[#f49e0b] transition-colors">{t("seasonal")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4">{t("account")}</h4>
          <ul className="flex flex-col gap-2 text-sm text-[#9ca3af]">
            <li><a href="#" className="hover:text-[#f49e0b] transition-colors">{t("login")}</a></li>
            <li><a href="#" className="hover:text-[#f49e0b] transition-colors">{t("signup")}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4">{t("follow")}</h4>
          <div className="flex gap-4">
            <a href="#" className="text-[#9ca3af] hover:text-[#f49e0b] transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 mt-12 pt-8 border-t border-[#1a1a24] text-center text-[#9ca3af] text-sm">
        <p>{t("copyright")}</p>
      </div>
    </footer>
  );
}
