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
      <div className="flex h-12 w-full items-stretch rounded-ui-sm border border-border bg-surface transition-colors focus-within:border-brand">
        <div className="flex items-center justify-center pl-4 text-fg-muted">
          <span className="material-symbols-outlined" style={{ fontSize: "22px" }}><SearchIcon /></span>
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border-none bg-transparent px-4 text-base text-fg placeholder:text-fg-subtle focus:outline-none"
          placeholder={t("placeholder")}
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="px-3 text-fg-muted transition-colors hover:text-fg"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
          </button>
        )}
        <button
          type="submit"
          className="rounded-r-ui-md bg-brand px-5 text-sm font-bold text-brand-fg transition-colors hover:bg-brand-hover"
        >
          {t("submit")}
        </button>
      </div>
    </form>
  );
}
