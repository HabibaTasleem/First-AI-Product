import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Movie } from '../../services/omdbMovieService'
import { useAuth } from '../../context/AuthContext'
import { saveFavourite } from '../Favourites/FavouritesModel'
import { getMovies, initialMovies } from './HomeModel'

export function useHomeViewModel() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadInitialMovies() {
    setLoading(true)
    setError(null)

    try {
      const movieList = await initialMovies()
      setMovies(movieList)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load movies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInitialMovies()
  }, [])

  async function handleSearch() {
    setLoading(true)
    setError(null)

    try {
      const movieList = await getMovies(query)
      setMovies(movieList)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to search for movies.')
    } finally {
      setLoading(false)
    }
  }

  async function saveMovie(movie: Movie) {
    try {
      await saveFavourite(movie)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save favourite movie.',
      )
      throw saveError
    }
  }

  async function handleFavourite(movie: Movie) {
    if (!user) {
      navigate('/favourites')
      return
    }

    return saveMovie(movie)
  }

  return {
    query,
    setQuery,
    movies,
    loading,
    error,
    handleSearch,
    loadInitialMovies,
    saveMovie,
    handleFavourite,
  }
}
