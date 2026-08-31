import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { Loading } from '../../components/Loading/Loading'
import { MovieGrid } from '../../components/MovieGrid/MovieGrid'
import type { Movie } from '../../services/omdbMovieService'
import './HomeView.css'

interface HomeViewProps {
  movies: Movie[]
  loading: boolean
  error: string | null
  onFavourite: (movie: Movie) => void | Promise<void>
}

export function HomeView({ movies, loading, error, onFavourite }: HomeViewProps) {
  return (
    <main>
      {loading && <Loading message="Loading movies..." />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && movies.length === 0 && <p>No movies found.</p>}
      {movies.length > 0 && <MovieGrid movies={movies} onFavourite={onFavourite} />}
    </main>
  )
}


