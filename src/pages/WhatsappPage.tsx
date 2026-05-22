import { useState, useEffect, useRef } from 'react'
import {
  MessageCircle, User, Bot, CheckCheck, AlertCircle, Clock, RefreshCw, Save,
  ChevronRight, X, TrendingUp, ShoppingCart, ArrowRight, Trophy, Upload, ArrowLeft,
  Send, Headset,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import { useWhatsapp } from '../hooks/useWhatsapp'
import type { WhatsappConversa, WhatsappMensagem } from '../hooks/useWhatsapp'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/Toast'

const STATUS_LABEL: Record<WhatsappConversa['status'], string> = {
  ativo: 'Ativo',
  escalado: 'Escalado',
  encerrado: 'Encerrado',
  manual: 'Humano',
}

const STATUS_VARIANT: Record<WhatsappConversa['status'], 'success' | 'alert' | 'neutral' | 'cyan'> = {
  ativo: 'success',
  escalado: 'alert',
  encerrado: 'neutral',
  manual: 'cyan',
}

const PIPELINE_ETAPAS: { key: WhatsappConversa['etapa_pipeline']; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'lead', label: 'Lead', icon: <TrendingUp size={14} />, color: 'text-blue-500 bg-blue-50 border-blue-100' },
  { key: 'em_andamento', label: 'Em andamento', icon: <ShoppingCart size={14} />, color: 'text-amber-500 bg-amber-50 border-amber-100' },
  { key: 'fechado', label: 'Fechado', icon: <Trophy size={14} />, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
]

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function TipoContactoBadge({ tipo }: { tipo: WhatsappConversa['tipo_contato'] }) {
  if (!tipo) return null
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
      tipo === 'venda'
        ? 'bg-purple-50 text-purple-600 border border-purple-100'
        : 'bg-sky-50 text-sky-600 border border-sky-100'
    }`}>
      {tipo === 'venda' ? '💰 Venda' : '💬 Dúvida'}
    </span>
  )
}

function nomeAtendenteDisplay(email: string | undefined): string {
  const raw = email?.split('@')[0]?.trim()
  if (!raw) return 'Atendente'
  const spaced = raw.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!spaced) return 'Atendente'
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

function LabelBadge({ label }: { label: string | null }) {
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-100">
      🔴 Atendimento humano
    </span>
  )
}

function MensagemBubble({ mensagem }: { mensagem: WhatsappMensagem }) {
  if (mensagem.role === 'divider') {
    const nome = mensagem.conteudo.trim() || 'Atendente'
    return (
      <div className="flex items-center gap-3 py-2 max-w-[min(100%,24rem)] mx-auto">
        <div className="flex-1 h-px bg-line/[0.12]" aria-hidden />
        <span className="text-[10px] text-ink-muted text-center shrink-0 font-medium px-1">
          Você está falando com{' '}
          <span className="text-accent font-semibold">{nome}</span>
        </span>
        <div className="flex-1 h-px bg-line/[0.12]" aria-hidden />
      </div>
    )
  }

  const isCliente = mensagem.role === 'user'
  const isHumano = mensagem.role === 'humano'
  const linhaClasse = isCliente ? 'flex-row' : 'flex-row-reverse'

  let avatarEnv = 'bg-accent/[0.15]'
  let IconComp: typeof Bot = Bot
  let iconClass = 'text-accent'
  if (isCliente) {
    avatarEnv = 'bg-line/[0.08]'
    IconComp = User
    iconClass = 'text-ink-muted'
  }
  if (isHumano) {
    avatarEnv = 'bg-teal-600/18'
    IconComp = Headset
    iconClass = 'text-teal-600 dark:text-teal-400'
  }

  let bubble = 'bg-accent/[0.12] text-ink rounded-tr-sm border border-accent/10'
  if (isCliente) bubble = 'bg-surface-2 text-ink rounded-tl-sm'
  else if (isHumano) bubble = 'bg-teal-900/25 text-ink rounded-tr-sm border border-teal-500/25'

  return (
    <div className={`flex gap-2 ${linhaClasse}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${avatarEnv}`}>
        <IconComp size={11} className={iconClass} />
      </div>
      <div className={`max-w-[min(88vw,20rem)] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 ${bubble}`}>
        <p className="text-body-sm leading-relaxed whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
        <p className="text-[10px] text-ink-faint mt-1">{formatHora(mensagem.created_at)}</p>
      </div>
    </div>
  )
}

export default function WhatsappPage() {
  const { user } = useAuth()
  const {
    conversas,
    configs,
    loading,
    mensagensDeConversa,
    subscribeToMensagens,
    atualizarConfig,
    atualizarStatus,
    classificarLead,
    recarregar,
    assumirAtendimento,
    enviarMensagemHumana,
    voltarParaAutomatico,
    encerrarConversaManual,
  } = useWhatsapp()
  const toast = useToast()

  const [tab, setTab] = useState<'conversas' | 'pipeline' | 'configurar'>('conversas')
  const [conversaAberta, setConversaAberta] = useState<WhatsappConversa | null>(null)
  const [mensagens, setMensagens] = useState<WhatsappMensagem[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [rascunhoMsg, setRascunhoMsg] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const [assumindo, setAssumindo] = useState(false)
  const mensagensEndRef = useRef<HTMLDivElement>(null)

  const [editSystemPrompt, setEditSystemPrompt] = useState<string | null>(null)
  const [editBaseConhecimento, setEditBaseConhecimento] = useState<string | null>(null)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const uploadPromptRef = useRef<HTMLInputElement>(null)
  const uploadBaseRef = useRef<HTMLInputElement>(null)

  const ativas = conversas.filter((c) => c.status === 'ativo').length
  const escaladas = conversas.filter((c) => c.status === 'escalado').length
  const modoHumano = conversas.filter((c) => c.status === 'manual').length
  const leads = conversas.filter((c) => c.etapa_pipeline !== null).length
  const precisamAtendimento = conversas.filter((c) => c.label === 'PRECISA_ATENDIMENTO_HUMANO').length

  const conversasComPipeline = conversas.filter((c) => c.etapa_pipeline !== null)
  const pipelinePorEtapa = (etapa: WhatsappConversa['etapa_pipeline']) =>
    conversasComPipeline.filter((c) => c.etapa_pipeline === etapa)

  async function abrirConversa(c: WhatsappConversa) {
    setConversaAberta(c)
    setRascunhoMsg('')
    setLoadingMsgs(true)
    try {
      const msgs = await mensagensDeConversa(c.id)
      setMensagens(msgs)
    } catch {
      toast.error('Erro ao carregar mensagens.')
    } finally {
      setLoadingMsgs(false)
    }
  }

  async function encerrarConversa(c: WhatsappConversa) {
    try {
      await encerrarConversaManual(c.id, c.telefone)
      if (conversaAberta?.id === c.id) {
        setConversaAberta({ ...c, status: 'encerrado' })
        setMensagens(await mensagensDeConversa(c.id))
      }
      toast.success('Cliente avisado no WhatsApp. Novo contato reabre o fluxo com a IA.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao encerrar conversa.')
    }
  }

  async function handleAssumirAtendimento() {
    if (!conversaAberta || conversaAberta.status === 'manual' || conversaAberta.status === 'encerrado') return
    const nome = nomeAtendenteDisplay(user?.email)
    setAssumindo(true)
    try {
      await assumirAtendimento(conversaAberta.id, conversaAberta.telefone, nome)
      setConversaAberta({ ...conversaAberta, status: 'manual' })
      setMensagens(await mensagensDeConversa(conversaAberta.id))
      toast.success(`Atendimento humano iniciado (${nome}).`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível assumir o atendimento.')
    } finally {
      setAssumindo(false)
    }
  }

  async function handleEnviarMensagemCliente() {
    if (!conversaAberta || conversaAberta.status !== 'manual') return
    const t = rascunhoMsg.trim()
    if (!t) return
    setEnviandoMsg(true)
    try {
      await enviarMensagemHumana(conversaAberta.id, conversaAberta.telefone, t)
      setRascunhoMsg('')
      setMensagens(await mensagensDeConversa(conversaAberta.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao enviar a mensagem.')
    } finally {
      setEnviandoMsg(false)
    }
  }

  async function handleVoltarAgente() {
    if (!conversaAberta || conversaAberta.status !== 'manual') return
    try {
      await voltarParaAutomatico(conversaAberta.id, conversaAberta.telefone)
      setConversaAberta({ ...conversaAberta, status: 'ativo' })
      setMensagens(await mensagensDeConversa(conversaAberta.id))
      toast.success('Spark voltou a responder automaticamente.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível reativar o agente.')
    }
  }

  async function handleClassificarLead(conversaId: string, etapa: WhatsappConversa['etapa_pipeline']) {
    try {
      await classificarLead(conversaId, etapa)
      const labels: Record<string, string> = { lead: 'Lead', em_andamento: 'Em andamento', fechado: 'Fechado' }
      toast.success(etapa ? `Classificado como ${labels[etapa]}.` : 'Removido do pipeline.')
    } catch {
      toast.error('Erro ao classificar contato.')
    }
  }

  async function salvarConfig() {
    setSalvandoConfig(true)
    try {
      if (editSystemPrompt !== null) await atualizarConfig('system_prompt', editSystemPrompt)
      if (editBaseConhecimento !== null) await atualizarConfig('base_conhecimento', editBaseConhecimento)
      setEditSystemPrompt(null)
      setEditBaseConhecimento(null)
      toast.success('Configurações salvas. O agente já usa as novas regras.')
    } catch {
      toast.error('Erro ao salvar configurações.')
    } finally {
      setSalvandoConfig(false)
    }
  }

  const temAlteracoes = editSystemPrompt !== null || editBaseConhecimento !== null

  // Mescla mensagens vindas da API mantendo ordenação estável pelo id (evita “piscar”).
  function mesclarMensagens(anteriores: WhatsappMensagem[], seguintes: WhatsappMensagem[]) {
    const map = new Map<string, WhatsappMensagem>()
    for (const m of seguintes) map.set(m.id, m)
    for (const m of anteriores) {
      if (!map.has(m.id)) map.set(m.id, m)
    }
    return [...map.values()].sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  // Realtime + sincronização periódica (fallback quando a publicação Realtime não recebe INSERT)
  useEffect(() => {
    if (!conversaAberta) return
    const id = conversaAberta.id
    let cancel = false

    async function sincronizar() {
      try {
        const atual = await mensagensDeConversa(id)
        if (cancel) return
        setMensagens((prev) => mesclarMensagens(prev, atual))
      } catch {
        //
      }
    }

    const unsub = subscribeToMensagens(id, (nova) => {
      setMensagens((prev) => (prev.some((m) => m.id === nova.id) ? prev : [...prev, nova]))
    })

    void sincronizar()
    const t = window.setInterval(sincronizar, 3500)

    return () => {
      cancel = true
      unsub()
      window.clearInterval(t)
    }
  }, [conversaAberta?.id, mensagensDeConversa, subscribeToMensagens])

  // Sincroniza conversaAberta quando conversa é atualizada via realtime
  useEffect(() => {
    if (!conversaAberta) return
    const atualizada = conversas.find((c) => c.id === conversaAberta.id)
    if (atualizada) setConversaAberta(atualizada)
  }, [conversas]) // eslint-disable-line react-hooks/exhaustive-deps

  const ultimoIdMensagem = mensagens[mensagens.length - 1]?.id
  useEffect(() => {
    if (!ultimoIdMensagem) return
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ultimoIdMensagem])

  function handleUploadMd(campo: 'system_prompt' | 'base_conhecimento', file: File | null) {
    if (!file || !file.name.endsWith('.md')) {
      toast.error('Selecione um arquivo .md válido.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const conteudo = e.target?.result as string
      if (campo === 'system_prompt') setEditSystemPrompt(conteudo)
      else setEditBaseConhecimento(conteudo)
      toast.success(`Arquivo "${file.name}" carregado. Clique em Salvar para aplicar.`)
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 min-h-0 w-full">
      {/* Coluna principal */}
      <div className={`flex-1 min-w-0 flex-col gap-4 sm:gap-6 ${conversaAberta ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-heading-xl font-bold text-ink">WhatsApp</h1>
            <p className="text-body-md text-ink-muted mt-1">
              Agente Spark · {loading ? '…' : `${conversas.length} conversas`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={recarregar}
              className="p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-line/[0.06] transition-colors"
              title="Recarregar"
            >
              <RefreshCw size={16} />
            </button>
            <Button onClick={() => setTab('configurar')} variant={tab === 'configurar' ? 'soft' : 'secondary'} size="sm">
              <span className="hidden sm:inline">Configurar agente</span>
              <span className="sm:hidden">Config.</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Conversas', value: conversas.length, icon: <MessageCircle size={16} /> },
            { label: 'Ativas', value: ativas, icon: <CheckCheck size={16} /> },
            { label: 'Escaladas', value: escaladas, icon: <AlertCircle size={16} /> },
            { label: 'Humano', value: modoHumano, icon: <Headset size={16} /> },
            { label: 'Leads', value: leads, icon: <TrendingUp size={16} /> },
          ].map((s) => (
            <div key={s.label} className="bg-surface border border-line/[0.08] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-line/[0.06] flex items-center justify-center text-ink-muted">
                {s.icon}
              </div>
              <div>
                <p className="text-heading-sm font-bold text-ink">{s.value}</p>
                <p className="text-[11px] text-ink-faint">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Alerta de atenção humana */}
        {precisamAtendimento > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl">
            <span className="text-red-500 shrink-0">🔴</span>
            <p className="text-body-sm text-red-700 font-medium flex-1 min-w-0">
              {precisamAtendimento} {precisamAtendimento === 1 ? 'contato precisa' : 'contatos precisam'} de atendimento humano urgente
            </p>
            <button
              type="button"
              onClick={() => setTab('conversas')}
              className="sm:ml-auto self-start sm:self-auto text-[11px] text-red-500 underline font-medium whitespace-nowrap"
            >
              Ver conversas
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-line/[0.08] overflow-x-auto">
          {([
            { key: 'conversas', label: 'Conversas', labelMobile: 'Conversas' },
            { key: 'pipeline', label: 'Pipeline de Vendas', labelMobile: 'Pipeline' },
            { key: 'configurar', label: 'Configurar Agente', labelMobile: 'Configurar' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 sm:px-4 py-2.5 text-body-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === t.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <span className="sm:hidden">{t.labelMobile}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Conversas */}
        {tab === 'conversas' && (
          <div className="flex-1 min-h-0">
            {loading && conversas.length === 0 ? (
              <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : conversas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-14 rounded-2xl bg-line/[0.06] flex items-center justify-center mb-4">
                  <MessageCircle size={24} className="text-ink-faint" />
                </div>
                <p className="text-heading-sm font-semibold text-ink mb-1">Nenhuma conversa ainda</p>
                <p className="text-body-md text-ink-muted max-w-xs">
                  Quando alguém enviar uma mensagem, ela aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {conversas.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => abrirConversa(c)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && abrirConversa(c)}
                    className={`w-full text-left bg-surface border rounded-2xl p-4 flex items-center gap-4 hover:border-line/[0.18] transition-colors cursor-pointer ${
                      conversaAberta?.id === c.id ? 'border-accent/30 bg-accent/[0.04]' : 'border-line/[0.08]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-line/[0.08] flex items-center justify-center shrink-0">
                      <User size={18} className="text-ink-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-body-md font-semibold text-ink truncate">
                          {c.nome_contato ?? c.telefone}
                        </span>
                        <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                        <LabelBadge label={c.label} />
                      </div>
                      <p className="text-[11px] text-ink-faint">
                        {c.total_mensagens} mensagens · {formatDate(c.ultima_mensagem_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={c.etapa_pipeline ?? ''}
                        onChange={(e) => handleClassificarLead(c.id, (e.target.value || null) as WhatsappConversa['etapa_pipeline'])}
                        className={`text-[10px] font-semibold rounded-full border px-2 sm:px-2.5 py-1 outline-none cursor-pointer transition-colors ${
                          c.etapa_pipeline === 'lead'
                            ? 'text-blue-600 bg-blue-50 border-blue-100'
                            : c.etapa_pipeline === 'em_andamento'
                            ? 'text-amber-600 bg-amber-50 border-amber-100'
                            : c.etapa_pipeline === 'fechado'
                            ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                            : 'text-ink-faint bg-transparent border-line/[0.1]'
                        }`}
                      >
                        <option value="">Comum</option>
                        <option value="lead">Lead</option>
                        <option value="em_andamento">Andamento</option>
                        <option value="fechado">Fechado</option>
                      </select>
                      <ChevronRight size={16} className="hidden sm:block text-ink-faint" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Pipeline */}
        {tab === 'pipeline' && (
          <div className="flex-1 min-h-0">
            {loading && conversasComPipeline.length === 0 ? (
              <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : conversasComPipeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-14 rounded-2xl bg-line/[0.06] flex items-center justify-center mb-4">
                  <TrendingUp size={24} className="text-ink-faint" />
                </div>
                <p className="text-heading-sm font-semibold text-ink mb-1">Nenhum lead ainda</p>
                <p className="text-body-md text-ink-muted max-w-xs">
                  Quando alguém no WhatsApp escolher "Quero conhecer os planos", aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PIPELINE_ETAPAS.map((etapa) => {
                  const cards = pipelinePorEtapa(etapa.key)
                  return (
                    <div key={etapa.key} className="flex flex-col gap-3">
                      {/* Cabeçalho da coluna */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${etapa.color}`}>
                        {etapa.icon}
                        <span className="text-body-sm font-semibold">{etapa.label}</span>
                        <span className="ml-auto text-[11px] font-bold opacity-60">{cards.length}</span>
                      </div>

                      {/* Cards */}
                      <div className="flex flex-col gap-2">
                        {cards.length === 0 ? (
                          <p className="text-[11px] text-ink-faint text-center py-6">Nenhum contato aqui</p>
                        ) : (
                          cards.map((c) => (
                            <div
                              key={c.id}
                              className="bg-surface border border-line/[0.08] rounded-xl p-3 flex flex-col gap-2"
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-line/[0.08] flex items-center justify-center shrink-0">
                                  <User size={14} className="text-ink-muted" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-body-sm font-semibold text-ink truncate">
                                    {c.nome_contato ?? c.telefone}
                                  </p>
                                  <p className="text-[10px] text-ink-faint">{formatDate(c.ultima_mensagem_at)}</p>
                                </div>
                              </div>

                              {c.label && <LabelBadge label={c.label} />}

                              {/* Botões de avanço no pipeline */}
                              <div className="flex gap-1.5 flex-wrap">
                                <button
                                  onClick={() => abrirConversa(c)}
                                  className="text-[10px] text-ink-muted hover:text-ink underline"
                                >
                                  Ver conversa
                                </button>
                                {etapa.key !== 'fechado' && (
                                  <button
                                    onClick={() => handleClassificarLead(c.id, etapa.key === 'lead' ? 'em_andamento' : 'fechado')}
                                    className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-accent hover:opacity-80"
                                  >
                                    {etapa.key === 'lead' ? 'Em andamento' : 'Fechar venda'}
                                    <ArrowRight size={10} />
                                  </button>
                                )}
                                {etapa.key === 'fechado' && (
                                  <span className="ml-auto text-[10px] text-emerald-500 font-semibold">✓ Venda fechada</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Configurar */}
        {tab === 'configurar' && (
          <div className="flex flex-col gap-5">
            {/* System Prompt */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-label font-semibold text-ink-muted uppercase tracking-wide">
                  Regras do Agente (System Prompt)
                </label>
                <button
                  type="button"
                  onClick={() => uploadPromptRef.current?.click()}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:opacity-75 transition-opacity"
                >
                  <Upload size={12} />
                  Importar .md
                </button>
                <input
                  ref={uploadPromptRef}
                  type="file"
                  accept=".md"
                  className="hidden"
                  onChange={(e) => handleUploadMd('system_prompt', e.target.files?.[0] ?? null)}
                />
              </div>
              <p className="text-[12px] text-ink-faint mb-1">
                Identidade, escopo, escalação e regras do Spark. Alterações entram em vigor na próxima mensagem recebida.
              </p>
              <textarea
                rows={14}
                value={editSystemPrompt ?? configs['system_prompt'] ?? ''}
                onChange={(e) => setEditSystemPrompt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-line/[0.1] bg-surface text-body-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 resize-y font-mono transition-all"
              />
            </div>

            {/* Base de Conhecimento */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-label font-semibold text-ink-muted uppercase tracking-wide">
                  Base de Conhecimento
                </label>
                <button
                  type="button"
                  onClick={() => uploadBaseRef.current?.click()}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:opacity-75 transition-opacity"
                >
                  <Upload size={12} />
                  Importar .md
                </button>
                <input
                  ref={uploadBaseRef}
                  type="file"
                  accept=".md"
                  className="hidden"
                  onChange={(e) => handleUploadMd('base_conhecimento', e.target.files?.[0] ?? null)}
                />
              </div>
              <p className="text-[12px] text-ink-faint mb-1">
                FAQ e informações completas sobre o Social Attack. Injetadas no prompt a cada mensagem.
              </p>
              <textarea
                rows={16}
                value={editBaseConhecimento ?? configs['base_conhecimento'] ?? ''}
                onChange={(e) => setEditBaseConhecimento(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-line/[0.1] bg-surface text-body-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 resize-y font-mono transition-all"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={salvarConfig}
                disabled={!temAlteracoes || salvandoConfig}
                loading={salvandoConfig}
                size="md"
              >
                <Save size={15} />
                {salvandoConfig ? 'Salvando…' : 'Salvar configurações'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer lateral — full-screen mobile (safe areas), painel desktop */}
      {conversaAberta && (
        <div className="fixed inset-0 z-50 flex flex-col min-h-0 overflow-hidden bg-surface pt-[max(env(safe-area-inset-top),0px)] md:static md:inset-auto md:z-auto md:shrink-0 md:w-[min(100%,24rem)] md:overflow-hidden md:border md:border-line/[0.08] md:rounded-2xl md:pt-0">
          {/* Header drawer */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3.5 border-b border-line/[0.08]">
            {/* Botão voltar — apenas mobile */}
            <button
              type="button"
              onClick={() => {
                setConversaAberta(null)
                setRascunhoMsg('')
              }}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-ink-muted hover:text-ink hover:bg-line/[0.08] transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-line/[0.08] flex items-center justify-center shrink-0">
              <User size={15} className="text-ink-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-semibold text-ink truncate">
                {conversaAberta.nome_contato ?? conversaAberta.telefone}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <p className="text-[10px] text-ink-faint">{conversaAberta.telefone}</p>
                <TipoContactoBadge tipo={conversaAberta.tipo_contato} />
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[conversaAberta.status]} className="shrink-0 max-w-full truncate">
              {STATUS_LABEL[conversaAberta.status]}
            </Badge>
            {/* Botão fechar — apenas desktop */}
            <button
              type="button"
              onClick={() => {
                setConversaAberta(null)
                setRascunhoMsg('')
              }}
              className="hidden md:flex p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-line/[0.08] transition-colors shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* Pipeline selector */}
          <div className="border-b border-line/[0.08] flex-shrink-0">
            <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto touch-pan-x scrollbar-none">
            <span className="text-[10px] text-ink-faint font-medium uppercase tracking-wide shrink-0">Pipeline:</span>
            <button
              onClick={() => handleClassificarLead(conversaAberta.id, null)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                conversaAberta.etapa_pipeline === null
                  ? 'text-ink-faint bg-line/[0.06] border-line/[0.12]'
                  : 'text-ink-faint border-line/[0.1] hover:border-line/[0.2]'
              }`}
            >
              Usuário comum
            </button>
            {PIPELINE_ETAPAS.map((etapa) => (
              <button
                key={etapa.key}
                onClick={() => handleClassificarLead(conversaAberta.id, etapa.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                  conversaAberta.etapa_pipeline === etapa.key
                    ? etapa.color
                    : 'text-ink-faint border-line/[0.1] hover:border-line/[0.2]'
                }`}
              >
                {etapa.icon}
                {etapa.label}
              </button>
            ))}
            </div>
          </div>

          {/* Alerta label */}
          {conversaAberta.label === 'PRECISA_ATENDIMENTO_HUMANO' && (
            <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-[11px] text-red-600 font-semibold">🔴 Solicitou atendimento humano 2× — prioridade alta</p>
            </div>
          )}

          {/* Mensagens */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
            {loadingMsgs ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : mensagens.length === 0 ? (
              <p className="text-center text-body-sm text-ink-faint py-10">Nenhuma mensagem.</p>
            ) : (
              <>
                {mensagens.map((m) => (
                  <MensagemBubble key={m.id} mensagem={m} />
                ))}
                <div ref={mensagensEndRef} className="h-px shrink-0" aria-hidden />
              </>
            )}
          </div>

          {/* Ações: mobile-first — assumir / IA / mensagem ao cliente */}
          {conversaAberta.status !== 'encerrado' && (
            <div className="p-3 border-t border-line/[0.08] shrink-0 space-y-3 pb-[max(12px,env(safe-area-inset-bottom))] md:pb-3">
              {conversaAberta.status === 'manual' && (
                <>
                  <textarea
                    rows={3}
                    value={rascunhoMsg}
                    onChange={(e) => setRascunhoMsg(e.target.value)}
                    placeholder="Sua mensagem ao cliente via WhatsApp…"
                    disabled={enviandoMsg}
                    enterKeyHint="send"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void handleEnviarMensagemCliente()
                      }
                    }}
                    className="w-full min-h-[72px] max-h-48 px-3 py-3 rounded-xl border border-line/[0.1] bg-surface text-base sm:text-body-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent/40 resize-y touch-manipulation"
                  />
                  <Button
                    type="button"
                    size="md"
                    className="w-full justify-center gap-2 min-h-[48px]"
                    disabled={!rascunhoMsg.trim() || enviandoMsg}
                    loading={enviandoMsg}
                    onClick={() => void handleEnviarMensagemCliente()}
                  >
                    <Send size={17} strokeWidth={2} />
                    Enviar no WhatsApp
                  </Button>
                </>
              )}

              {conversaAberta.status !== 'manual' && (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    className="w-full justify-center gap-2 min-h-[48px]"
                    loading={assumindo}
                    disabled={assumindo}
                    onClick={() => void handleAssumirAtendimento()}
                  >
                    <Headset size={16} />
                    Assumir atendimento
                  </Button>
                  {conversaAberta.status === 'escalado' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="w-full justify-center gap-2 min-h-[44px]"
                      onClick={async () => {
                        try {
                          await atualizarStatus(conversaAberta.id, 'ativo')
                          setConversaAberta({ ...conversaAberta, status: 'ativo' })
                          toast.success('Agente Spark reativado.')
                        } catch {
                          toast.error('Erro ao reativar.')
                        }
                      }}
                    >
                      <CheckCheck size={15} />
                      Reativar Spark (IA)
                    </Button>
                  )}
                </div>
              )}

              {conversaAberta.status === 'manual' ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="ghost" size="sm" type="button" className="sm:flex-1 min-h-[44px] gap-2" onClick={() => void handleVoltarAgente()}>
                    <Bot size={15} />
                    Voltar ao Spark
                  </Button>
                  <Button variant="ghost" size="sm" type="button" className="sm:flex-1 min-h-[44px] gap-2" onClick={() => encerrarConversa(conversaAberta)}>
                    <Clock size={15} />
                    Encerrar conversa
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" type="button" className="w-full min-h-[44px]" onClick={() => encerrarConversa(conversaAberta)}>
                  <Clock size={15} />
                  Encerrar conversa
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
