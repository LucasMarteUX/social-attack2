import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { type Categoria } from '../../data/mock'

const PALETTE = [
  '#6D28D9', '#BE185D', '#65A30D', '#0891B2',
  '#E55A30', '#DC2626', '#1BA0A0', '#F59E0B',
]

const ICONES = [
  'TrendingUp', 'Salad', 'Timer', 'PiggyBank', 'Bot',
  'Camera', 'Mic', 'BookOpen', 'Star', 'Heart',
  'Globe', 'Briefcase', 'Coffee', 'Music', 'Rocket',
]

interface CategoryFormProps {
  open: boolean
  onClose: () => void
  onSave: (dados: Omit<Categoria, 'id' | 'criado_em'>) => void
  inicial?: Categoria | null
}

export default function CategoryForm({ open, onClose, onSave, inicial }: CategoryFormProps) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [cor, setCor] = useState(PALETTE[0])
  const [icone, setIcone] = useState(ICONES[0])
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (inicial) {
      setNome(inicial.nome)
      setDescricao(inicial.descricao)
      setCor(inicial.cor)
      setIcone(inicial.icone)
    } else {
      setNome('')
      setDescricao('')
      setCor(PALETTE[0])
      setIcone(ICONES[0])
    }
    setErro('')
  }, [inicial, open])

  function handleSave() {
    if (!nome.trim()) {
      setErro('O nome da categoria é obrigatório.')
      return
    }
    onSave({ nome: nome.trim(), descricao: descricao.trim(), cor, icone })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={inicial ? 'Editar categoria' : 'Nova categoria'}
    >
      <div className="flex flex-col gap-5">
        <Input
          label="Nome"
          placeholder="Ex: Marketing Digital"
          value={nome}
          onChange={(e) => { setNome(e.target.value); setErro('') }}
          error={erro}
        />

        <div className="flex flex-col gap-1">
          <label className="text-label font-medium text-neutral-700">Descrição (opcional)</label>
          <textarea
            className="w-full px-3.5 py-2.5 rounded-md border border-neutral-200 text-body-md text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 resize-none transition-colors"
            rows={2}
            placeholder="Do que se trata essa categoria?"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label font-medium text-neutral-700">Cor</label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setCor(c)}
                className={`w-8 h-8 rounded-full transition-transform ${cor === c ? 'scale-125 ring-2 ring-offset-2 ring-neutral-400' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label font-medium text-neutral-700">Ícone</label>
          <div className="flex flex-wrap gap-2">
            {ICONES.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcone(ic)}
                className={`px-3 py-1.5 rounded-md text-label font-medium border transition-colors ${
                  icone === ic
                    ? 'bg-purple-50 border-purple-600 text-purple-700'
                    : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-label font-bold flex-shrink-0"
            style={{ backgroundColor: cor }}
          >
            {nome ? nome[0].toUpperCase() : '?'}
          </div>
          <div>
            <p className="text-body-md font-semibold text-neutral-900">{nome || 'Nome da categoria'}</p>
            <p className="text-label text-neutral-400">{icone}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>{inicial ? 'Salvar alterações' : 'Criar categoria'}</Button>
        </div>
      </div>
    </Modal>
  )
}
