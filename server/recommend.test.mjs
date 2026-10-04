// Offline tests: Gemini and OMDb are mocked, so no API keys or network are needed.
// Run with:  cd server && npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  evaluateMovie,
  fallbackParse,
  handleRecommendRequest,
  normalizeOmdbMovie,
  toGenres,
  titlesClose,
} from './recommend.js'

const OMDB = {
  'Superbad': { Title: 'Superbad', Year: '2007', Rated: 'R', Runtime: '113 min', Genre: 'Comedy', Plot: 'Two teens try to party.', Poster: 'http://p/superbad.jpg', imdbRating: '7.6', imdbID: 'tt0829482', Type: 'movie' },
  'Bridesmaids': { Title: 'Bridesmaids', Year: '2011', Rated: 'R', Runtime: '125 min', Genre: 'Comedy, Romance', Plot: 'Wedding chaos.', Poster: 'http://p/bridesmaids.jpg', imdbRating: '6.8', imdbID: 'tt1478338', Type: 'movie' },
  'Airplane!': { Title: 'Airplane!', Year: '1980', Rated: 'PG', Runtime: '87 min', Genre: 'Comedy', Plot: 'A flight goes wrong.', Poster: 'http://p/airplane.jpg', imdbRating: '7.7', imdbID: 'tt0080339', Type: 'movie' },
  'Groundhog Day': { Title: 'Groundhog Day', Year: '1993', Rated: 'PG', Runtime: '101 min', Genre: 'Comedy, Fantasy, Romance', Plot: 'A weatherman relives a day.', Poster: 'http://p/gd.jpg', imdbRating: '8.0', imdbID: 'tt0107048', Type: 'movie' },
  'Interstellar': { Title: 'Interstellar', Year: '2014', Rated: 'PG-13', Runtime: '169 min', Genre: 'Adventure, Drama, Sci-Fi', Plot: 'Explorers travel through a wormhole.', Poster: 'http://p/interstellar.jpg', imdbRating: '8.7', imdbID: 'tt0816692', Type: 'movie' },
  'Inception': { Title: 'Inception', Year: '2010', Rated: 'PG-13', Runtime: '148 min', Genre: 'Action, Adventure, Sci-Fi', Plot: 'A thief enters dreams to steal secrets.', Director: 'Christopher Nolan', Actors: 'Leonardo DiCaprio, Joseph Gordon-Levitt', Poster: 'http://p/inception.jpg', imdbRating: '8.8', imdbID: 'tt1375666', Type: 'movie' },
  'Arrival': { Title: 'Arrival', Year: '2016', Rated: 'PG-13', Runtime: '116 min', Genre: 'Drama, Mystery, Sci-Fi', Plot: 'A linguist meets aliens.', Poster: 'http://p/arrival.jpg', imdbRating: '7.9', imdbID: 'tt2543164', Type: 'movie' },
  'The Martian': { Title: 'The Martian', Year: '2015', Rated: 'PG-13', Runtime: '144 min', Genre: 'Adventure, Drama, Sci-Fi', Plot: 'Stranded on Mars.', Poster: 'N/A', imdbRating: '8.0', imdbID: 'tt3659388', Type: 'movie' },
  'Toy Story': { Title: 'Toy Story', Year: '1995', Rated: 'G', Runtime: '81 min', Genre: 'Animation, Adventure, Comedy', Plot: 'Toys come alive.', Poster: 'http://p/ts.jpg', imdbRating: '8.3', imdbID: 'tt0114709', Type: 'movie' },
  'Coco': { Title: 'Coco', Year: '2017', Rated: 'PG', Runtime: '105 min', Genre: 'Animation, Adventure, Family', Plot: 'A boy enters the Land of the Dead.', Poster: 'http://p/coco.jpg', imdbRating: '8.4', imdbID: 'tt2380307', Type: 'movie' },
  'Get Out': { Title: 'Get Out', Year: '2017', Rated: 'R', Runtime: '104 min', Genre: 'Horror, Mystery, Thriller', Plot: 'A visit goes wrong.', Poster: 'http://p/getout.jpg', imdbRating: '7.7', imdbID: 'tt5052448', Type: 'movie' },
}

function makeFetch({ plans = [], omdb = OMDB, geminiFails = false, failFirstOmdb = false } = {}) {
  const calls = { gemini: 0, omdb: 0 }
  let planIndex = 0
  const impl = async (url, init) => {
    const href = String(url)
    if (href.includes('generativelanguage.googleapis.com')) {
      calls.gemini += 1
      assert.ok(!href.includes('key='), 'Gemini key must not be placed in the URL')
      assert.ok(init.headers['x-goog-api-key'], 'Gemini key must be sent as a header')
      if (geminiFails) return new Response('quota', { status: 429 })
      const plan = plans[Math.min(planIndex, plans.length - 1)]
      planIndex += 1
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(plan) }] } }] })
    }
    if (href.startsWith('https://www.omdbapi.com/')) {
      calls.omdb += 1
      if (failFirstOmdb && calls.omdb === 1) throw new TypeError('Temporary network failure')
      const params = new URL(href).searchParams
      const title = params.get('t')
      const hit = omdb[title]
      return Response.json(hit ? { ...hit, Response: 'True' } : { Response: 'False', Error: 'Movie not found!' })
    }
    throw new Error(`Unexpected fetch: ${href}`)
  }
  return { impl, calls }
}

const ENV = { GEMINI_API_KEY: 'test-gemini-key', OMDB_API_KEY: 'test-omdb-key' }
const crit = (over = {}) => ({ genres: [], excludeGenres: [], maxRuntime: null, minRuntime: null, minRating: null, minYear: null, maxYear: null, familyFriendly: false, similarTo: null, count: 6, ...over })
const cand = (...titles) => titles.map((title) => ({ title, year: null, reason: `why ${title}` }))

test('comedy under 2 hours rated above 7 returns only verified matches, best rated first', async () => {
  const { impl } = makeFetch({
    plans: [{
      intent: 'recommend',
      criteria: crit({ genres: ['Comedy'], maxRuntime: 120, minRating: 7 }),
      candidates: cand('Superbad', 'Bridesmaids', 'Airplane!', 'Groundhog Day', 'Interstellar', 'Not A Real Movie'),
    }],
  })
  const { status, body } = await handleRecommendRequest({ message: 'I want a comedy movie under 2 hours with a rating above 7' }, ENV, impl)
  assert.equal(status, 200)
  assert.deepEqual(body.movies.map((m) => m.Title), ['Groundhog Day', 'Airplane!', 'Superbad']) // Bridesmaids: 125 min + 6.8; Interstellar: not a comedy
  for (const m of body.movies) {
    assert.ok(m.runtime <= 120 && m.rating >= 7 && m.genres.includes('Comedy'))
    assert.ok(m.Poster && m.plot && m.imdbID)
  }
  assert.equal(body.movies[0].reason, 'why Groundhog Day')
  assert.match(body.reply, /3 comedy movies under 2h, rated 7 or higher/)
})

test('one OMDb network failure does not discard successful recommendation lookups', async () => {
  const { impl, calls } = makeFetch({ geminiFails: true, failFirstOmdb: true })
  const { status, body } = await handleRecommendRequest({ message: 'comedy under 2 hours rated above 7' }, ENV, impl)
  assert.equal(status, 200)
  assert.ok(body.movies.length > 0)
  assert.ok(body.movies.every((movie) => movie.genres.includes('Comedy') && movie.runtime <= 120 && movie.rating >= 7))
  assert.ok(calls.omdb > 1)
})

test('"I only have 90 minutes" keeps only movies up to 90 minutes', async () => {
  const { impl } = makeFetch({
    plans: [{ intent: 'recommend', criteria: crit({ maxRuntime: 90 }), candidates: cand('Airplane!', 'Toy Story', 'Superbad', 'Interstellar') }],
  })
  const { body } = await handleRecommendRequest({ message: 'I only have 90 minutes. What can I watch?' }, ENV, impl)
  assert.deepEqual(body.movies.map((m) => m.Title).sort(), ['Airplane!', 'Toy Story'])
})

test('similar to Interstellar never returns Interstellar itself', async () => {
  const { impl } = makeFetch({
    plans: [{ intent: 'recommend', criteria: crit({ similarTo: 'Interstellar' }), candidates: cand('Interstellar', 'Arrival', 'The Martian') }],
  })
  const { body } = await handleRecommendRequest({ message: 'Suggest something similar to Interstellar' }, ENV, impl)
  assert.deepEqual(body.movies.map((m) => m.Title), ['Arrival', 'The Martian']) // model order kept
  assert.match(body.reply, /similar to Interstellar/)
})

test('family-friendly keeps kid-safe ratings and drops horror / R-rated titles', async () => {
  const { impl } = makeFetch({
    plans: [{ intent: 'recommend', criteria: crit({ familyFriendly: true }), candidates: cand('Coco', 'Toy Story', 'Get Out', 'Superbad', 'Interstellar') }],
  })
  const { body } = await handleRecommendRequest({ message: 'I want a family-friendly movie' }, ENV, impl)
  assert.deepEqual(body.movies.map((m) => m.Title).sort(), ['Coco', 'Toy Story'])
})

test('tops up with a second Gemini pass when too few movies pass the filters', async () => {
  const criteria = crit({ genres: ['Comedy'], minRating: 7.7, count: 5 })
  const { impl, calls } = makeFetch({
    plans: [
      { intent: 'recommend', criteria, candidates: cand('Superbad', 'Bridesmaids') }, // 7.6 and 6.8: both too low
      { intent: 'recommend', criteria, candidates: cand('Groundhog Day', 'Toy Story', 'Airplane!') },
    ],
  })
  const { body } = await handleRecommendRequest({ message: '5 comedies rated 7.7+' }, ENV, impl)
  assert.equal(calls.gemini, 2)
  assert.deepEqual(body.movies.map((m) => m.Title), ['Toy Story', 'Groundhog Day', 'Airplane!'])
  assert.ok(body.notes.length > 0, 'explains that fewer movies than requested matched')
})

test('no matches explains which requirement was the problem', async () => {
  const { impl } = makeFetch({
    plans: [{ intent: 'recommend', criteria: crit({ genres: ['Comedy'], minRating: 9 }), candidates: cand('Superbad', 'Groundhog Day', 'Airplane!') }],
  })
  const { body } = await handleRecommendRequest({ message: 'comedy rated above 9' }, ENV, impl)
  assert.equal(body.movies.length, 0)
  assert.match(body.reply, /missed only on rating/)
})

test('chat intent answers in text without movie cards or OMDb calls', async () => {
  const { impl, calls } = makeFetch({ plans: [{ intent: 'chat', reply: 'Christopher Nolan directed Inception.', criteria: {}, candidates: [] }] })
  const { body } = await handleRecommendRequest({ message: 'Who directed Inception?' }, ENV, impl)
  assert.equal(body.movies.length, 0)
  assert.equal(body.reply, 'Christopher Nolan directed Inception.')
  assert.equal(calls.omdb, 0)
})

test('fallback answers a simple movie fact question when Gemini is unavailable', async () => {
  const { impl, calls } = makeFetch({ geminiFails: true })
  const { body } = await handleRecommendRequest({ message: 'Who directed Inception?' }, ENV, impl)
  assert.equal(body.source, 'fallback')
  assert.equal(body.reply, 'Christopher Nolan directed Inception.')
  assert.equal(body.movies.length, 0)
  assert.equal(calls.omdb, 1)
})

test('fallback answers a greeting without searching OMDb when Gemini is unavailable', async () => {
  const { impl, calls } = makeFetch({ geminiFails: true })
  const { body } = await handleRecommendRequest({ message: 'Hi there' }, ENV, impl)
  assert.equal(body.source, 'fallback')
  assert.match(body.reply, /movie assistant/i)
  assert.equal(body.movies.length, 0)
  assert.equal(calls.omdb, 0)
})

test('falls back to the built-in parser when Gemini is unavailable', async () => {
  const { impl, calls } = makeFetch({ geminiFails: true })
  const { body } = await handleRecommendRequest({ message: 'comedy under 100 minutes rated over 7' }, ENV, impl)
  assert.equal(body.source, 'fallback')
  assert.ok(calls.gemini >= 1)
  assert.ok(body.movies.length > 0)
  for (const m of body.movies) assert.ok(m.genres.includes('Comedy') && m.runtime <= 100 && m.rating >= 7)
})

test('input validation and missing keys produce clear errors', async () => {
  assert.equal((await handleRecommendRequest({ message: '   ' }, ENV, async () => null)).status, 400)
  assert.equal((await handleRecommendRequest({ message: 'x'.repeat(501) }, ENV, async () => null)).status, 400)
  const noKey = await handleRecommendRequest({ message: 'comedy' }, { GEMINI_API_KEY: 'k' }, async () => null)
  assert.equal(noKey.status, 500)
  assert.match(noKey.body.error, /OMDb API key/)
})

test('fallbackParse understands the example requests', () => {
  const a = fallbackParse('I want a comedy movie under 2 hours with a rating above 7').criteria
  assert.deepEqual([a.genres, a.maxRuntime, a.minRating], [['Comedy'], 120, 7])
  const b = fallbackParse('I only have 90 minutes. What can I watch?').criteria
  assert.equal(b.maxRuntime, 90)
  const c = fallbackParse('Suggest something similar to Interstellar').criteria
  assert.equal(c.similarTo, 'Interstellar')
  assert.deepEqual(c.genres, [])
  const d = fallbackParse('I want a family-friendly movie').criteria
  assert.equal(d.familyFriendly, true)
  assert.deepEqual(d.genres, [])
  const e = fallbackParse('scary movie shorter than 1 hour 40 minutes, 4 picks, no gore').criteria
  assert.deepEqual([e.genres, e.maxRuntime, e.count], [['Horror'], 100, 4])
  const f = fallbackParse('action movies from the 90s rated 7+').criteria
  assert.deepEqual([f.genres, f.minYear, f.maxYear, f.minRating], [['Action'], 1990, 1999, 7])
})

test('helpers: genre aliases, title matching, evaluation', () => {
  assert.deepEqual(toGenres('science fiction'), ['Sci-Fi'])
  assert.deepEqual(toGenres('rom-com').sort(), ['Comedy', 'Romance'])
  assert.deepEqual(toGenres('Sci-Fi'), ['Sci-Fi'])
  assert.ok(titlesClose('Spider-Man: Into the Spider-Verse', 'Spider-Man Into the Spider-Verse'))
  assert.ok(!titlesClose('Dune', 'Dune: Part Two'))
  const movie = normalizeOmdbMovie({ ...OMDB.Interstellar, Response: 'True' })
  assert.deepEqual(evaluateMovie(movie, crit({ maxRuntime: 120, minRating: 9 })).sort(), ['rating', 'runtime'])
  assert.deepEqual(evaluateMovie(movie, crit({ genres: ['Sci-Fi'], minRating: 8 })), [])
})
