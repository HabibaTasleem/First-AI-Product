import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { Loading } from '../../components/Loading/Loading'
import { MovieGrid } from '../../components/MovieGrid/MovieGrid'
import '../Home/HomeView.css'
import { useFavouritesViewModel } from './useFavouritesViewModel'

export function FavouritesView() {
  const { favourites, loading, error, removeMovie } = useFavouritesViewModel()

  return (
    <main>
      {loading && <Loading message="Loading favourites..." />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && favourites.length === 0 && (
        <p>You have not added any favourite movies yet.</p>
      )}

      {favourites.length > 0 && (
        <MovieGrid movies={favourites} onRemove={(imdbID) => void removeMovie(imdbID)} />
      )}
    </main>
  )
}
