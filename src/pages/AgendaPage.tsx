import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CalendarDays, List, Instagram, Plus } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import SectionHeader from '../components/ui/SectionHeader'
import { useAgenda } from '../hooks/useAgenda'

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

export default function AgendaPage() {
  const navigate = useNavigate()
  const { agendamentos, getCriativo, getCategoriaByCriativo } = useAgenda()

  const [view, setView] = useState<View>('calendario')
  const [mesAtual, setMesAtual] = useState(() => {
    const d = new Date()
    return { ano: d.getFullYear(), mes: d.getMonth() }
  })

  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(mesAtual.ano, mesAtual.mes, 1)
    const ultimoDia = new Date(mesAtual.ano, mesAtual.mes + 1, 0)
    const inicioSemana = primeiroDia.getDay()
    const totalDias = ultimoDia.getDate()

    const dias: { dia: number | null; data: Date | null; eventos: typeof agendamentos }[] = []

    for (let i = 0; i < inicioSemana; i++) {
      dias.push({ dia: null, data: null, eventos: [] })
    }

    for (let d = 1; d <= totalDias; d++) {
      const data = new Date(mesAtual.ano, mesAtual.mes, d)
      const eventos = agendamentos.filter((a) => {
        const dataEvento = new Date(a.data_publicacao)
        return (
          dataEvento.getFullYear() === data.getFullYear() &&
          dataEvento.getMonth() === data.getMonth() &&
          dataEvento.getDate() === data.getDate()
        )
      })
      dias.push({ dia: d, data, eventos })
    }

    return dias
  }, [mesAtual, agendamentos])

  const agendamentosOrdenados = useMemo(() => {
    return [...agendamentos].sort((a, b) =>
      a.data_publicacao.localeCompare(b.data_publicacao)
    )
  }, [agendamentos])

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
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-display-md font-bold text-neutral-900 tracking-tight">Agenda</h1>
          <p className="text-body-md text-neutral-500 mt-1">
            {agendamentos.length} publicaç{agendamentos.length === 1 ? 'ão' : 'ões'} planejada{agendamentos.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle de view */}
          <div className="inline-flex p-1 rounded-full bg-neutral-100">
            <button
              onClick={() => setView('calendario')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-label font-semibold transition-all ${
                view === 'calendario'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <CalendarDays size={13} />
              Calendário
            </button>
            <button
              onClick={() => setView('lista')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-label font-semibold transition-all ${
                view === 'lista'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
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

      {view === 'calendario' && (
        <div className="rounded-3xl bg-white border border-neutral-100 p-6 shadow-card">
          {/* Header do calendário */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-heading-md font-bold text-neutral-900 tracking-tight">
              {MESES[mesAtual.mes]} <span className="text-neutral-400 font-medium">{mesAtual.ano}</span>
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navegarMes(-1)}
                className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                onClick={() =>
                  setMesAtual({ ano: hoje.getFullYear(), mes: hoje.getMonth() })
                }
                className="px-3 py-1.5 rounded-full text-label font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={() => navegarMes(1)}
                className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          {/* Cabeçalho da semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold uppercase tracking-wider text-neutral-400 py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7 gap-1">
            {diasDoMes.map((d, i) => {
              const isHoje =
                d.data &&
                d.data.getFullYear() === hoje.getFullYear() &&
                d.data.getMonth() === hoje.getMonth() &&
                d.data.getDate() === hoje.getDate()

              return (
                <div
                  key={i}
                  className={`aspect-square sm:aspect-auto sm:min-h-[88px] p-1.5 rounded-xl border transition-colors ${
                    d.dia === null
                      ? 'border-transparent'
                      : isHoje
                      ? 'border-purple-300 bg-purple-50/40'
                      : 'border-neutral-100 hover:bg-neutral-50'
                  }`}
                >
                  {d.dia !== null && (
                    <>
                      <div
                        className={`text-label font-semibold mb-1 ${
                          isHoje ? 'text-purple-700' : 'text-neutral-600'
                        }`}
                      >
                        {d.dia}
                      </div>
                      <div className="flex flex-col gap-1">
                        {d.eventos.slice(0, 2).map((e) => {
                          const cat = getCategoriaByCriativo(e.criativo_id)
                          const cri = getCriativo(e.criativo_id)
                          return (
                            <button
                              key={e.id}
                              onClick={() => cri && navigate(`/criativos/${cri.id}`)}
                              className="w-full text-left px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate transition-opacity hover:opacity-80"
                              style={{
                                backgroundColor: cat ? `${cat.cor}1A` : '#F4F4F4',
                                color: cat?.cor ?? '#525252',
                              }}
                              title={cri?.titulo}
                            >
                              {cri?.titulo ?? 'Post'}
                            </button>
                          )
                        })}
                        {d.eventos.length > 2 && (
                          <span className="text-[10px] text-neutral-400 px-1.5">
                            +{d.eventos.length - 2}
                          </span>
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
        <div className="rounded-3xl bg-white border border-neutral-100 p-6 shadow-card">
          <SectionHeader
            title="Próximas publicações"
            subtitle="Ordenadas por data"
          />

          {agendamentosOrdenados.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-body-md text-neutral-400">Nada agendado ainda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {agendamentosOrdenados.map((a) => {
                const cri = getCriativo(a.criativo_id)
                const cat = getCategoriaByCriativo(a.criativo_id)
                const data = new Date(a.data_publicacao)
                const variant = STATUS_VARIANT[a.status] ?? 'neutral'

                return (
                  <div
                    key={a.id}
                    onClick={() => cri && navigate(`/criativos/${cri.id}`)}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center w-14 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex-shrink-0">
                      <span className="text-[10px] font-bold uppercase text-neutral-400">
                        {data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-heading-md font-bold text-neutral-900 leading-none mt-0.5">
                        {data.getDate()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-semibold text-neutral-900 truncate">
                        {cri?.titulo ?? 'Criativo removido'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {cat && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.cor }} />
                            <span className="text-label text-neutral-500">{cat.nome}</span>
                          </div>
                        )}
                        <span className="text-neutral-300">·</span>
                        <span className="text-label text-neutral-500 flex items-center gap-1">
                          <Instagram size={11} />
                          {a.plataforma}
                        </span>
                        <span className="text-neutral-300">·</span>
                        <span className="text-label text-neutral-500">
                          {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <Badge variant={variant} dot>{STATUS_LABEL[a.status]}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
