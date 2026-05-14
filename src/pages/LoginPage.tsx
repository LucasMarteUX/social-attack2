import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setErro(null)
    const { error } = await signIn(email.trim(), password)
    if (error) {
      setErro('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-11 h-11 bg-accent rounded-2xl flex items-center justify-center shadow-lg">
            <Zap size={20} className="text-bg" fill="currentColor" />
          </div>
          <div>
            <p className="text-xl font-bold text-ink leading-tight tracking-tight">Social Attack</p>
            <p className="text-[11px] text-ink-faint">Conteúdo com IA</p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line/[0.08] shadow-sm p-8">
          <h1 className="text-lg font-bold text-ink mb-1">Entrar</h1>
          <p className="text-sm text-ink-muted mb-6">Acesso restrito ao administrador.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">E-mail</label>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-3 py-2.5 rounded-xl border border-line/[0.12] text-sm text-ink outline-none focus:border-accent/45 focus:ring-2 focus:ring-accent/12 transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-line/[0.12] text-sm text-ink outline-none focus:border-accent/45 focus:ring-2 focus:ring-accent/12 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {erro && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-2.5 rounded-xl bg-accent text-bg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
