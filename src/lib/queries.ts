// AniList GraphQL Queries

export const TRENDING_QUERY = `
  query GetTrending($page: Int, $perPage: Int) {
    trending: Page(page: $page, perPage: $perPage) {
      media(sort: TRENDING_DESC, type: ANIME) {
        id
        title { romaji english native }
        coverImage { medium large extraLarge color }
        bannerImage
        averageScore
        genres
        format
        status
        episodes
        season
        seasonYear
        description(asHtml: false)
      }
    }
    topAllTime: Page(page: 1, perPage: 10) {
      media(sort: SCORE_DESC, type: ANIME) {
        id
        title { romaji english native }
        coverImage { medium large extraLarge color }
        averageScore
        genres
        format
      }
    }
  }
`;

export const SEARCH_QUERY = `
  query SearchAnime(
    $search: String
    $page: Int
    $perPage: Int
    $genre: String
    $format: MediaFormat
    $status: MediaStatus
    $season: MediaSeason
    $seasonYear: Int
    $sort: [MediaSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(
        search: $search
        type: ANIME
        genre: $genre
        format: $format
        status: $status
        season: $season
        seasonYear: $seasonYear
        sort: $sort
        isAdult: false
      ) {
        id
        title { romaji english native }
        coverImage { medium large extraLarge color }
        averageScore
        genres
        format
        status
        episodes
        season
        seasonYear
      }
    }
  }
`;

export const ANIME_DETAIL_QUERY = `
  query GetAnimeDetail($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english native }
      coverImage { medium large extraLarge color }
      bannerImage
      averageScore
      meanScore
      popularity
      favourites
      trailer {
        id
        site
        thumbnail
      }
      genres
      format
      status
      episodes
      duration
      season
      seasonYear
      nextAiringEpisode {
        episode
        airingAt
        timeUntilAiring
      }
      source
      studios(isMain: true) { nodes { id name } }
      description(asHtml: false)
      characters(sort: ROLE, perPage: 12) {
        edges {
          role
          node { id name { full } image { medium } }
          voiceActors(language: JAPANESE) { id name { full } image { medium } }
        }
      }
      recommendations(perPage: 8) {
        nodes {
          mediaRecommendation {
            id
            title { romaji english native }
            coverImage { medium large }
            averageScore
            format
          }
        }
      }
      relations {
        edges {
          relationType
          node {
            id
            title { romaji english native }
            coverImage { medium large }
            averageScore
            format
            type
          }
        }
      }
    }
  }
`;

export const SUGGESTIONS_QUERY = `
  query GetSuggestions($search: String!) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: ANIME, isAdult: false) {
        id
        title { romaji english native }
        coverImage { medium large }
        format
        episodes
        seasonYear
      }
    }
  }
`;
