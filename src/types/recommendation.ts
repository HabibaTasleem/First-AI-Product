// Shapes returned by POST /api/recommend (see server/recommend.js).

export interface RecommendedMovie {
  imdbID: string
  Title: string
  Year: string
  Type: string
  /** Poster URL, or "N/A" when OMDb has no poster. */
  Poster: string
  genres: string[]
  /** Runtime in minutes. */
  runtime: number | null
  /** IMDb rating, 0-10. */
  rating: number | null
  /** MPAA / TV rating such as PG-13. */
  rated: string | null
  plot: string
  /** Why the AI picked it for this request. */
  reason: string | null
}

export interface RecommendationCriteria {
  genres: string[]
  excludeGenres: string[]
  maxRuntime: number | null
  minRuntime: number | null
  minRating: number | null
  minYear: number | null
  maxYear: number | null
  familyFriendly: boolean
  similarTo: string | null
  count: number
}

export interface RecommendationResponse {
  reply: string
  movies: RecommendedMovie[]
  criteria: RecommendationCriteria | null
  notes: string[]
  /** "fallback" means Gemini was unavailable and the built-in parser was used. */
  source: 'ai' | 'fallback'
}

export interface HistoryItem {
  role: 'user' | 'assistant'
  content: string
  titles?: string[]
}
