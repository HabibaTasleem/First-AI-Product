import { MovieCard } from '../MovieCard/MovieCard'
import type { Movie } from '../../services/omdbMovieService'

interface MovieGridProps {
	movies: Movie[]
	onFavourite?: (movie: Movie) => void | Promise<void>
	onRemove?: (imdbID: string) => void
}

export function MovieGrid({ movies, onFavourite, onRemove }: MovieGridProps) {
	return (
		<section className="movie-grid" aria-label="Movies">
			{movies.map((movie) => (
				<MovieCard
					key={movie.imdbID}
					movie={movie}
					onFavourite={onFavourite ? () => onFavourite(movie) : undefined}
					onRemove={onRemove ? () => onRemove(movie.imdbID) : undefined}
				/>
			))}
		</section>
	)
}
