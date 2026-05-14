export const RECOMMENDATION_CANDIDATES_QUERY = `
  query RecommendationCandidates(
    $page: Int
    $perPage: Int
    $genre: String
    $format: MediaFormat
    $seasonYearGreater: FuzzyDateInt
    $seasonYearLesser: FuzzyDateInt
    $sort: [MediaSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      media(
        type: ANIME
        genre: $genre
        format: $format
        startDate_greater: $seasonYearGreater
        startDate_lesser: $seasonYearLesser
        sort: $sort
        isAdult: false
      ) {
        id
        title { romaji english native }
        coverImage { large extraLarge color }
        averageScore
        popularity
        genres
        format
        episodes
        seasonYear
      }
    }
  }
`;

export const RECOMMENDATION_ENTRY_METADATA_QUERY = `
  query RecommendationEntryMetadata($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(id_in: $ids, type: ANIME, isAdult: false) {
        id
        genres
        format
        seasonYear
        episodes
        title { romaji english native }
        coverImage { large extraLarge color }
      }
    }
  }
`;
