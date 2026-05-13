import { useState, useEffect } from 'react'
import { Plus, X, Link, FileText } from 'lucide-react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { type Ideia, type Referencia } from '../../data/mock'

interface IdeaFormProps {
  open: boolean
  onClose: () => void
  onSave: (dados: Pick<Ideia, 'titulo' | 'descricao' | 'referencias'>) => void
  inicial?: Ideia | null
}

export default function IdeaForm({ open, onClose, onSave, inicial }: IdeaFormProps) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [referencias, setReferencias] = useState<Referencia[]>([])
  const [novaRef, setNovaRef] = useState('')
  const [tipoRef, setTipoRef] = useState<'url' | 'texto'>('url')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (inicial) {
      setTitulo(inicial.titulo)
      setDescricao(inicial.descricao)
      setReferencias(inicial.referencias)
    } else {
      setTitulo('')
      setDescricao('')
      setReferencias([])
    }
    setNovaRef('')
    setErro('')
  }, [inicial, open])

  function addRef() {
    if (!novaRef.trim()) return
    setReferencias((prev) => [...prev, { tipo: tipoRef, valor: novaRef.trim() }])
    setNovaRef('')
  }

  function removeRef(i: number) {
    setReferencias((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleSave() {
    if (!titulo.trim()) { setErro('O título é obrigatório.'); return }
    onSave({ titulo: titulo.trim(), descricao: descricao.trim(), referencias })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={inicial ? 'Editar ideia' : 'Nova ideia'}>
      <div className="flex flex-col gap-5">
        <Input
          label="Título"
          placeholder="Ex: 5 erros que matam seu alcance no Instagram"
          value={titulo}
          onChange={(e) => { setTitulo(e.target.value); setErro('') }}
          error={erro}
        />

        <div className="flex flex-col gap-1">
          <label className="text-label font-medium text-neutral-700">Descrição (opcional)</label>
          <textarea
            className="w-full px-3.5 py-2.5 rounded-md border border-neutral-200 text-body-md text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 resize-none transition-colors"
            rows={3}
            placeholder="Descreva o ângulo ou abordagem da ideia…"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        {/* Referências */}
        <div className="flex flex-col gap-2">
          <label className="text-label font-medium text-neutral-700">Referências</label>

          <div className="flex gap-2">
            <button
              onClick={() => setTipoRef('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-label font-medium border transition-colors ${
                tipoRef === 'url'
                  ? 'bg-purple-50 border-purple-600 text-purple-700'
                  : 'bg-white border-neutral-200 text-neutral-500'
              }`}
            >
              <Link size={12} /> URL
            </button>
            <button
              onClick={() => setTipoRef('texto')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-label font-medium border transition-colors ${
                tipoRef === 'texto'
                  ? 'bg-purple-50 border-purple-600 text-purple-700'
                  : 'bg-white border-neutral-200 text-neutral-500'
              }`}
            >
              <FileText size={12} /> Texto
            </button>
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 px-3.5 py-2.5 rounded-md border border-neutral-200 text-body-md text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-purple-600 transition-colors"
              placeholder={tipoRef === 'url' ? 'https://…' : 'Anotação, citação, contexto…'}
              value={novaRef}
              onChange={(e) => setNovaRef(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRef()}
            />
            <Button variant="secondary" size="sm" onClick={addRef}>
              <Plus size={14} />
            </Button>
          </div>

          {referencias.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              {referencias.map((ref, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-neutral-50 border border-neutral-100"
                >
                  {ref.tipo === 'url' ? (
                    <Link size={12} className="text-neutral-400 flex-shrink-0" />
                  ) : (
                    <FileText size={12} className="text-neutral-400 flex-shrink-0" />
                  )}
                  <span className="text-label text-neutral-600 flex-1 truncate">{ref.valor}</span>
                  <button
                    onClick={() => removeRef(i)}
                    className="text-neutral-300 hover:text-red-500 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>{inicial ? 'Salvar alterações' : 'Criar ideia'}</Button>
        </div>
      </div>
    </Modal>
  )
}
