interface LoadingProps {
	message?: string
}

export function Loading({ message = 'Loading...' }: LoadingProps) {
	return <p role="status" aria-live="polite">{message}</p>
}
