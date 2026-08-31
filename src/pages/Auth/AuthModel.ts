import { loginUser, logoutUser, registerUser } from '../../services/authService'
import type { User } from 'firebase/auth'

function validateCredentials(email: string, password: string): string {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    throw new Error('Email is required.')
  }

  if (!password.trim()) {
    throw new Error('Password is required.')
  }

  if (password.length < 6) {
    throw new Error('Password must contain at least six characters.')
  }

  return normalizedEmail
}

export async function register(email: string, password: string): Promise<User> {
  const normalizedEmail = validateCredentials(email, password)
  return registerUser(normalizedEmail, password)
}

export async function login(email: string, password: string): Promise<User> {
  const normalizedEmail = validateCredentials(email, password)
  return loginUser(normalizedEmail, password)
}

export function logout(): Promise<void> {
  return logoutUser()
}
