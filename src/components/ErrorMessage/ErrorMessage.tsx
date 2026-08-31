interface ErrorMessageProps {
  message: string
  className?: string
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <p className={className} role="alert">
      {message}
    </p>
  )
}
