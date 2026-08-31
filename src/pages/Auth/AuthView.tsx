import type { FormEvent, ReactElement } from 'react'
import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { useAuthViewModel } from './useAuthViewModel'
import './AuthView.css'

export function AuthView(): ReactElement {
  const {
    email,
    password,
    mode,
    loading,
    error,
    setEmail,
    setPassword,
    handleSubmit,
    toggleMode,
  } = useAuthViewModel()

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void handleSubmit()
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>{mode === 'login' ? 'Login' : 'Create Account'}</h1>
        <form className="auth-form" onSubmit={handleFormSubmit}>
          <div className="auth-field">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          </div>
          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <ErrorMessage className="auth-error" message={error} />}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
        <button className="auth-switch" type="button" onClick={toggleMode} disabled={loading}>
          {mode === 'login'
            ? "Don't have an account? Create one"
            : 'Already have an account? Login'}
        </button>
      </section>
    </main>
  )
}
