import type {
  HistoryItem,
  RecommendationCriteria,
  RecommendationResponse,
} from '../types/recommendation'

// Local Vite dev proxies /api to http://localhost:5000; on Vercel this is a same-origin function.
const RECOMMEND_API_URL = '/api/recommend'

export async function requestRecommendations(
  message: string,
  history: HistoryItem[],
  signal?: AbortSignal,
): Promise<RecommendationResponse> {
  let response: Response

  try {
    response = await fetch(RECOMMEND_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('Unable to reach the Movie Assistant server. Is the backend running?')
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // Handled below with a readable message.
  }

  if (!response.ok) {
    const serverError = (data as { error?: unknown } | null)?.error
    throw new Error(
      typeof serverError === 'string' ? serverError : 'The server could not process your message.',
    )
  }

  if (!isRecommendationResponse(data)) {
    throw new Error('The Movie Assistant returned an unexpected response.')
  }

  return data
}

export function criteriaLabels(criteria: RecommendationCriteria | null): string[] {
  if (!criteria) return []

  const labels: string[] = []
  if (criteria.similarTo) labels.push(`Similar to ${criteria.similarTo}`)
  if (criteria.familyFriendly) labels.push('Family-friendly')
  labels.push(...criteria.genres)
  if (criteria.maxRuntime != null) labels.push(`Under ${formatRuntime(criteria.maxRuntime)}`)
  if (criteria.minRuntime != null) labels.push(`Over ${formatRuntime(criteria.minRuntime)}`)
  if (criteria.minRating != null) labels.push(`Rating ${criteria.minRating}+`)
  if (criteria.minYear != null && criteria.maxYear != null) {
    labels.push(`${criteria.minYear}-${criteria.maxYear}`)
  } else if (criteria.minYear != null) {
    labels.push(`${criteria.minYear} or later`)
  } else if (criteria.maxYear != null) {
    labels.push(`${criteria.maxYear} or earlier`)
  }
  labels.push(...criteria.excludeGenres.map((genre) => `No ${genre}`))
  return labels
}

export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

function isRecommendationResponse(data: unknown): data is RecommendationResponse {
  if (!data || typeof data !== 'object') return false
  const candidate = data as Record<string, unknown>
  return (
    typeof candidate.reply === 'string' &&
    Array.isArray(candidate.movies) &&
    Array.isArray(candidate.notes)
  )
}
