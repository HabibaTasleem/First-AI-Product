// Movie recommendation engine.
//
// Flow:  user request -> Gemini turns it into structured criteria + candidate titles
//        -> every candidate is looked up in OMDb (real runtime / rating / genre / poster / plot)
//        -> the APP filters the real data against the criteria (the AI never decides what passes)
//        -> verified movies are returned and the UI renders them as movie cards.
//
// This file has no third-party dependencies, so the same code runs in the local Express
// server (server/index.js) and in the Vercel serverless function (api/recommend.js).

const OMDB_URL = 'https://www.omdbapi.com/'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-3.6-flash'

const DEFAULT_COUNT = 6
const MAX_COUNT = 8
const MAX_ROUNDS = 2 // first pass + one top-up pass when too few movies survive the filters
const MAX_LOOKUPS_PER_ROUND = 24
const MAX_MESSAGE_LENGTH = 500
const MAX_HISTORY_ITEMS = 8

export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'Film-Noir', 'History', 'Horror', 'Music', 'Musical',
  'Mystery', 'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western',
]

// alias (regex source) -> canonical OMDb genre
const GENRE_ALIASES = [
  ['comedy|comedies|comedic|funny|hilarious', 'Comedy'],
  ['action|action-packed', 'Action'],
  ['adventure|adventures', 'Adventure'],
  ['animation|animated|cartoon|cartoons', 'Animation'],
  ['biography|biopic|biopics|biographical', 'Biography'],
  ['crime|gangster|heist', 'Crime'],
  ['documentary|documentaries', 'Documentary'],
  ['drama|dramas|dramatic', 'Drama'],
  ['family', 'Family'],
  ['fantasy', 'Fantasy'],
  ['film noir|film-noir|noir', 'Film-Noir'],
  ['history|historical', 'History'],
  ['horror|scary|spooky|creepy', 'Horror'],
  ['music|concert', 'Music'],
  ['musical|musicals', 'Musical'],
  ['mystery|whodunit|detective', 'Mystery'],
  ['romance|romantic|love story', 'Romance'],
  ['sci-fi|scifi|sci fi|science fiction', 'Sci-Fi'],
  ['sport|sports', 'Sport'],
  ['thriller|thrillers|suspense|suspenseful', 'Thriller'],
  ['war', 'War'],
  ['western|westerns|cowboy', 'Western'],
]

const FAMILY_SAFE_RATINGS = new Set(['G', 'PG', 'TV-G', 'TV-PG', 'TV-Y', 'TV-Y7', 'TV-Y7-FV'])
const FAMILY_BLOCKED_GENRES = ['Horror', 'Crime', 'Thriller', 'War', 'Film-Noir']

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export class RecommendationError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.name = 'RecommendationError'
    this.status = status
  }
}

export function getConfig(env = {}) {
  return {
    geminiKey: env.GEMINI_API_KEY?.trim() || '',
    geminiModel: env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
    omdbKey: (env.OMDB_API_KEY || env.VITE_OMDB_API_KEY || '').trim(),
  }
}

function redact(text, config) {
  let out = String(text ?? '')
  for (const secret of [config.geminiKey, config.omdbKey]) {
    if (secret) out = out.split(secret).join('[REDACTED]')
  }
  return out
}

function numberOrNull(value, min, max) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

const unique = (items) => [...new Set(items)]

export function toGenres(input) {
  const text = String(input ?? '').toLowerCase().trim()
  if (!text) return []
  const found = new Set()
  if (/rom[\s-]?com|romantic comedy/.test(text)) {
    found.add('Romance')
    found.add('Comedy')
  }
  for (const [alias, genre] of GENRE_ALIASES) {
    if (new RegExp(`(?<![\\w-])(?:${alias})(?![\\w-])`).test(text)) found.add(genre)
  }
  return [...found]
}

export function parseRuntime(value) {
  const match = /(\d+)/.exec(String(value ?? ''))
  return match ? Number(match[1]) : null
}

export function formatRuntime(minutes) {
  if (minutes == null) return ''
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function normalizeTitle(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function titlesClose(requested, found) {
  const a = normalizeTitle(requested)
  const b = normalizeTitle(found)
  if (!a || !b) return false
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  return short.length >= 4 && long.includes(short) && short.length / long.length >= 0.6
}

// ---------------------------------------------------------------------------
// Criteria + plan sanitising (never trust model output)
// ---------------------------------------------------------------------------

export function emptyCriteria() {
  return {
    genres: [],
    excludeGenres: [],
    maxRuntime: null,
    minRuntime: null,
    minRating: null,
    minYear: null,
    maxYear: null,
    familyFriendly: false,
    similarTo: null,
    count: DEFAULT_COUNT,
  }
}

export function sanitizeCriteria(raw = {}) {
  const asList = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? [v] : [])
  const similarTo = typeof raw.similarTo === 'string' ? raw.similarTo.trim().slice(0, 120) : ''
  return {
    genres: unique(asList(raw.genres).flatMap(toGenres)),
    excludeGenres: unique(asList(raw.excludeGenres).flatMap(toGenres)),
    maxRuntime: numberOrNull(raw.maxRuntime, 30, 600),
    minRuntime: numberOrNull(raw.minRuntime, 30, 600),
    minRating: numberOrNull(raw.minRating, 0, 10),
    minYear: numberOrNull(raw.minYear, 1888, 2100),
    maxYear: numberOrNull(raw.maxYear, 1888, 2100),
    familyFriendly: raw.familyFriendly === true,
    similarTo: similarTo || null,
    count: Math.round(numberOrNull(raw.count, 1, MAX_COUNT) ?? DEFAULT_COUNT),
  }
}

export function sanitizeCandidates(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const item of raw) {
    const title = typeof item === 'string' ? item : item?.title
    if (typeof title !== 'string' || !title.trim()) continue
    const key = normalizeTitle(title)
    if (!key || seen.has(key)) continue
    seen.add(key)
    const year = numberOrNull(item?.year, 1888, 2100)
    const reason = typeof item?.reason === 'string' ? item.reason.trim().slice(0, 160) : ''
    out.push({ title: title.trim().slice(0, 120), year: year ? Math.round(year) : null, reason })
    if (out.length >= MAX_LOOKUPS_PER_ROUND) break
  }
  return out
}

export function sanitizePlan(raw) {
  const intent = raw?.intent === 'chat' ? 'chat' : 'recommend'
  return {
    intent,
    reply: typeof raw?.reply === 'string' ? raw.reply.trim().slice(0, 1200) : '',
    criteria: sanitizeCriteria(raw?.criteria),
    candidates: sanitizeCandidates(raw?.candidates),
  }
}

// ---------------------------------------------------------------------------
// Gemini: understand the request
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the planning brain of a movie recommendation assistant inside a movie app.
Turn the user's request into a JSON plan. Real movie data (runtime, rating, genre, poster, plot) is fetched afterwards from OMDb and the app checks every constraint itself, so your job is to understand the request and propose real candidate films.

Return ONLY JSON in this shape:
{
  "intent": "recommend" | "chat",
  "reply": string,
  "criteria": {
    "genres": string[],
    "excludeGenres": string[],
    "maxRuntime": number | null,
    "minRuntime": number | null,
    "minRating": number | null,
    "minYear": number | null,
    "maxYear": number | null,
    "familyFriendly": boolean,
    "similarTo": string | null,
    "count": number
  },
  "candidates": [ { "title": string, "year": number, "reason": string } ]
}

Rules:
- intent "recommend": any request to find, suggest or pick movies. intent "chat": other movie questions (cast, plot, trivia) or small talk. For "chat", put a short friendly answer (max 3 sentences) in "reply" and leave candidates empty. For "recommend", leave "reply" empty.
- genres must come from: ${GENRES.join(', ')}. Only include genres the user asked for or clearly implied (for example "scary" means Horror).
- Runtimes are in minutes: "2 hours" = 120, "90 minutes" = 90, "under"/"only have"/"shorter than" set maxRuntime, "at least"/"longer than" set minRuntime.
- Ratings use the IMDb 0-10 scale: "rating above 7" = minRating 7. "highly rated" or "really good" = 7.5.
- familyFriendly is true for family, kids or child-safe requests. Do not add the Family genre unless the user asks for it by name.
- similarTo is the title the user wants something similar to; otherwise null. Never put that title in candidates.
- count is how many movies the user wants (default ${DEFAULT_COUNT}, maximum ${MAX_COUNT}).
- candidates: up to 20 real, well-known feature films (no TV series) that are likely to satisfy EVERY constraint. Use exact English titles with release years. Mix eras and popularity. For similar-to requests choose films with matching themes, tone or style.
- reason: at most 16 words, specific to this user's request, no spoilers.
- Use the conversation history to resolve follow-ups such as "something shorter" or "another one", and do not repeat titles already recommended unless asked.`

function formatHistory(history) {
  if (!Array.isArray(history)) return ''
  return history
    .slice(-MAX_HISTORY_ITEMS)
    .filter((item) => item && typeof item.content === 'string' && (item.role === 'user' || item.role === 'assistant'))
    .map((item) => {
      const text = item.content.trim().slice(0, 400)
      const titles = Array.isArray(item.titles) && item.titles.length
        ? ` [recommended: ${item.titles.slice(0, 8).join('; ')}]`
        : ''
      return `${item.role === 'user' ? 'User' : 'Assistant'}: ${text}${titles}`
    })
    .join('\n')
}

async function callGemini({ message, history, config, fetchImpl, keepCriteria, excludeTitles }) {
  const parts = []
  const historyText = formatHistory(history)
  if (historyText) parts.push(`Conversation so far:\n${historyText}`)
  parts.push(`User request: ${message}`)
  if (keepCriteria) {
    parts.push(`This is a top-up pass. Keep these criteria exactly: ${JSON.stringify(keepCriteria)}`)
    parts.push(`Already checked, do not repeat: ${excludeTitles.join('; ')}. Return 20 NEW candidates.`)
  }

  const response = await fetchImpl(`${GEMINI_BASE}/${encodeURIComponent(config.geminiModel)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: parts.join('\n\n') }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Gemini responded ${response.status}: ${redact(body.slice(0, 300), config)}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return sanitizePlan(JSON.parse(json))
}

// ---------------------------------------------------------------------------
// Offline fallback: used when Gemini is unavailable (quota, outage, no key)
// ---------------------------------------------------------------------------

function toMinutes(value, unit) {
  const n = Number(value)
  return /^h/i.test(unit) ? Math.round(n * 60) : Math.round(n)
}

export function fallbackParse(message) {
  const criteria = emptyCriteria()
  let text = ` ${String(message ?? '').toLowerCase()} `

  // similar to X
  const similar = /(?:similar to|something like|movies like|films like|anything like|more like|in the vein of|reminds? me of)\s+["“']?([^"”,.?!]+?)["”']?(?=\s+(?:but|and|with|that|which|under|over|below|above|rated)\b|[,.?!]|\s*$)/i
    .exec(message ?? '')
  if (similar) criteria.similarTo = similar[1].trim().slice(0, 120)

  // "1 hour 30 minutes" / "1h30"
  text = text.replace(/(\d+)\s*(?:hours?|hrs?|h)\s*(?:and\s*)?(\d+)\s*(?:minutes?|mins?|m)?\b/g, (_, h, m) => ` ${Number(h) * 60 + Number(m)} minutes `)

  const unit = '(hours?|hrs?|h|minutes?|mins?|m)'
  const maxRuntime = new RegExp(`(?:under|below|less than|within|at most|no more than|shorter than|up to|max(?:imum)?(?: of)?|only have|have only|i have|got)\\s+(\\d+(?:\\.\\d+)?)\\s*${unit}\\b`).exec(text)
  const maxRuntimeAfter = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}\\s*(?:or less|or under|max|tops)`).exec(text)
  const minRuntime = new RegExp(`(?:over|above|more than|longer than|at least|min(?:imum)?(?: of)?)\\s+(\\d+(?:\\.\\d+)?)\\s*${unit}\\b`).exec(text)
  if (maxRuntime) criteria.maxRuntime = toMinutes(maxRuntime[1], maxRuntime[2])
  else if (maxRuntimeAfter) criteria.maxRuntime = toMinutes(maxRuntimeAfter[1], maxRuntimeAfter[2])
  if (minRuntime) criteria.minRuntime = toMinutes(minRuntime[1], minRuntime[2])
  // remove runtime phrases so their numbers are not mistaken for ratings
  text = text.replace(new RegExp(`\\d+(?:\\.\\d+)?\\s*${unit}\\b`, 'g'), ' ')

  // rating
  const rating = /(?:above|over|higher than|more than|at least|greater than|min(?:imum)?(?: of)?|>=?|≥|rating of|rated)\s*(\d(?:\.\d)?|10)\b/.exec(text)
    || /\b(\d(?:\.\d)?|10)\s*(?:\+|\/10|stars?|or (?:higher|above|better))/.exec(text)
  if (rating) criteria.minRating = Math.min(10, Number(rating[1]))
  else if (/highly rated|top rated|top-rated|critically acclaimed|best rated|well rated/.test(text)) criteria.minRating = 7.5

  // family friendly
  if (/family[\s-]?friendly|for (?:the )?kids|with (?:my |the )?(?:kids|children)|child[\s-]?friendly|whole family/.test(text)) {
    criteria.familyFriendly = true
    text = text.replace(/family[\s-]?friendly|whole family/g, ' ')
  }

  // genres (ignore the "similar to <title>" part so a title doesn't add genres)
  const genreText = criteria.similarTo ? text.replace(criteria.similarTo.toLowerCase(), ' ') : text
  const negated = /\b(?:no|not|without|except|avoid)\s+([a-z\- ]{3,30})/.exec(genreText)
  criteria.excludeGenres = negated ? toGenres(negated[1]) : []
  criteria.genres = toGenres(genreText).filter((g) => !criteria.excludeGenres.includes(g))

  // years
  const after = /(?:after|since|from)\s+((?:19|20)\d{2})/.exec(text)
  const before = /before\s+((?:19|20)\d{2})/.exec(text)
  if (after) criteria.minYear = Number(after[1])
  if (before) criteria.maxYear = Number(before[1])
  const decade = /\b(?:19)?([5-9]0)s\b/.exec(text)
  if (decade) {
    criteria.minYear = 1900 + Number(decade[1])
    criteria.maxYear = criteria.minYear + 9
  }

  // count
  const count = /\b(\d{1,2})\s+(?:movies?|films?|suggestions?|picks?|recommendations?|options?)\b/.exec(text)
  if (count) criteria.count = Math.min(MAX_COUNT, Math.max(1, Number(count[1])))

  const hasSignal = Boolean(
    criteria.genres.length || criteria.maxRuntime || criteria.minRuntime || criteria.minRating
    || criteria.familyFriendly || criteria.similarTo || criteria.minYear || criteria.maxYear
    || /\b(recommend|suggest|watch|movie|film|something)\b/.test(text),
  )
  return { hasSignal, criteria }
}

// [title, year, genres]. Only a pre-filter: every title is still verified against OMDb.
const FALLBACK_POOL = [
  ['Superbad', 2007, ['Comedy']], ['Bridesmaids', 2011, ['Comedy', 'Romance']],
  ['The Grand Budapest Hotel', 2014, ['Comedy', 'Adventure', 'Crime']], ['Groundhog Day', 1993, ['Comedy', 'Fantasy', 'Romance']],
  ['Airplane!', 1980, ['Comedy']], ['Knives Out', 2019, ['Mystery', 'Comedy', 'Crime']],
  ['Game Night', 2018, ['Comedy', 'Mystery']], ['Hot Fuzz', 2007, ['Comedy', 'Action', 'Mystery']],
  ['The Princess Bride', 1987, ['Adventure', 'Comedy', 'Family', 'Fantasy', 'Romance']], ['Paddington 2', 2017, ['Comedy', 'Family', 'Adventure']],
  ['Home Alone', 1990, ['Comedy', 'Family']], ['Mrs. Doubtfire', 1993, ['Comedy', 'Family']],
  ['Toy Story', 1995, ['Animation', 'Adventure', 'Comedy', 'Family']], ['Finding Nemo', 2003, ['Animation', 'Adventure', 'Family']],
  ['Up', 2009, ['Animation', 'Adventure', 'Family']], ['Coco', 2017, ['Animation', 'Family', 'Fantasy', 'Music']],
  ['Spirited Away', 2001, ['Animation', 'Adventure', 'Family', 'Fantasy']], ['The Incredibles', 2004, ['Animation', 'Action', 'Adventure', 'Family']],
  ['Shrek', 2001, ['Animation', 'Adventure', 'Comedy', 'Family', 'Fantasy']], ['Inside Out', 2015, ['Animation', 'Adventure', 'Comedy', 'Family']],
  ['Interstellar', 2014, ['Adventure', 'Drama', 'Sci-Fi']], ['Inception', 2010, ['Action', 'Adventure', 'Sci-Fi', 'Thriller']],
  ['The Martian', 2015, ['Adventure', 'Drama', 'Sci-Fi']], ['Arrival', 2016, ['Drama', 'Sci-Fi', 'Mystery']],
  ['Ex Machina', 2014, ['Drama', 'Sci-Fi', 'Thriller']], ['Gravity', 2013, ['Drama', 'Sci-Fi', 'Thriller']],
  ['Blade Runner 2049', 2017, ['Action', 'Drama', 'Sci-Fi']], ['The Matrix', 1999, ['Action', 'Sci-Fi']],
  ['Moon', 2009, ['Drama', 'Mystery', 'Sci-Fi']], ['Edge of Tomorrow', 2014, ['Action', 'Sci-Fi']],
  ['Mad Max: Fury Road', 2015, ['Action', 'Adventure', 'Sci-Fi']], ['John Wick', 2014, ['Action', 'Crime', 'Thriller']],
  ['Die Hard', 1988, ['Action', 'Thriller']], ['The Dark Knight', 2008, ['Action', 'Crime', 'Drama']],
  ['Gladiator', 2000, ['Action', 'Adventure', 'Drama']], ['Top Gun: Maverick', 2022, ['Action', 'Drama']],
  ['Se7en', 1995, ['Crime', 'Drama', 'Mystery', 'Thriller']], ['Parasite', 2019, ['Comedy', 'Drama', 'Thriller']],
  ['Whiplash', 2014, ['Drama', 'Music']], ['The Shawshank Redemption', 1994, ['Drama']],
  ['Forrest Gump', 1994, ['Drama', 'Romance']], ['Good Will Hunting', 1997, ['Drama', 'Romance']],
  ['The Social Network', 2010, ['Biography', 'Drama']], ['Oppenheimer', 2023, ['Biography', 'Drama', 'History']],
  ['Hidden Figures', 2016, ['Biography', 'Drama', 'History']], ['Rocky', 1976, ['Drama', 'Sport']],
  ['Moneyball', 2011, ['Biography', 'Drama', 'Sport']], ['Remember the Titans', 2000, ['Biography', 'Drama', 'Sport']],
  ['The Notebook', 2004, ['Drama', 'Romance']], ['Pride & Prejudice', 2005, ['Drama', 'Romance']],
  ['La La Land', 2016, ['Comedy', 'Drama', 'Music', 'Musical', 'Romance']], ['Crazy Rich Asians', 2018, ['Comedy', 'Romance']],
  ['When Harry Met Sally...', 1989, ['Comedy', 'Drama', 'Romance']], ['10 Things I Hate About You', 1999, ['Comedy', 'Drama', 'Romance']],
  ['Get Out', 2017, ['Horror', 'Mystery', 'Thriller']], ['A Quiet Place', 2018, ['Drama', 'Horror', 'Sci-Fi']],
  ['The Conjuring', 2013, ['Horror', 'Mystery', 'Thriller']], ['Shaun of the Dead', 2004, ['Comedy', 'Horror']],
  ['The Lord of the Rings: The Fellowship of the Ring', 2001, ['Action', 'Adventure', 'Drama', 'Fantasy']], ["Harry Potter and the Prisoner of Azkaban", 2004, ['Adventure', 'Family', 'Fantasy']],
  ["Pan's Labyrinth", 2006, ['Drama', 'Fantasy', 'War']], ['Saving Private Ryan', 1998, ['Drama', 'War']],
  ['1917', 2019, ['Drama', 'Thriller', 'War']], ['Dunkirk', 2017, ['Action', 'Drama', 'History', 'Thriller', 'War']],
  ['Unforgiven', 1992, ['Drama', 'Western']], ['True Grit', 2010, ['Adventure', 'Drama', 'Western']],
  ['Knives Out', 2019, ['Comedy', 'Crime', 'Mystery']], ['Gone Girl', 2014, ['Drama', 'Mystery', 'Thriller']],
  ['Zodiac', 2007, ['Crime', 'Drama', 'Mystery', 'Thriller']], ['Spider-Man: Into the Spider-Verse', 2018, ['Animation', 'Action', 'Adventure', 'Family']],
]

export function fallbackCandidates(criteria, exclude = []) {
  const skip = new Set(exclude.map(normalizeTitle))
  const wanted = criteria.genres
  const scored = FALLBACK_POOL
    .filter(([title]) => !skip.has(normalizeTitle(title)) && normalizeTitle(title) !== normalizeTitle(criteria.similarTo))
    .map(([title, year, genres]) => {
      const overlap = wanted.length ? wanted.filter((g) => genres.includes(g)).length : 0
      const family = criteria.familyFriendly && (genres.includes('Family') || genres.includes('Animation')) ? 1 : 0
      return { title, year, reason: '', score: overlap * 2 + family + Math.random() * 0.5, genres }
    })
    .filter((c) => (wanted.length ? c.score >= 2 : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LOOKUPS_PER_ROUND)
  return scored.map(({ title, year, reason }) => ({ title, year, reason }))
}

// ---------------------------------------------------------------------------
// OMDb: fetch the real data
// ---------------------------------------------------------------------------

const omdbCache = new Map()
const OMDB_CACHE_LIMIT = 500

export function normalizeOmdbMovie(data, reason = '') {
  const clean = (v) => (typeof v === 'string' && v !== 'N/A' ? v : '')
  const rating = Number(data.imdbRating)
  return {
    imdbID: data.imdbID,
    Title: data.Title,
    Year: clean(data.Year) || '',
    Type: clean(data.Type) || 'movie',
    Poster: clean(data.Poster) || 'N/A',
    genres: clean(data.Genre) ? data.Genre.split(',').map((g) => g.trim()).filter(Boolean) : [],
    runtime: parseRuntime(clean(data.Runtime)),
    rating: Number.isFinite(rating) && data.imdbRating !== 'N/A' ? rating : null,
    rated: clean(data.Rated) || null,
    plot: clean(data.Plot),
    reason: reason || null,
  }
}

async function omdbRequest(params, config, fetchImpl) {
  const query = new URLSearchParams({ apikey: config.omdbKey, ...params })
  let response
  try {
    response = await fetchImpl(`${OMDB_URL}?${query}`, { signal: AbortSignal.timeout(10000) })
  } catch {
    throw new RecommendationError('Unable to reach the OMDb movie database. Please try again.', 502)
  }
  if (!response.ok) throw new RecommendationError(`OMDb request failed (${response.status}).`, 502)
  const data = await response.json().catch(() => null)
  if (!data) throw new RecommendationError('OMDb returned an unreadable response.', 502)
  if (data.Response === 'False') {
    const error = String(data.Error || '')
    if (/api key/i.test(error)) throw new RecommendationError('The OMDb API key was rejected. Check OMDB_API_KEY / VITE_OMDB_API_KEY.', 500)
    if (/limit/i.test(error)) throw new RecommendationError('The OMDb daily request limit has been reached. Try again tomorrow.', 429)
    return null
  }
  return data
}

export async function lookupMovie({ title, year }, config, fetchImpl) {
  const key = `${normalizeTitle(title)}|${year ?? ''}`
  if (omdbCache.has(key)) return omdbCache.get(key)

  const base = { t: title, type: 'movie', plot: 'short' }
  let data = await omdbRequest(year ? { ...base, y: String(year) } : base, config, fetchImpl)
  if (!data && year) data = await omdbRequest(base, config, fetchImpl)

  const result = data && titlesClose(title, data.Title) ? data : null
  if (omdbCache.size >= OMDB_CACHE_LIMIT) omdbCache.delete(omdbCache.keys().next().value)
  omdbCache.set(key, result)
  return result
}

// ---------------------------------------------------------------------------
// Filtering: the app, not the AI, decides what passes
// ---------------------------------------------------------------------------

export function isFamilyFriendly(movie) {
  if (movie.genres.some((g) => FAMILY_BLOCKED_GENRES.includes(g))) return false
  const kidGenre = movie.genres.includes('Family') || movie.genres.includes('Animation')
  if (movie.rated && FAMILY_SAFE_RATINGS.has(movie.rated)) return true
  if (movie.rated === 'PG-13') return kidGenre
  return kidGenre && (!movie.rated || /not rated|unrated/i.test(movie.rated))
}

// returns the list of criteria a movie fails (empty list = it passes everything)
export function evaluateMovie(movie, c) {
  const failed = []
  const year = Number.parseInt(movie.Year, 10)
  if (c.maxRuntime != null && (movie.runtime == null || movie.runtime > c.maxRuntime)) failed.push('runtime')
  if (c.minRuntime != null && (movie.runtime == null || movie.runtime < c.minRuntime)) failed.push('runtime')
  if (c.minRating != null && (movie.rating == null || movie.rating < c.minRating)) failed.push('rating')
  if (c.genres.length && !c.genres.every((g) => movie.genres.includes(g))) failed.push('genre')
  if (c.excludeGenres.some((g) => movie.genres.includes(g))) failed.push('genre')
  if (c.minYear != null && !(year >= c.minYear)) failed.push('release year')
  if (c.maxYear != null && !(year <= c.maxYear)) failed.push('release year')
  if (c.familyFriendly && !isFamilyFriendly(movie)) failed.push('family-friendly rating')
  return unique(failed)
}

// ---------------------------------------------------------------------------
// Reply text (built from verified results, so it can never promise more than the cards show)
// ---------------------------------------------------------------------------

export function describeCriteria(c) {
  const subject = [c.familyFriendly ? 'family-friendly' : '', ...c.genres.map((g) => g.toLowerCase())]
    .filter(Boolean)
    .join(' ')
  const parts = []
  if (c.similarTo) parts.push(`similar to ${c.similarTo}`)
  if (c.maxRuntime != null) parts.push(`under ${formatRuntime(c.maxRuntime)}`)
  if (c.minRuntime != null) parts.push(`at least ${formatRuntime(c.minRuntime)} long`)
  if (c.minRating != null) parts.push(`rated ${c.minRating} or higher`)
  if (c.minYear != null && c.maxYear != null) parts.push(`from ${c.minYear}-${c.maxYear}`)
  else if (c.minYear != null) parts.push(`from ${c.minYear} onward`)
  else if (c.maxYear != null) parts.push(`from before ${c.maxYear + 1}`)
  if (c.excludeGenres.length) parts.push(`without ${c.excludeGenres.map((g) => g.toLowerCase()).join('/')}`)
  return { noun: `${subject ? `${subject} ` : ''}movies`, parts }
}

function composeReply(criteria, movies, nearMisses) {
  const { noun, parts } = describeCriteria(criteria)
  const notes = []

  if (movies.length === 0) {
    const worst = Object.entries(nearMisses).sort((a, b) => b[1] - a[1])[0]
    const hint = worst
      ? ` ${worst[1]} good pick${worst[1] === 1 ? '' : 's'} missed only on ${worst[0]} - want me to relax that?`
      : ' Try loosening one of the requirements.'
    return { reply: `I couldn't find ${noun}${parts.length ? ` ${parts.join(', ')}` : ''} that meet every requirement.${hint}`, notes }
  }

  const verb = movies.length === 1 ? 'is' : 'are'
  const reply = `Here ${verb} ${movies.length} ${movies.length === 1 ? noun.replace(/movies$/, 'movie') : noun}${parts.length ? ` ${parts.join(', ')}` : ''}.`
  if (movies.length < criteria.count) {
    notes.push(`Only ${movies.length} of the titles I checked met every requirement.`)
    const worst = Object.entries(nearMisses).sort((a, b) => b[1] - a[1])[0]
    if (worst) notes.push(`${worst[1]} more missed only on ${worst[0]} - ask me to relax it for more options.`)
  }
  return { reply, notes }
}

function parseSimpleMovieQuestion(message) {
  const questions = [
    {
      pattern: /^(?:who directed|who is the director of|director of)\s+(.+?)\??$/i,
      field: 'Director',
      format: (title, value) => `${value} directed ${title}.`,
    },
    {
      pattern: /^(?:who stars in|cast of|who is in the cast of)\s+(.+?)\??$/i,
      field: 'Actors',
      format: (title, value) => `${title} stars ${value}.`,
    },
    {
      pattern: /^(?:what is|what's) the plot of\s+(.+?)\??$/i,
      field: 'Plot',
      format: (title, value) => `${title}: ${value}`,
    },
    {
      pattern: /^(?:what is|what's)\s+(.+?)\s+about\??$/i,
      field: 'Plot',
      format: (title, value) => `${title}: ${value}`,
    },
    {
      pattern: /^(?:when was|when did)\s+(.+?)\s+(?:released|come out)\??$/i,
      field: 'Year',
      format: (title, value) => `${title} was released in ${value}.`,
    },
    {
      pattern: /^(?:how long is|what is the runtime of)\s+(.+?)\??$/i,
      field: 'Runtime',
      format: (title, value) => `${title} runs ${value}.`,
    },
    {
      pattern: /^(?:what genre is|what are the genres of)\s+(.+?)\??$/i,
      field: 'Genre',
      format: (title, value) => `${title} is listed as ${value}.`,
    },
  ]

  for (const question of questions) {
    const match = question.pattern.exec(String(message ?? '').trim())
    if (match) {
      const title = match[1].trim().replace(/[?.!]+$/, '')
      if (title) return { title, ...question }
    }
  }

  return null
}

async function fallbackChatReply(message, config, fetchImpl) {
  const text = String(message ?? '').trim()
  if (/^(?:hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(text)) {
    return "Hi! I'm your movie assistant. I can answer basic movie facts or help you find a film to watch."
  }
  if (/^(?:thanks|thank you|thx)\b/i.test(text)) {
    return "You're welcome! Ask me about a movie or tell me what you'd like to watch."
  }
  if (/\b(?:help|what can you do)\b/i.test(text)) {
    return 'I can find movies by genre, runtime, rating, year, or a movie you like. I can also look up a movie’s director, cast, plot, release year, runtime, and genres.'
  }

  const question = parseSimpleMovieQuestion(text)
  if (!question) {
    return 'I can help with movie recommendations and basic movie facts such as a film’s director, cast, plot, release year, runtime, or genres.'
  }
  if (!config.omdbKey) {
    return 'I can answer that movie lookup when the movie database is available. I can still help with genre, runtime, rating, and similar-movie recommendations.'
  }

  const movie = await lookupMovie({ title: question.title }, config, fetchImpl)
  if (!movie) return `I couldn't find a verified movie titled "${question.title}".`
  const value = movie[question.field]
  if (!value || value === 'N/A') return `I couldn't find the ${question.field.toLowerCase()} for ${movie.Title}.`
  return question.format(movie.Title, value)
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export async function recommendMovies({ message, history = [], config, fetchImpl = globalThis.fetch }) {
  // 1. Understand the request
  let plan = null
  let source = 'ai'
  if (config.geminiKey) {
    try {
      plan = await callGemini({ message, history, config, fetchImpl })
    } catch (error) {
      console.error('Gemini planning failed, using fallback parser:', redact(error.message, config))
    }
  }
  if (!plan) {
    source = 'fallback'
    const parsed = fallbackParse(message)
    if (!parsed.hasSignal) {
      return {
        reply: await fallbackChatReply(message, config, fetchImpl),
        movies: [], criteria: null, notes: [], source,
      }
    }
    plan = { intent: 'recommend', reply: '', criteria: parsed.criteria, candidates: [] }
  }

  if (plan.intent === 'chat') {
    return {
      reply: plan.reply || "I'm here to help you find a movie. Tell me a genre, a time limit or a movie you liked.",
      movies: [], criteria: null, notes: [], source,
    }
  }

  if (!config.omdbKey) {
    throw new RecommendationError('The OMDb API key is not configured on the server (set OMDB_API_KEY or VITE_OMDB_API_KEY).', 500)
  }

  const { criteria } = plan

  // "similar to X": exclude the seed movie itself, whatever the model returned
  let seedId = null
  if (criteria.similarTo) {
    const seed = await lookupMovie({ title: criteria.similarTo }, config, fetchImpl).catch(() => null)
    seedId = seed?.imdbID ?? null
    if (seed && source === 'fallback' && !criteria.genres.length) {
      criteria.genres = toGenres(seed.Genre).slice(0, 2)
    }
  }

  // 2. Fetch real data and 3. filter it (top up once if too few survive)
  const accepted = new Map()
  const tried = []
  const nearMisses = {}
  let candidates = plan.candidates.length ? plan.candidates : fallbackCandidates(criteria)

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const fresh = candidates.filter((c) => !tried.includes(c.title))
    tried.push(...fresh.map((c) => c.title))

    const lookupResults = await Promise.allSettled(
      fresh.slice(0, MAX_LOOKUPS_PER_ROUND).map(async (candidate) => {
        const data = await lookupMovie(candidate, config, fetchImpl)
        return data ? { data, reason: candidate.reason } : null
      }),
    )
    const found = []
    const lookupFailures = []
    for (const result of lookupResults) {
      if (result.status === 'fulfilled') {
        found.push(result.value)
      } else if (result.reason instanceof RecommendationError && result.reason.status !== 502) {
        throw result.reason
      } else {
        lookupFailures.push(result.reason)
      }
    }
    if (found.length === 0 && lookupFailures.length > 0) throw lookupFailures[0]

    for (const item of found) {
      if (!item || item.data.imdbID === seedId || accepted.has(item.data.imdbID)) continue
      const movie = normalizeOmdbMovie(item.data, item.reason)
      const failed = evaluateMovie(movie, criteria)
      if (failed.length === 0) accepted.set(movie.imdbID, movie)
      else if (failed.length === 1) nearMisses[failed[0]] = (nearMisses[failed[0]] || 0) + 1
    }

    if (accepted.size >= criteria.count || round === MAX_ROUNDS - 1) break

    // ask for more candidates
    let more = []
    if (source === 'ai') {
      try {
        const next = await callGemini({ message, history, config, fetchImpl, keepCriteria: criteria, excludeTitles: tried })
        more = next.candidates
      } catch (error) {
        console.error('Gemini top-up failed:', redact(error.message, config))
      }
    } else {
      more = fallbackCandidates(criteria, tried)
    }
    if (more.length === 0) break
    candidates = more
  }

  // 4. Rank: model order for "similar to" requests, best rated first otherwise
  let movies = [...accepted.values()]
  if (!criteria.similarTo) movies.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  movies = movies.slice(0, criteria.count)

  const { reply, notes } = composeReply(criteria, movies, nearMisses)
  return { reply, movies, criteria, notes, source }
}

// Shared by the Express route and the Vercel function.
export async function handleRecommendRequest(body, env, fetchImpl = globalThis.fetch) {
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) return { status: 400, body: { error: 'Message is required.' } }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { status: 400, body: { error: `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.` } }
  }

  const config = getConfig(env)
  try {
    const result = await recommendMovies({ message, history: body?.history, config, fetchImpl })
    return { status: 200, body: result }
  } catch (error) {
    if (error instanceof RecommendationError) {
      console.error('Recommendation failed:', redact(error.message, config))
      return { status: error.status, body: { error: error.message } }
    }
    console.error('Unexpected recommendation error:', redact(error?.message, config))
    return { status: 500, body: { error: 'Something went wrong while finding movies. Please try again.' } }
  }
}
