interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-line/[0.15] border-t-accent animate-spin ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Carregando"
    />
  )
}
