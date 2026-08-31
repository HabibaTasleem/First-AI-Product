import { useState } from 'react'
import type { Movie } from '../../services/omdbMovieService'

interface MovieCardProps {
  movie: Movie
  onFavourite?: () => void | Promise<void>
  onRemove?: () => void
}

export function MovieCard({ movie, onFavourite, onRemove }: MovieCardProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleFavourite() {
    if (!onFavourite || saving || saved) {
      return
    }

    setSaving(true)

    try {
      await onFavourite()
      setSaved(true)
    } catch {
      // The parent view model reports the save error to the user.
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="movie-card">
      <img src={movie.Poster} alt={`${movie.Title} poster`} />
      <h2>{movie.Title}</h2>
      <p>{movie.Year}</p>
      <p>{movie.Type}</p>
      <button
        type="button"
        onClick={onRemove ?? handleFavourite}
        className={saved ? 'movie-card__favourite--saved' : undefined}
        disabled={saving}
        aria-busy={saving}
      >
        {onRemove ? 'Remove' : saving ? 'Saving...' : 'Favourite'}
      </button>
    </article>
  )
}
