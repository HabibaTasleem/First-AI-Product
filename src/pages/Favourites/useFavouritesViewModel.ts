import { useEffect, useState } from 'react'
import {
  deleteFavourite,
  loadFavourites,
} from './FavouritesModel'
import type { Movie } from '../../services/omdbMovieService'

export function useFavouritesViewModel() {
  const [favourites, setFavourites] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadMovies() {
    setLoading(true)
    setError(null)

    try {
      const movies = await loadFavourites()
      setFavourites(movies)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load favourite movies.')
    } finally {
      setLoading(false)
    }
  }

  async function removeMovie(imdbID: string) {
    setError(null)

    try {
      await deleteFavourite(imdbID)
      setFavourites((currentFavourites) =>
        currentFavourites.filter((movie) => movie.imdbID !== imdbID),
      )
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Unable to remove favourite movie.',
      )
    }
  }

  useEffect(() => {
    void loadMovies()
  }, [])

  return { favourites, loading, error, loadMovies, removeMovie }
}
