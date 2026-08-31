import { useState } from 'react'
import * as AuthModel from './AuthModel'

type AuthMode = 'login' | 'register'

export interface AuthViewModel {
  email: string
  password: string
  mode: AuthMode
  loading: boolean
  error: string | null
  setEmail: (email: string) => void
  setPassword: (password: string) => void
  handleSubmit: () => Promise<void>
  toggleMode: () => void
}

export function useAuthViewModel(): AuthViewModel {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    setLoading(true)

    try {
      await (mode === 'login'
        ? AuthModel.login(email, password)
        : AuthModel.register(email, password))

      setPassword('')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Authentication failed. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  function toggleMode() {
    setMode((currentMode) => (currentMode === 'login' ? 'register' : 'login'))
    setError(null)
  }

  return {
    email,
    password,
    mode,
    loading,
    error,
    setEmail,
    setPassword,
    handleSubmit,
    toggleMode,
  }
}
