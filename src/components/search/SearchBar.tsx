"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

export default function SearchBar() {
  const t = useTranslations("search");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
      router.push(`/search?${params.toString()}`);
    },
    [query, router, searchParams]
  );

  function clearSearch() {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    router.push(`/search?${params.toString()}`);
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex w-full items-stretch rounded bg-[#111118] border border-[#1a1a24] focus-within:border-[#f49e0b] transition-colors h-12">
        <div className="text-[#9ca3af] flex items-center justify-center pl-4">
          <span className="material-symbols-outlined" style={{ fontSize: "22px" }}><SearchIcon /></span>
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent border-none text-base text-white focus:outline-none placeholder:text-[#6b7280] px-4"
          placeholder={t("placeholder")}
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="px-3 text-[#9ca3af] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
          </button>
        )}
        <button
          type="submit"
          className="px-5 bg-[#f49e0b] hover:bg-[#d68a09] text-[#0a0a0f] font-bold text-sm rounded-r transition-colors"
        >
          {t("submit")}
        </button>
      </div>
    </form>
  );
}
