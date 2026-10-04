import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { saveFavourite } from '../../pages/Favourites/FavouritesModel'
import { criteriaLabels, requestRecommendations } from '../../services/recommendationService'
import type {
  HistoryItem,
  RecommendationCriteria,
  RecommendedMovie,
} from '../../types/recommendation'
import { RecommendationCard } from './RecommendationCard'
import './MovieAssistant.css'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  stopped?: boolean
  movies?: RecommendedMovie[]
  criteria?: RecommendationCriteria | null
}

const EXAMPLE_PROMPTS = [
  'A comedy under 2 hours with a rating above 7',
  'Suggest something similar to Interstellar',
  'I want a family-friendly movie',
  'I only have 90 minutes. What can I watch?',
]

const MAX_HISTORY_MESSAGES = 8

export default function MovieAssistant() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const conversationRef = useRef<HTMLDivElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const conversation = conversationRef.current
    if (conversation) conversation.scrollTop = conversation.scrollHeight
  }, [messages, isLoading])

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim()
    if (!message || isLoading) return

    // Earlier turns give the AI context for follow-ups like "something shorter".
    const history: HistoryItem[] = messages
      .filter((chatMessage) => chatMessage.content && !chatMessage.stopped)
      .slice(-MAX_HISTORY_MESSAGES)
      .map((chatMessage) => ({
        role: chatMessage.role,
        content: chatMessage.content,
        titles: chatMessage.movies?.map((movie) => movie.Title),
      }))

    setMessages((currentMessages) => [...currentMessages, { role: 'user', content: message }])
    setInput('')
    setIsLoading(true)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const result = await requestRecommendations(message, history, abortController.signal)

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          content: result.reply,
          movies: result.movies,
          criteria: result.criteria,
        },
      ])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessages((currentMessages) => [
          ...currentMessages,
          { role: 'assistant', content: 'Search stopped.', stopped: true },
        ])
        return
      }

      const errorMessage = error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.'

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: 'assistant', content: errorMessage },
      ])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(input)
  }

  function handleStop() {
    abortControllerRef.current?.abort()
  }

  async function handleFavourite(movie: RecommendedMovie) {
    // Same behaviour as the Home page: signed-out users are sent to log in first.
    if (!user) {
      navigate('/favourites')
      return
    }

    await saveFavourite({
      Title: movie.Title,
      Year: movie.Year,
      imdbID: movie.imdbID,
      Type: movie.Type,
      Poster: movie.Poster,
    })
  }

  return (
    <main className="movie-assistant">
      <section className="movie-assistant__panel" aria-labelledby="movie-assistant-title">
        <header className="movie-assistant__header">
          <h1 id="movie-assistant-title">Movie Assistant</h1>
        </header>

        <div className="movie-assistant__workspace">
          <section className="movie-assistant__examples" aria-label="Try a suggestion">
            <div className="movie-assistant__examples-inner">
            <h2 className="movie-assistant__examples-heading">Quick Start</h2>
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendMessage(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </button>
            ))}
            </div>
          </section>

          <div ref={conversationRef} className="movie-assistant__conversation">
            <div
              className="movie-assistant__messages"
              aria-live="polite"
              aria-busy={isLoading}
            >
          {messages.length === 0 && (
            <div className="movie-assistant__empty">
              <p className="movie-assistant__empty-kicker">TONIGHT'S LINEUP</p>
              <p className="movie-assistant__empty-icon" aria-hidden="true">✦</p>
              <h2>One great movie night starts here.</h2>
              <p>
                A funny classic, an immersive sci-fi story, or an easy family pick. Find a film
                that fits tonight.
              </p>
            </div>
          )}

          {messages.map((message, index) => {
            const hasMovies = Boolean(message.movies && message.movies.length > 0)
            const labels = message.role === 'assistant' ? criteriaLabels(message.criteria ?? null) : []

            return (
              <article
                className={`movie-assistant__message ${message.role}${hasMovies ? ' has-movies' : ''}`}
                key={`${message.role}-${index}`}
              >
                <div className="movie-assistant__message-label">
                  <span className="movie-assistant__avatar" aria-hidden="true">
                    {message.role === 'user' ? 'Y' : 'A'}
                  </span>
                  <strong>{message.role === 'user' ? 'You' : 'Assistant'}</strong>
                </div>
                <p>{message.content}</p>

                {labels.length > 0 && (
                  <ul className="movie-assistant__criteria" aria-label="What I understood">
                    {labels.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                )}

                {hasMovies && (
                  <div className="movie-assistant__results">
                    {message.movies?.map((movie) => (
                      <RecommendationCard
                        key={movie.imdbID}
                        movie={movie}
                        onFavourite={handleFavourite}
                      />
                    ))}
                  </div>
                )}

              </article>
            )
          })}

          {isLoading && (
            <div className="movie-assistant__loading" role="status">
              <span className="movie-assistant__dots" aria-hidden="true"><i /><i /><i /></span>
              Finding movies that match...
            </div>
          )}
            </div>

            <form className="movie-assistant__form" onSubmit={handleSubmit}>
              <label htmlFor="movie-assistant-input">Message Movie Assistant</label>
              <div className="movie-assistant__input-row">
                <input
                  id="movie-assistant-input"
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="e.g. a thriller under 100 minutes rated 7+"
                  maxLength={500}
                  disabled={isLoading}
                />
                {isLoading ? (
                  <button className="movie-assistant__stop" type="button" onClick={handleStop}>Stop</button>
                ) : (
                  <button type="submit" disabled={!input.trim()}>
                    Send <span aria-hidden="true">↗</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
