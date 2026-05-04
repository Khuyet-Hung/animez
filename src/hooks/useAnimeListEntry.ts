"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  clampAnimeListProgress,
  createAnimeListUpsertInput,
  createQuickAddInput,
} from "@/lib/anime-list/normalizers";
import type { AnimeMedia } from "@/types/anime";
import type {
  AnimeListEntry,
  AnimeListEntryInput,
  AnimeListStatus,
} from "@/types/anime-list";

export function useAnimeListEntry(anime: AnimeMedia) {
  const { user, loading: authLoading } = useAuth();
  const [entry, setEntry] = useState<AnimeListEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadEntry() {
      setError(null);

      if (authLoading) {
        return;
      }

      if (!user) {
        setEntry(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const supabase = createClient();
      const { data, error: loadError } = await supabase
        .from("anime_list_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("anime_id", anime.id)
        .maybeSingle();

      if (ignore) return;

      if (loadError) {
        setError(loadError.message);
        setEntry(null);
      } else {
        setEntry((data as AnimeListEntry | null) ?? null);
      }

      setLoading(false);
    }

    loadEntry();

    return () => {
      ignore = true;
    };
  }, [anime.id, authLoading, user]);

  const saveEntry = useCallback(
    async (input: AnimeListEntryInput = {}) => {
      if (!user) {
        setError("login_required");
        return null;
      }

      setSaving(true);
      setError(null);

      const totalEpisodes = input.total_episodes ?? anime.episodes ?? null;
      const progressEpisodes =
        typeof input.progress_episodes === "number"
          ? clampAnimeListProgress(input.progress_episodes, totalEpisodes)
          : undefined;

      const payload = {
        user_id: user.id,
        ...createAnimeListUpsertInput(anime, {
          ...input,
          total_episodes: totalEpisodes,
          progress_episodes: progressEpisodes,
        }),
      };

      const supabase = createClient();
      const { data, error: saveError } = await supabase
        .from("anime_list_entries")
        .upsert(payload, { onConflict: "user_id,anime_id" })
        .select("*")
        .single();

      setSaving(false);

      if (saveError) {
        setError(saveError.message);
        return null;
      }

      const nextEntry = data as AnimeListEntry;
      setEntry(nextEntry);
      return nextEntry;
    },
    [anime, user]
  );

  const quickAdd = useCallback(
    async (status?: AnimeListStatus) => {
      if (!user) {
        setError("login_required");
        return null;
      }

      setSaving(true);
      setError(null);

      const payload = {
        user_id: user.id,
        ...createQuickAddInput(anime, status),
      };

      const supabase = createClient();
      const { data, error: saveError } = await supabase
        .from("anime_list_entries")
        .upsert(payload, { onConflict: "user_id,anime_id" })
        .select("*")
        .single();

      setSaving(false);

      if (saveError) {
        setError(saveError.message);
        return null;
      }

      const nextEntry = data as AnimeListEntry;
      setEntry(nextEntry);
      return nextEntry;
    },
    [anime, user]
  );

  const deleteEntry = useCallback(async () => {
    if (!user) {
      setError("login_required");
      return false;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("anime_list_entries")
      .delete()
      .eq("user_id", user.id)
      .eq("anime_id", anime.id);

    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    setEntry(null);
    return true;
  }, [anime.id, user]);

  return {
    entry,
    loading: authLoading || loading,
    saving,
    error,
    needsLogin: !authLoading && !user,
    quickAdd,
    saveEntry,
    deleteEntry,
  };
}
