import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Bell, Lightbulb, Palette, Calendar, CheckCircle2,
  TrendingUp, ChevronRight, Sparkles,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import StatCard from '../components/ui/StatCard'
import DonutChart from '../components/ui/DonutChart'
import AIInsightCard from '../components/ui/AIInsightCard'
import SectionHeader from '../components/ui/SectionHeader'
import { supabase } from '../lib/supabase'
import { useCriativos } from '../hooks/useCriativos'
import { useAgenda } from '../hooks/useAgenda'
import { useTodos } from '../hooks/useTodos'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function HomePage() {
  const navigate = useNavigate()
  const { criativos } = useCriativos()
  const { agendamentos } = useAgenda()
  const { todos } = useTodos()
  const [totalIdeias, setTotalIdeias] = useState(0)
  const [ideiaSemConteudo, setIdeiaSemConteudo] = useState(0)

  useEffect(() => {
    async function carregarIdeias() {
      const [{ count: total }, { count: semConteudo }] = await Promise.all([
        supabase.from('ideias').select('*', { count: 'exact', head: true }),
        supabase.from('ideias').select('*', { count: 'exact', head: true }).eq('conteudo_gerado', false),
      ])
      setTotalIdeias(total ?? 0)
      setIdeiaSemConteudo(semConteudo ?? 0)
    }
    carregarIdeias()
  }, [])

  const stats = useMemo(() => {
    const criativosProntos = criativos.filter((c) => c.status === 'pronto').length
    const agendadosSemana = agendamentos.filter((a) => a.status === 'agendado').length
    const todosPendentes = todos.filter((t) => !t.concluida).length
    return { criativosProntos, agendadosSemana, todosPendentes }
  }, [criativos, agendamentos, todos])

  const statusSegments = useMemo(() => {
    const counts = criativos.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    return [
      { label: 'Pronto', value: counts.pronto ?? 0, color: '#65A30D' },
      { label: 'Agendado', value: counts.agendado ?? 0, color: '#0891B2' },
      { label: 'Rascunho', value: counts.rascunho ?? 0, color: '#5A47FF' },
      { label: 'Publicado', value: counts.publicado ?? 0, color: '#4338CA' },
    ].filter((s) => s.value > 0)
  }, [criativos])

  const proximasPublicacoes = useMemo(() => {
    return agendamentos
      .filter((a) => a.status === 'agendado')
      .map((a: any) => ({
        agendamento: a,
        criativo: a.criativo,
        categoria: a.criativo?.categoria,
      }))
      .sort((a, b) => a.agendamento.data_publicacao.localeCompare(b.agendamento.data_publicacao))
      .slice(0, 3)
  }, [agendamentos])

  const totalCriativos = criativos.length
  const score = totalCriativos > 0 ? Math.round((stats.criativosProntos / totalCriativos) * 100) : 0

  const top3Todos = todos
    .filter((t) => !t.concluida)
    .sort((a, b) => {
      const ord = { alta: 0, media: 1, baixa: 2 }
      return ord[a.prioridade] - ord[b.prioridade]
    })
    .slice(0, 3)

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-display-md font-bold text-ink tracking-tight leading-tight">
            {greeting()}, Lucas <span className="inline-block">👋</span>
          </h1>
          <p className="text-body-md text-ink-muted mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} · Vamos criar conteúdo hoje?
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full bg-surface border border-line/[0.12] flex items-center justify-center text-ink-muted hover:bg-line/[0.04] transition-colors relative">
            <Bell size={17} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
          </button>
          <Button onClick={() => navigate('/criativos/novo')}>
            <Plus size={16} />
            Novo criativo
          </Button>
        </div>
      </div>

      {/* Hero: Score + AI Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 mb-6">
        <div className="rounded-3xl bg-accent/[0.08] border border-line/[0.1] p-7 flex flex-col justify-between min-h-[200px] relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-line/[0.08] blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/70 mb-2">
              Net Production Score
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-display-2xl font-bold text-ink tracking-tight leading-none">
                {score}
              </span>
              <span className="text-display-md font-bold text-ink-faint leading-none">/100</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-line/[0.08] text-ink text-[11px] font-semibold">
                <TrendingUp size={12} />
                {stats.criativosProntos} prontos
              </div>
              <span className="text-label text-ink/60">
                de {totalCriativos} criativos
              </span>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-3 mt-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/60">Ideias</p>
              <p className="text-heading-md font-bold text-ink mt-0.5">{totalIdeias}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/60">Criativos</p>
              <p className="text-heading-md font-bold text-ink mt-0.5">{totalCriativos}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/60">Agendados</p>
              <p className="text-heading-md font-bold text-ink mt-0.5">{stats.agendadosSemana}</p>
            </div>
          </div>
        </div>

        <AIInsightCard tone="lavender">
          Você tem <strong>{ideiaSemConteudo} ideia{ideiaSemConteudo !== 1 ? 's' : ''} sem carrossel</strong> criado.
          Que tal transformar a próxima em conteúdo agora?
          <div className="mt-4">
            <button
              onClick={() => navigate('/categorias')}
              className="inline-flex items-center gap-1 text-label font-semibold text-ink hover:text-ink transition-colors"
            >
              <Sparkles size={13} />
              Gerar com Claude
              <ChevronRight size={13} />
            </button>
          </div>
        </AIInsightCard>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Ideias"
          value={totalIdeias}
          unit="no acervo"
          icon={<Lightbulb size={16} />}
          tone="white"
        />
        <StatCard
          label="Criativos prontos"
          value={stats.criativosProntos}
          unit={`/ ${totalCriativos}`}
          icon={<Palette size={16} />}
          tone="white"
          description="prontos para publicar"
        />
        <StatCard
          label="Agendados"
          value={stats.agendadosSemana}
          unit="posts"
          icon={<Calendar size={16} />}
          tone="white"
          description="essa semana"
        />
        <StatCard
          label="Tarefas pendentes"
          value={stats.todosPendentes}
          unit="restantes"
          icon={<CheckCircle2 size={16} />}
          tone="white"
        />
      </div>

      {/* Performance + Próximas publicações */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6 mb-10">
        <div className="rounded-3xl bg-surface border border-line/[0.12] p-6">
          <SectionHeader title="Status dos criativos" subtitle="Distribuição por etapa" />
          <div className="flex items-center gap-6 mt-4">
            <DonutChart
              segments={statusSegments}
              size={150}
              thickness={26}
              centerLabel={
                <div className="text-center">
                  <p className="text-heading-lg font-bold text-ink leading-none">{totalCriativos}</p>
                  <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider mt-1">Total</p>
                </div>
              }
            />
            <div className="flex flex-col gap-2 flex-1">
              {statusSegments.length === 0 ? (
                <p className="text-label text-ink-faint">Nenhum criativo ainda</p>
              ) : (
                statusSegments.map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                      <span className="text-label text-ink-muted">{s.label}</span>
                    </div>
                    <span className="text-label font-bold text-ink">{s.value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-surface border border-line/[0.12] p-6">
          <SectionHeader
            title="Próximas publicações"
            subtitle="Agendadas no seu calendário"
            action={
              <button
                onClick={() => navigate('/agenda')}
                className="text-label font-semibold text-ink hover:text-ink transition-colors flex items-center gap-1"
              >
                Ver agenda <ChevronRight size={13} />
              </button>
            }
          />

          {proximasPublicacoes.length === 0 ? (
            <p className="text-body-md text-ink-faint py-6 text-center">
              Nada agendado por enquanto.
            </p>
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              {proximasPublicacoes.map(({ agendamento, criativo, categoria }) => {
                const data = new Date(agendamento.data_publicacao)
                return (
                  <div
                    key={agendamento.id}
                    onClick={() => criativo && navigate(`/criativos/${criativo.id}`)}
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-line/[0.04] cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center w-12 h-14 rounded-xl bg-line/[0.04] border border-line/[0.08] flex-shrink-0">
                      <span className="text-[10px] font-bold uppercase text-ink-faint">
                        {data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-heading-sm font-bold text-ink leading-none">
                        {data.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-semibold text-ink truncate">
                        {criativo?.titulo ?? 'Criativo'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {categoria && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoria.cor }} />
                            <span className="text-label text-ink-muted">{categoria.nome}</span>
                          </div>
                        )}
                        <span className="text-ink-faint">·</span>
                        <span className="text-label text-ink-muted">
                          {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="warning" dot>Agendado</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tarefas */}
      <div className="rounded-3xl bg-surface border border-line/[0.12] p-6">
        <SectionHeader
          title="Tarefas para hoje"
          subtitle={`${stats.todosPendentes} pendente${stats.todosPendentes === 1 ? '' : 's'}`}
          action={
            <button
              onClick={() => navigate('/todos')}
              className="text-label font-semibold text-ink hover:text-ink transition-colors flex items-center gap-1"
            >
              Ver todas <ChevronRight size={13} />
            </button>
          }
        />

        {top3Todos.length === 0 ? (
          <p className="text-body-md text-ink-faint py-4 text-center">Nenhuma tarefa pendente.</p>
        ) : (
          <div className="flex flex-col gap-2 mt-3">
            {top3Todos.map((todo) => {
              const prazoData = todo.prazo ? new Date(todo.prazo) : null
              const hoje = new Date()
              const diffDias = prazoData
                ? Math.ceil((prazoData.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
                : null
              const prioridadeVariant =
                todo.prioridade === 'alta' ? 'alert' : todo.prioridade === 'media' ? 'cyan' : 'neutral'

              return (
                <div
                  key={todo.id}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-line/[0.04] transition-colors"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-line/[0.12] flex-shrink-0" />
                  <p className="flex-1 text-body-md font-medium text-ink">{todo.titulo}</p>
                  {diffDias !== null && (
                    <span
                      className={`text-label ${diffDias <= 1 ? 'text-accent font-semibold' : 'text-ink-muted'}`}
                    >
                      {diffDias === 0 ? 'hoje' : diffDias === 1 ? 'amanhã' : `em ${diffDias} dias`}
                    </span>
                  )}
                  <Badge variant={prioridadeVariant} dot>
                    {todo.prioridade === 'alta' ? 'Alta' : todo.prioridade === 'media' ? 'Média' : 'Baixa'}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
