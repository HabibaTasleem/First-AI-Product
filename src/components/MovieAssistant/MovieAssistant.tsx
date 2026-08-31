import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './MovieAssistant.css'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  stopped?: boolean
}

// Use Vercel's same-origin serverless function in production.
// Local Vite development proxies /api to http://localhost:5000.
const CHAT_API_URL = '/api/chat'

export default function MovieAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const messageList = messageListRef.current
    if (messageList) messageList.scrollTop = messageList.scrollHeight
  }, [messages, isLoading])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = input.trim()
    if (!message || isLoading) return

    setMessages((currentMessages) => [
      ...currentMessages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ])
    setInput('')
    setIsLoading(true)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        let errorMessage = 'The server could not process your message.'
        try {
          const data = (await response.json()) as { error?: string }
          errorMessage = data.error || errorMessage
        } catch {
          // Keep the safe fallback when the server does not return JSON.
        }
        throw new Error(errorMessage)
      }

      if (!response.body) throw new Error('The server did not return a response stream.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantReply = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          const finalChunk = decoder.decode()
          if (finalChunk) {
            assistantReply += finalChunk
            updateAssistantMessage(assistantReply)
          }
          break
        }

        assistantReply += decoder.decode(value, { stream: true })
        updateAssistantMessage(assistantReply)
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessages((currentMessages) => {
          const updatedMessages = [...currentMessages]
          const lastMessage = updatedMessages[updatedMessages.length - 1]
          if (lastMessage?.role === 'assistant') {
            updatedMessages[updatedMessages.length - 1] = { ...lastMessage, stopped: true }
          }
          return updatedMessages
        })
        return
      }

      const errorMessage = error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.'

      setMessages((currentMessages) => [
        ...currentMessages.slice(0, -1),
        { role: 'assistant', content: errorMessage },
      ])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  function updateAssistantMessage(content: string) {
    setMessages((currentMessages) => {
      const updatedMessages = [...currentMessages]
      updatedMessages[updatedMessages.length - 1] = { role: 'assistant', content }
      return updatedMessages
    })
  }

  function handleStop() {
    abortControllerRef.current?.abort()
  }

  return (
    <main className="movie-assistant">
      <section className="movie-assistant__panel" aria-labelledby="movie-assistant-title">
        <header className="movie-assistant__header">
          <div>
            <p className="movie-assistant__eyebrow">AI MOVIE ASSISTANT</p>
            <h1 id="movie-assistant-title">Movie Assistant</h1>
            <p className="movie-assistant__subtitle">Smart recommendations for your next watch</p>
          </div>
          <span className="movie-assistant__status" aria-label="Ready" />
        </header>

        <div
          ref={messageListRef}
          className="movie-assistant__messages"
          aria-live="polite"
          aria-busy={isLoading}
        >
          {messages.length === 0 && (
            <div className="movie-assistant__empty">
              <p className="movie-assistant__empty-icon" aria-hidden="true">✦</p>
              <h2>Find your next movie</h2>
              <p>Ask the assistant for recommendations, actors, genres, or anything about movies.</p>
            </div>
          )}

          {messages.map((message, index) => (
            <article
              className={`movie-assistant__message ${message.role}`}
              key={`${message.role}-${index}`}
            >
              <div className="movie-assistant__message-label">
                <span className="movie-assistant__avatar" aria-hidden="true">
                  {message.role === 'user' ? 'Y' : 'A'}
                </span>
                <strong>{message.role === 'user' ? 'You' : 'Assistant'}</strong>
              </div>
              <p>{message.content}</p>
              {message.stopped && <small className="movie-assistant__stopped">Generation stopped</small>}
            </article>
          ))}

          {isLoading && (
            <div className="movie-assistant__loading" role="status">
              <span className="movie-assistant__dots" aria-hidden="true"><i /><i /><i /></span>
              Assistant is thinking...
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
              placeholder="Ask about a movie..."
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
      </section>
      <p className="movie-assistant__privacy">Your conversation stays in this browser session.</p>
    </main>
  )
}
