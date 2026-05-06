import { NextResponse } from "next/server";
import { anilistClient } from "@/lib/anilist";
import { SUGGESTIONS_QUERY } from "@/lib/queries";
import type { AnimeMedia } from "@/types/anime";

interface SuggestionsData {
  Page: {
    media: AnimeMedia[];
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q")?.trim() ?? "";

  if (search.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await anilistClient.request<SuggestionsData>(SUGGESTIONS_QUERY, {
      search,
    });

    return NextResponse.json({
      results: data.Page.media,
    });
  } catch {
    return NextResponse.json(
      { results: [], message: "Unable to load anime suggestions." },
      { status: 502 }
    );
  }
}
