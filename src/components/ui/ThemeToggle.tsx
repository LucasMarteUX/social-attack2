import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../lib/theme'

interface Props {
  className?: string
  size?: number
}

export default function ThemeToggle({ className = '', size = 15 }: Props) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className={`p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-line/[0.06] transition-colors ${className}`}
    >
      {isDark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  )
}
