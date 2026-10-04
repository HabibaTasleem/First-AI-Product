import { useState } from 'react'
import { formatRuntime } from '../../services/recommendationService'
import type { RecommendedMovie } from '../../types/recommendation'

interface RecommendationCardProps {
  movie: RecommendedMovie
  onFavourite: (movie: RecommendedMovie) => void | Promise<void>
}

export function RecommendationCard({ movie, onFavourite }: RecommendationCardProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const hasPoster = movie.Poster && movie.Poster !== 'N/A' && !posterFailed

  async function handleFavourite() {
    if (saving || saved) return
    setSaving(true)

    try {
      await onFavourite(movie)
      setSaved(true)
    } catch {
      // The assistant reports the save error; the button simply becomes usable again.
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="rec-card">
      <div className="rec-card__media">
        {hasPoster ? (
          <img
            className="rec-card__poster"
            src={movie.Poster}
            alt={`${movie.Title} poster`}
            loading="lazy"
            onError={() => setPosterFailed(true)}
          />
        ) : (
          <div className="rec-card__poster rec-card__poster--empty" role="img" aria-label={`${movie.Title} (no poster available)`}>
            {movie.Title.charAt(0)}
          </div>
        )}
        <button
          type="button"
          className={saved ? 'rec-card__button rec-card__button--saved' : 'rec-card__button'}
          onClick={handleFavourite}
          disabled={saving || saved}
          aria-busy={saving}
        >
          {saved ? 'Saved' : saving ? 'Saving...' : 'Favourite'}
        </button>
      </div>

      <div className="rec-card__body">
        <header className="rec-card__header">
          <h3 className="rec-card__title">
            {movie.Title} <span className="rec-card__year">({movie.Year})</span>
          </h3>
          {movie.rating != null && (
            <span className="rec-card__rating" title="IMDb rating">
              <span aria-hidden="true">★</span> {movie.rating.toFixed(1)}
              <span className="sr-only"> out of 10 on IMDb</span>
            </span>
          )}
        </header>

        <div className="rec-card__meta" aria-label="Movie details">
          <span className="rec-card__meta-item">{movie.runtime != null ? formatRuntime(movie.runtime) : 'N/A'}</span>
          {movie.rating != null && (
            <span className="rec-card__meta-item rec-card__meta-item--rating">
              <span aria-hidden="true">★</span> {movie.rating.toFixed(1)}
            </span>
          )}
        </div>

        {movie.genres.length > 0 && (
          <ul className="rec-card__genres" aria-label="Genres">
            {movie.genres.map((genre) => (
              <li key={genre}>{genre}</li>
            ))}
          </ul>
        )}

        {movie.plot && <p className="rec-card__plot">{movie.plot}</p>}
        {movie.reason && <p className="rec-card__reason">{movie.reason}</p>}

        <div className="rec-card__actions">
          <a
            className="rec-card__link"
            href={`https://www.imdb.com/title/${movie.imdbID}/`}
            target="_blank"
            rel="noreferrer noopener"
          >
            View on IMDb
          </a>
        </div>
      </div>
    </article>
  )
}
