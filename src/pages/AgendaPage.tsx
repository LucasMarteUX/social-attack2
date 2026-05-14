import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CalendarDays, List, Instagram, Plus, Workflow, Pencil, Trash2, X } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { useAgenda } from '../hooks/useAgenda'
import { useCarousels } from '../hooks/useCarousels'
import { useToast } from '../components/ui/Toast'
import type { Agendamento } from '../data/mock'

type View = 'calendario' | 'lista'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral'> = {
  agendado: 'warning',
  publicado: 'success',
  cancelado: 'neutral',
}

const STATUS_LABEL: Record<string, string> = {
  agendado: 'Agendado',
  publicado: 'Publicado',
  cancelado: 'Cancelado',
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function labelEvento(a: Agendamento, carousels: { id: string; title: string }[], getCriativo: (id: string) => { titulo: string } | undefined) {
  if (a.carousel_id) return carousels.find((c) => c.id === a.carousel_id)?.title ?? 'Workflow'
  if (a.criativo_id) return getCriativo(a.criativo_id)?.titulo ?? 'Post'
  return 'Post'
}

export default function AgendaPage() {
  const navigate = useNavigate()
  const { agendamentos, getCriativo, getCategoriaByCriativo, editar, excluir } = useAgenda()
  const { carousels } = useCarousels()
  const toast = useToast()

  const [view, setView] = useState<View>('calendario')
  const [mesAtual, setMesAtual] = useState(() => {
    const d = new Date()
    return { ano: d.getFullYear(), mes: d.getMonth() }
  })

  // Edit modal state
  const [editando, setEditando] = useState<Agendamento | null>(null)
  const [editData, setEditData] = useState('')
  const [editHora, setEditHora] = useState('09:00')
  const [editPlataforma, setEditPlataforma] = useState<'instagram' | 'linkedin' | 'twitter'>('instagram')
  const [editStatus, setEditStatus] = useState<'agendado' | 'publicado' | 'cancelado'>('agendado')
  const [editNotas, setEditNotas] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Delete confirm state
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  function abrirEdicao(a: Agendamento) {
    const d = new Date(a.data_publicacao)
    const data = d.toISOString().split('T')[0]
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
    setEditData(data)
    setEditHora(hora)
    setEditPlataforma(a.plataforma)
    setEditStatus(a.status)
    setEditNotas(a.notas ?? '')
    setEditando(a)
  }

  async function handleSalvarEdicao() {
    if (!editando) return
    setSalvando(true)
    try {
      const dataPublicacao = new Date(`${editData}T${editHora}:00`).toISOString()
      await editar(editando.id, {
        data_publicacao: dataPublicacao,
        plataforma: editPlataforma,
        status: editStatus,
        notas: editNotas.trim(),
      })
      setEditando(null)
      toast.success('Agendamento atualizado.')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: string) {
    try {
      await excluir(id)
      setExcluindoId(null)
      toast.info('Agendamento removido.')
    } catch {
      toast.error('Erro ao excluir.')
    }
  }

  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(mesAtual.ano, mesAtual.mes, 1)
    const ultimoDia = new Date(mesAtual.ano, mesAtual.mes + 1, 0)
    const inicioSemana = primeiroDia.getDay()
    const totalDias = ultimoDia.getDate()

    const dias: { dia: number | null; data: Date | null; eventos: typeof agendamentos }[] = []
    for (let i = 0; i < inicioSemana; i++) dias.push({ dia: null, data: null, eventos: [] })
    for (let d = 1; d <= totalDias; d++) {
      const data = new Date(mesAtual.ano, mesAtual.mes, d)
      const eventos = agendamentos.filter((a) => {
        const de = new Date(a.data_publicacao)
        return de.getFullYear() === data.getFullYear() && de.getMonth() === data.getMonth() && de.getDate() === data.getDate()
      })
      dias.push({ dia: d, data, eventos })
    }
    return dias
  }, [mesAtual, agendamentos])

  const agendamentosOrdenados = useMemo(() =>
    [...agendamentos].sort((a, b) => a.data_publicacao.localeCompare(b.data_publicacao)),
    [agendamentos]
  )

  const proximosEventos = useMemo(() => {
    const agora = new Date()
    return agendamentosOrdenados.filter((a) => new Date(a.data_publicacao) >= agora).slice(0, 12)
  }, [agendamentosOrdenados])

  function navegarMes(delta: number) {
    setMesAtual(({ ano, mes }) => {
      const novoMes = mes + delta
      if (novoMes < 0) return { ano: ano - 1, mes: 11 }
      if (novoMes > 11) return { ano: ano + 1, mes: 0 }
      return { ano, mes: novoMes }
    })
  }

  const hoje = new Date()

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-display-md font-bold text-ink tracking-tight">Agenda</h1>
          <p className="text-body-md text-ink-muted mt-1">
            {agendamentos.length} publicaç{agendamentos.length === 1 ? 'ão' : 'ões'} planejada{agendamentos.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex p-1 rounded-full bg-line/[0.06]">
            <button
              onClick={() => setView('calendario')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-label font-semibold transition-all ${
                view === 'calendario' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink-muted'
              }`}
            >
              <CalendarDays size={13} />
              Calendário
            </button>
            <button
              onClick={() => setView('lista')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-label font-semibold transition-all ${
                view === 'lista' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink-muted'
              }`}
            >
              <List size={13} />
              Lista
            </button>
          </div>

          <Button onClick={() => navigate('/criativos')}>
            <Plus size={16} />
            Agendar post
          </Button>
        </div>
      </div>

      {/* Layout: conteúdo principal + sidebar */}
      <div className="flex gap-5 items-start">

        {/* Coluna principal */}
        <div className="flex-1 min-w-0">
          {view === 'calendario' && (
            <div className="rounded-3xl bg-surface border border-line/[0.08] p-6 shadow-card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-heading-md font-bold text-ink tracking-tight">
                  {MESES[mesAtual.mes]} <span className="text-ink-faint font-medium">{mesAtual.ano}</span>
                </h2>
                <div className="flex items-center gap-1">
                  <button onClick={() => navegarMes(-1)} className="w-9 h-9 rounded-full hover:bg-line/[0.06] flex items-center justify-center text-ink-muted transition-colors">
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    onClick={() => setMesAtual({ ano: hoje.getFullYear(), mes: hoje.getMonth() })}
                    className="px-3 py-1.5 rounded-full text-label font-semibold text-ink-muted hover:bg-line/[0.06] transition-colors"
                  >
                    Hoje
                  </button>
                  <button onClick={() => navegarMes(1)} className="w-9 h-9 rounded-full hover:bg-line/[0.06] flex items-center justify-center text-ink-muted transition-colors">
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-ink-faint py-2">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {diasDoMes.map((d, i) => {
                  const isHoje = d.data && d.data.getFullYear() === hoje.getFullYear() && d.data.getMonth() === hoje.getMonth() && d.data.getDate() === hoje.getDate()
                  return (
                    <div
                      key={i}
                      className={`aspect-square sm:aspect-auto sm:min-h-[88px] p-1.5 rounded-xl border transition-colors ${
                        d.dia === null ? 'border-transparent' : isHoje ? 'border-accent/35 bg-accent/15' : 'border-line/[0.08] hover:bg-line/[0.04]'
                      }`}
                    >
                      {d.dia !== null && (
                        <>
                          <div className={`text-label font-semibold mb-1 ${isHoje ? 'text-ink' : 'text-ink-muted'}`}>
                            {d.dia}
                          </div>
                          <div className="flex flex-col gap-1">
                            {d.eventos.slice(0, 2).map((e) => {
                              const isCarouselEvt = !!e.carousel_id
                              const carouselEvt = isCarouselEvt ? carousels.find((c) => c.id === e.carousel_id) : null
                              const cat = !isCarouselEvt && e.criativo_id ? getCategoriaByCriativo(e.criativo_id) : null
                              const cri = !isCarouselEvt && e.criativo_id ? getCriativo(e.criativo_id) : null
                              const label = isCarouselEvt ? (carouselEvt?.title ?? 'Workflow') : (cri?.titulo ?? 'Post')
                              return (
                                <button
                                  key={e.id}
                                  onClick={() => {
                                    if (isCarouselEvt && carouselEvt) navigate(`/workspace/${carouselEvt.id}`)
                                    else if (cri) navigate(`/criativos/${cri.id}`)
                                  }}
                                  className="w-full text-left px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate transition-opacity hover:opacity-80"
                                  style={{
                                    backgroundColor: isCarouselEvt ? '#EDE9FE' : (cat ? `${cat.cor}1A` : '#F4F4F4'),
                                    color: isCarouselEvt ? '#6D28D9' : (cat?.cor ?? '#525252'),
                                  }}
                                  title={label}
                                >
                                  {label}
                                </button>
                              )
                            })}
                            {d.eventos.length > 2 && (
                              <span className="text-[10px] text-ink-faint px-1.5">+{d.eventos.length - 2}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {view === 'lista' && (
            <div className="rounded-3xl bg-surface border border-line/[0.08] p-6 shadow-card">
              <div className="mb-4">
                <h2 className="text-heading-sm font-bold text-ink">Todas as publicações</h2>
                <p className="text-label text-ink-faint mt-0.5">Ordenadas por data</p>
              </div>

              {agendamentosOrdenados.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-body-md text-ink-faint">Nada agendado ainda.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {agendamentosOrdenados.map((a) => {
                    const isCarousel = !!a.carousel_id
                    const carousel = isCarousel ? carousels.find((c) => c.id === a.carousel_id) : null
                    const cri = !isCarousel && a.criativo_id ? getCriativo(a.criativo_id) : null
                    const cat = !isCarousel && a.criativo_id ? getCategoriaByCriativo(a.criativo_id) : null
                    const titulo = isCarousel ? (carousel?.title ?? 'Workspace removido') : (cri?.titulo ?? 'Criativo removido')
                    const data = new Date(a.data_publicacao)

                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-line/[0.08] hover:bg-line/[0.04] transition-colors group"
                      >
                        <div
                          className="flex flex-col items-center justify-center w-14 h-16 rounded-2xl bg-line/[0.04] border border-line/[0.08] flex-shrink-0 cursor-pointer"
                          onClick={() => {
                            if (isCarousel && carousel) navigate(`/workspace/${carousel.id}`)
                            else if (cri) navigate(`/criativos/${cri.id}`)
                          }}
                        >
                          <span className="text-[10px] font-bold uppercase text-ink-faint">
                            {data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                          </span>
                          <span className="text-heading-md font-bold text-ink leading-none mt-0.5">
                            {data.getDate()}
                          </span>
                        </div>

                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            if (isCarousel && carousel) navigate(`/workspace/${carousel.id}`)
                            else if (cri) navigate(`/criativos/${cri.id}`)
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            {isCarousel && <Workflow size={13} className="text-ink-muted flex-shrink-0" />}
                            <p className="text-body-md font-semibold text-ink truncate">{titulo}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {cat && (
                              <>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.cor }} />
                                  <span className="text-label text-ink-muted">{cat.nome}</span>
                                </div>
                                <span className="text-ink-faint">·</span>
                              </>
                            )}
                            <span className="text-label text-ink-muted flex items-center gap-1">
                              <Instagram size={11} />
                              {a.plataforma}
                            </span>
                            <span className="text-ink-faint">·</span>
                            <span className="text-label text-ink-muted">
                              {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <Badge variant={STATUS_VARIANT[a.status] ?? 'neutral'} dot>
                          {STATUS_LABEL[a.status]}
                        </Badge>

                        {/* Ações */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => abrirEdicao(a)}
                            className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-accent/[0.08] transition-colors"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          {excluindoId === a.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleExcluir(a.id)}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setExcluindoId(null)}
                                className="p-1.5 rounded-lg text-ink-faint hover:bg-line/[0.06] transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setExcluindoId(a.id)}
                              className="p-1.5 rounded-lg text-ink-faint hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar — Próximos eventos */}
        <div className="w-72 flex-shrink-0">
          <div className="rounded-3xl bg-surface border border-line/[0.08] p-5 shadow-card sticky top-6">
            <div className="mb-4">
              <h2 className="text-heading-sm font-bold text-ink">Próximos posts</h2>
              <p className="text-label text-ink-faint mt-0.5">
                {proximosEventos.length === 0 ? 'Nenhum agendado' : `${proximosEventos.length} próximo${proximosEventos.length > 1 ? 's' : ''}`}
              </p>
            </div>

            {proximosEventos.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-label text-ink-faint">Nada nos próximos dias.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {proximosEventos.map((a) => {
                  const isCarousel = !!a.carousel_id
                  const titulo = labelEvento(a, carousels, getCriativo)
                  const data = new Date(a.data_publicacao)

                  return (
                    <div
                      key={a.id}
                      className="rounded-xl border border-line/[0.08] p-3 hover:bg-line/[0.04] transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {isCarousel && <Workflow size={11} className="text-ink-muted flex-shrink-0" />}
                            <p className="text-[12px] font-semibold text-ink truncate leading-snug">{titulo}</p>
                          </div>
                          <p className="text-[11px] text-ink-faint">
                            {data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] text-ink-faint flex items-center gap-0.5">
                              <Instagram size={10} />
                              {a.plataforma}
                            </span>
                            <span className="text-ink-faint">·</span>
                            <Badge variant={STATUS_VARIANT[a.status] ?? 'neutral'} dot>
                              {STATUS_LABEL[a.status]}
                            </Badge>
                          </div>
                        </div>

                        {/* Ações inline */}
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => abrirEdicao(a)}
                            className="p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-accent/[0.08] transition-colors"
                            title="Editar"
                          >
                            <Pencil size={12} />
                          </button>
                          {excluindoId === a.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleExcluir(a.id)}
                                className="p-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                                title="Confirmar exclusão"
                              >
                                <Trash2 size={11} />
                              </button>
                              <button
                                onClick={() => setExcluindoId(null)}
                                className="p-1 rounded-lg text-ink-faint hover:bg-line/[0.06] transition-colors"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setExcluindoId(a.id)}
                              className="p-1 rounded-lg text-ink-faint hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de edição */}
      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar agendamento">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Data *</label>
              <input
                type="date"
                value={editData}
                onChange={(e) => setEditData(e.target.value)}
                className="px-3 py-2 rounded-xl border border-line/[0.12] text-sm text-ink outline-none focus:border-accent/45 focus:ring-2 focus:ring-accent/12 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Horário</label>
              <input
                type="time"
                value={editHora}
                onChange={(e) => setEditHora(e.target.value)}
                className="px-3 py-2 rounded-xl border border-line/[0.12] text-sm text-ink outline-none focus:border-accent/45 focus:ring-2 focus:ring-accent/12 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Plataforma</label>
            <select
              value={editPlataforma}
              onChange={(e) => setEditPlataforma(e.target.value as typeof editPlataforma)}
              className="px-3 py-2 rounded-xl border border-line/[0.12] text-sm text-ink outline-none focus:border-accent/45 focus:ring-2 focus:ring-accent/12 transition-all bg-surface"
            >
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter / X</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
              className="px-3 py-2 rounded-xl border border-line/[0.12] text-sm text-ink outline-none focus:border-accent/45 focus:ring-2 focus:ring-accent/12 transition-all bg-surface"
            >
              <option value="agendado">Agendado</option>
              <option value="publicado">Publicado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Notas</label>
            <textarea
              value={editNotas}
              onChange={(e) => setEditNotas(e.target.value)}
              rows={2}
              placeholder="Observações sobre a postagem..."
              className="px-3 py-2 rounded-xl border border-line/[0.12] text-sm text-ink outline-none focus:border-accent/45 focus:ring-2 focus:ring-accent/12 transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao} disabled={!editData || salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
