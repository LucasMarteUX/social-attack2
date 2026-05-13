import { useState, useMemo } from 'react'
import { Plus, Check, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { useTodos } from '../hooks/useTodos'
import { type Todo } from '../data/mock'

type Filtro = 'todas' | 'pendentes' | 'concluidas'
type Prioridade = Todo['prioridade']

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'concluidas', label: 'Concluídas' },
]

const PRIORIDADE_VARIANT: Record<Prioridade, 'alert' | 'cyan' | 'neutral'> = {
  alta: 'alert',
  media: 'cyan',
  baixa: 'neutral',
}

const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

function formatPrazo(prazo: string | null): { label: string; urgente: boolean } | null {
  if (!prazo) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const prazoData = new Date(prazo)
  prazoData.setHours(0, 0, 0, 0)
  const diff = Math.ceil((prazoData.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return { label: `Atrasada (${Math.abs(diff)}d)`, urgente: true }
  if (diff === 0) return { label: 'Vence hoje', urgente: true }
  if (diff === 1) return { label: 'Vence amanhã', urgente: true }
  if (diff <= 7) return { label: `Em ${diff} dias`, urgente: false }
  return { label: prazoData.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }), urgente: false }
}

export default function TodosPage() {
  const { todos, criar, toggleConcluida, excluir } = useTodos()

  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [formOpen, setFormOpen] = useState(false)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novoPrazo, setNovoPrazo] = useState('')
  const [novaPrioridade, setNovaPrioridade] = useState<Prioridade>('media')

  const filtrados = useMemo(() => {
    let lista = todos
    if (filtro === 'pendentes') lista = lista.filter((t) => !t.concluida)
    if (filtro === 'concluidas') lista = lista.filter((t) => t.concluida)

    return lista.sort((a, b) => {
      if (a.concluida !== b.concluida) return a.concluida ? 1 : -1
      const ord = { alta: 0, media: 1, baixa: 2 }
      const pri = ord[a.prioridade] - ord[b.prioridade]
      if (pri !== 0) return pri
      if (a.prazo && b.prazo) return a.prazo.localeCompare(b.prazo)
      if (a.prazo) return -1
      if (b.prazo) return 1
      return 0
    })
  }, [todos, filtro])

  const totalPendentes = todos.filter((t) => !t.concluida).length
  const urgentes = todos.filter((t) => {
    if (t.concluida) return false
    const p = formatPrazo(t.prazo)
    return p?.urgente
  }).length

  function handleSalvar() {
    if (!novoTitulo.trim()) return
    criar({
      titulo: novoTitulo.trim(),
      prazo: novoPrazo || null,
      prioridade: novaPrioridade,
    })
    setNovoTitulo('')
    setNovoPrazo('')
    setNovaPrioridade('media')
    setFormOpen(false)
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-display-md font-bold text-neutral-900 tracking-tight">To-Do</h1>
          <p className="text-body-md text-neutral-500 mt-1">
            {totalPendentes} pendente{totalPendentes === 1 ? '' : 's'}
            {urgentes > 0 && <span className="text-coral-700 font-medium"> · {urgentes} urgente{urgentes === 1 ? '' : 's'}</span>}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={16} />
          Nova tarefa
        </Button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl bg-white border border-neutral-100 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-neutral-600" />
            </div>
            <span className="text-label text-neutral-500 font-medium">Total</span>
          </div>
          <p className="text-heading-lg font-bold text-neutral-900">{todos.length}</p>
        </div>
        <div className="rounded-2xl bg-cyan-gradient p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-teal-200/60 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-teal-700" />
            </div>
            <span className="text-label text-teal-800 font-medium">Pendentes</span>
          </div>
          <p className="text-heading-lg font-bold text-neutral-900">{totalPendentes}</p>
        </div>
        <div className="rounded-2xl bg-sunset-gradient p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-coral-200/60 flex items-center justify-center">
              <AlertCircle size={14} className="text-coral-700" />
            </div>
            <span className="text-label text-coral-800 font-medium">Urgentes</span>
          </div>
          <p className="text-heading-lg font-bold text-neutral-900">{urgentes}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-4 py-1.5 rounded-full text-label font-semibold border transition-colors ${
              filtro === f.key
                ? 'border-purple-600 bg-purple-50 text-purple-700'
                : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="rounded-3xl bg-white border border-neutral-100 shadow-card overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-body-md text-neutral-400">
              {filtro === 'concluidas' ? 'Nada concluído ainda.' : 'Nenhuma tarefa por aqui.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtrados.map((todo) => {
              const prazo = formatPrazo(todo.prazo)

              return (
                <div
                  key={todo.id}
                  className={`group flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors ${
                    todo.concluida ? 'opacity-60' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleConcluida(todo.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      todo.concluida
                        ? 'bg-green-600 border-green-600'
                        : 'border-neutral-300 hover:border-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    {todo.concluida && <Check size={13} className="text-white" />}
                  </button>

                  {/* Texto */}
                  <p
                    className={`flex-1 text-body-md font-medium ${
                      todo.concluida
                        ? 'line-through text-neutral-400'
                        : 'text-neutral-800'
                    }`}
                  >
                    {todo.titulo}
                  </p>

                  {/* Prazo */}
                  {prazo && !todo.concluida && (
                    <span
                      className={`text-label font-medium ${
                        prazo.urgente ? 'text-coral-700' : 'text-neutral-500'
                      }`}
                    >
                      {prazo.label}
                    </span>
                  )}

                  {/* Prioridade */}
                  <Badge variant={PRIORIDADE_VARIANT[todo.prioridade]} dot>
                    {PRIORIDADE_LABEL[todo.prioridade]}
                  </Badge>

                  {/* Excluir */}
                  <button
                    onClick={() => excluir(todo.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal nova tarefa */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nova tarefa">
        <div className="flex flex-col gap-4">
          <Input
            label="Título"
            placeholder="Ex: Gravar Reels da semana"
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-label font-medium text-neutral-700">Prazo (opcional)</label>
            <input
              type="date"
              className="w-full px-3.5 py-2.5 rounded-md border border-neutral-200 text-body-md text-neutral-900 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 transition-colors"
              value={novoPrazo}
              onChange={(e) => setNovoPrazo(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-label font-medium text-neutral-700">Prioridade</label>
            <div className="flex gap-2">
              {(['alta', 'media', 'baixa'] as Prioridade[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setNovaPrioridade(p)}
                  className={`flex-1 px-3 py-2 rounded-lg text-label font-semibold border transition-colors ${
                    novaPrioridade === p
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
                  }`}
                >
                  {PRIORIDADE_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvar}>Criar tarefa</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
