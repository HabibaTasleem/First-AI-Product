import { searchMovies } from '../../services/omdbMovieService'
import type { Movie } from '../../services/omdbMovieService'

const INITIAL_MOVIE_COUNT = 20
const INITIAL_SEARCH_COUNT = 8
const movieSearchSeeds = [
  'Batman',
  'Avengers',
  'Harry Potter',
  'Star Wars',
  'Spider-Man',
  'Marvel',
  'Disney',
  'Matrix',
  'Lord of the Rings',
  'Fast',
  'Mission Impossible',
  'Pixar',
  'Horror',
  'Comedy',
  'Action',
]

export async function getMovies(query: string): Promise<Movie[]> {
  return searchMovies(query)
}

export async function initialMovies(): Promise<Movie[]> {
  const shuffledSeeds = shuffle(movieSearchSeeds)
  const initialSeeds = shuffledSeeds.slice(0, INITIAL_SEARCH_COUNT)
  const initialResults = await Promise.all(initialSeeds.map(searchMovies))
  let movies = uniqueMovies(initialResults.flat())

  if (movies.length < INITIAL_MOVIE_COUNT) {
    const remainingSeeds = shuffledSeeds.slice(INITIAL_SEARCH_COUNT)
    const additionalResults = await Promise.all(remainingSeeds.map(searchMovies))
    movies = uniqueMovies([...movies, ...additionalResults.flat()])
  }

  if (movies.length < INITIAL_MOVIE_COUNT) {
    throw new Error('OMDb did not return enough unique movies to build the home screen.')
  }

  return shuffle(movies).slice(0, INITIAL_MOVIE_COUNT)
}

function uniqueMovies(movies: Movie[]): Movie[] {
  return Array.from(new Map(movies.map((movie) => [movie.imdbID, movie])).values())
}

function shuffle<T>(items: T[]): T[] {
  const shuffledItems = [...items]

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const currentItem = shuffledItems[index]
    shuffledItems[index] = shuffledItems[randomIndex]
    shuffledItems[randomIndex] = currentItem
  }

  return shuffledItems
}
