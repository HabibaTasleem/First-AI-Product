import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
  type Unsubscribe,
} from 'firebase/auth'
import { auth } from './firebaseService'

function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error.message : 'An authentication error occurred.'
  }

  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'That email address is already registered.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/missing-password': 'Please enter a password.',
    'auth/password-does-not-meet-requirements': 'The password does not meet the required security rules.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/user-disabled': 'This user account has been disabled.',
    'auth/user-not-found': 'No account was found for that email address.',
    'auth/weak-password': 'The password is too weak.',
  }

  return messages[error.code] ?? 'Authentication failed. Please try again.'
}

function throwReadableAuthError(error: unknown): never {
  throw new Error(getAuthErrorMessage(error))
}

export async function registerUser(email: string, password: string): Promise<User> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    return credential.user
  } catch (error) {
    return throwReadableAuthError(error)
  }
}

export async function loginUser(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user
  } catch (error) {
    return throwReadableAuthError(error)
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth)
  } catch (error) {
    return throwReadableAuthError(error)
  }
}

export function subscribeToAuthChanges(
  callback: (user: User | null) => void,
): Unsubscribe {
  return onAuthStateChanged(auth, callback)
}
