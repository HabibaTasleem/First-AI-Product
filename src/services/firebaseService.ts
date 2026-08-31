import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { get, getDatabase, ref, remove, set } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'
import type { Movie } from './omdbMovieService'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}

const missingEnvVars = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingEnvVars.join(', ')}`,
  )
}

const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)

export const database = getDatabase(firebaseApp)

const FAVOURITES_PATH = 'favourites'

function getFirebaseErrorReason(error: unknown): string {
  const firebaseError = error as { code?: unknown }

  if (firebaseError.code === 'auth/configuration-not-found') {
    return ' Enable Anonymous Authentication in the Firebase Console.'
  }

  return error instanceof Error ? ` ${error.message}` : ''
}

function requireAuthenticatedUser(): void {
  if (!auth.currentUser || auth.currentUser.isAnonymous) {
    throw new Error('Please log in before managing favourite movies.')
  }
}

export async function addFavourite(movie: Movie): Promise<void> {
  try {
    requireAuthenticatedUser()
    await set(ref(database, `${FAVOURITES_PATH}/${movie.imdbID}`), movie)
  } catch (error) {
    throw new Error(`Unable to add favourite movie.${getFirebaseErrorReason(error)}`)
  }
}

export async function removeFavourite(imdbID: string): Promise<void> {
  try {
    requireAuthenticatedUser()
    await remove(ref(database, `${FAVOURITES_PATH}/${imdbID}`))
  } catch (error) {
    throw new Error(`Unable to remove favourite movie.${getFirebaseErrorReason(error)}`)
  }
}

export async function getFavourites(): Promise<Movie[]> {
  try {
    requireAuthenticatedUser()
    const snapshot = await get(ref(database, FAVOURITES_PATH))
    const favourites = snapshot.val() as Record<string, Movie> | null

    return favourites ? Object.values(favourites) : []
  } catch (error) {
    throw new Error(`Unable to load favourite movies.${getFirebaseErrorReason(error)}`)
  }
}
