import type { User } from 'firebase/auth'
import type { ReactNode } from 'react'

export interface AuthContextValue {
  user: User | null
  authLoading: boolean
  logout: () => Promise<void>
}

export interface AuthProviderProps {
  children: ReactNode
}
