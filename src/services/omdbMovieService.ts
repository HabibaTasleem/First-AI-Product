const API_URL = 'https://www.omdbapi.com/'

export interface Movie {
  Title: string
  Year: string
  imdbID: string
  Type: string
  Poster: string
}

export type OmdbSearchResponse =
  | { Response: 'True'; Search: Movie[] }
  | { Response: 'False'; Error?: string }

export async function searchMovies(query: string): Promise<Movie[]> {
  const apiKey = import.meta.env.VITE_OMDB_API_KEY?.trim()
  const normalizedQuery = query.trim()

  if (!apiKey) {
    throw new Error('OMDb API key is not configured.')
  }

  if (!normalizedQuery) {
    throw new Error('Please enter a movie title to search.')
  }

  let response: Response

  try {
    response = await fetch(
      `${API_URL}?apikey=${encodeURIComponent(apiKey)}&s=${encodeURIComponent(normalizedQuery)}`,
    )
  } catch {
    throw new Error('Unable to connect to the OMDb service. Please try again.')
  }

  if (response.status === 401) {
    throw new Error('OMDb rejected the API key configured as VITE_OMDB_API_KEY in Vercel. Verify the Production value and redeploy.')
  }

  if (response.status === 429) {
    throw new Error('The OMDb daily request limit has been reached. Try again tomorrow.')
  }

  if (!response.ok) {
    throw new Error(`OMDb request failed: ${response.status} ${response.statusText}`)
  }

  let data: unknown

  try {
    data = await response.json()
  } catch {
    throw new Error('OMDb returned invalid JSON.')
  }

  if (!isOmdbSearchResponse(data)) {
    throw new Error('OMDb returned an unexpected response.')
  }

  if (data.Response === 'False') {
    throw new Error(data.Error ?? 'OMDb could not find any movies for this search.')
  }

  return data.Search
}

function isOmdbSearchResponse(data: unknown): data is OmdbSearchResponse {
  if (!data || typeof data !== 'object') {
    return false
  }

  const response = data as Record<string, unknown>

  if (response.Response === 'False') {
    return response.Error === undefined || typeof response.Error === 'string'
  }

  return (
    response.Response === 'True' &&
    Array.isArray(response.Search) &&
    response.Search.every(isMovie)
  )
}

function isMovie(movie: unknown): movie is Movie {
  if (!movie || typeof movie !== 'object') {
    return false
  }

  const candidate = movie as Record<string, unknown>
  return (
    typeof candidate.Title === 'string' &&
    typeof candidate.Year === 'string' &&
    typeof candidate.imdbID === 'string' &&
    typeof candidate.Type === 'string' &&
    typeof candidate.Poster === 'string'
  )
}
