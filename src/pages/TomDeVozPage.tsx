import { useState } from 'react'
import { Plus, Pencil, Trash2, Mic2, Quote } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { useTomDeVoz } from '../hooks/useTomDeVoz'
import { type TomDeVoz } from '../data/mock'

type FormData = Omit<TomDeVoz, 'id' | 'criado_em'>

export default function TomDeVozPage() {
  const { tons, criar, editar, excluir } = useTomDeVoz()

  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState<TomDeVoz | null>(null)
  const [excluindo, setExcluindo] = useState<TomDeVoz | null>(null)

  const [form, setForm] = useState<FormData>({ nome: '', descricao: '', exemplo: '' })
  const [erros, setErros] = useState<Partial<Record<keyof FormData, string>>>({})

  function handleOpenNovo() {
    setEditando(null)
    setForm({ nome: '', descricao: '', exemplo: '' })
    setErros({})
    setFormOpen(true)
  }

  function handleOpenEdit(tom: TomDeVoz) {
    setEditando(tom)
    setForm({ nome: tom.nome, descricao: tom.descricao, exemplo: tom.exemplo })
    setErros({})
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditando(null)
  }

  function handleSave() {
    const novosErros: typeof erros = {}
    if (!form.nome.trim()) novosErros.nome = 'Campo obrigatório.'
    if (!form.descricao.trim()) novosErros.descricao = 'Campo obrigatório.'
    if (Object.keys(novosErros).length > 0) { setErros(novosErros); return }

    if (editando) {
      editar(editando.id, { nome: form.nome.trim(), descricao: form.descricao.trim(), exemplo: form.exemplo.trim() })
    } else {
      criar({ nome: form.nome.trim(), descricao: form.descricao.trim(), exemplo: form.exemplo.trim() })
    }
    handleClose()
  }

  function set(field: keyof FormData, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setErros((p) => ({ ...p, [field]: undefined }))
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-display-md font-bold text-neutral-900 tracking-tight">Tom de Voz</h1>
          <p className="text-body-md text-neutral-500 mt-1">
            {tons.length} {tons.length === 1 ? 'tom cadastrado' : 'tons cadastrados'} · usado nos seus criativos
          </p>
        </div>
        <Button onClick={handleOpenNovo}>
          <Plus size={16} />
          Novo tom
        </Button>
      </div>

      {tons.length === 0 ? (
        <EmptyState onNew={handleOpenNovo} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tons.map((tom) => (
            <TomCard
              key={tom.id}
              tom={tom}
              onEdit={() => handleOpenEdit(tom)}
              onDelete={() => setExcluindo(tom)}
            />
          ))}
        </div>
      )}

      {/* Modal criar / editar */}
      <Modal
        open={formOpen}
        onClose={handleClose}
        title={editando ? 'Editar tom de voz' : 'Novo tom de voz'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nome do tom"
            placeholder="Ex: Provocativo, Técnico, Bem-humorado…"
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            error={erros.nome}
            autoFocus
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-label font-medium text-neutral-700">
              Descrição <span className="text-neutral-400 font-normal">(como esse tom se comporta)</span>
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 rounded-md border border-neutral-200 text-body-md text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 resize-none transition-colors"
              rows={3}
              placeholder="Ex: Desafia crenças estabelecidas e faz perguntas diretas que incomodam."
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
            />
            {erros.descricao && <p className="text-label text-red-600">{erros.descricao}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-label font-medium text-neutral-700">
              Frase de exemplo <span className="text-neutral-400 font-normal">(opcional)</span>
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 rounded-md border border-neutral-200 text-body-md text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 resize-none transition-colors"
              rows={2}
              placeholder='Ex: "Por que todo mundo continua fazendo isso do jeito errado?"'
              value={form.exemplo}
              onChange={(e) => set('exemplo', e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSave}>{editando ? 'Salvar' : 'Criar tom'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmar exclusão */}
      <Modal open={!!excluindo} onClose={() => setExcluindo(null)} title="Excluir tom de voz">
        <p className="text-body-md text-neutral-600 mb-6">
          Tem certeza que deseja excluir{' '}
          <strong className="text-neutral-900">"{excluindo?.nome}"</strong>?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setExcluindo(null)}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => { if (excluindo) excluir(excluindo.id); setExcluindo(null) }}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function TomCard({ tom, onEdit, onDelete }: { tom: TomDeVoz; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="group relative bg-white rounded-3xl border border-neutral-200 flex flex-col overflow-hidden">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-purple-100/60 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative p-6 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
            <Mic2 size={17} className="text-purple-700" />
          </div>
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onEdit}
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <h3 className="text-heading-sm font-bold text-neutral-900 tracking-tight mb-1">{tom.nome}</h3>
        <p className="text-body-sm text-neutral-500 leading-relaxed mb-4">{tom.descricao}</p>

        {tom.exemplo && (
          <div className="flex gap-2 p-3 rounded-xl bg-purple-50 border border-purple-100">
            <Quote size={13} className="text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-body-sm text-purple-800 italic leading-relaxed">{tom.exemplo}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mb-4">
        <Mic2 size={28} className="text-purple-600" />
      </div>
      <h3 className="text-heading-sm font-semibold text-neutral-900 mb-2">Nenhum tom cadastrado</h3>
      <p className="text-body-md text-neutral-500 mb-6 max-w-xs">
        Crie seus tons de voz e selecione um ao gerar cada carrossel.
      </p>
      <Button onClick={onNew}>
        <Plus size={16} />
        Criar primeiro tom
      </Button>
    </div>
  )
}
