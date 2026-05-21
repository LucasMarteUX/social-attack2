import { useState, useEffect, useRef } from 'react'
import {
  MessageCircle, User, Bot, CheckCheck, AlertCircle, Clock, RefreshCw, Save,
  ChevronRight, X, TrendingUp, ShoppingCart, ArrowRight, Trophy, Upload,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import { useWhatsapp } from '../hooks/useWhatsapp'
import type { WhatsappConversa, WhatsappMensagem } from '../hooks/useWhatsapp'
import { useToast } from '../components/ui/Toast'

const STATUS_LABEL: Record<WhatsappConversa['status'], string> = {
  ativo: 'Ativo',
  escalado: 'Escalado',
  encerrado: 'Encerrado',
}

const STATUS_VARIANT: Record<WhatsappConversa['status'], 'success' | 'alert' | 'neutral'> = {
  ativo: 'success',
  escalado: 'alert',
  encerrado: 'neutral',
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

function LabelBadge({ label }: { label: string | null }) {
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-100">
      🔴 Atendimento humano
    </span>
  )
}

export default function WhatsappPage() {
  const { conversas, configs, loading, mensagensDeConversa, subscribeToMensagens, atualizarConfig, atualizarStatus, moverPipeline, recarregar } = useWhatsapp()
  const toast = useToast()

  const [tab, setTab] = useState<'conversas' | 'pipeline' | 'configurar'>('conversas')
  const [conversaAberta, setConversaAberta] = useState<WhatsappConversa | null>(null)
  const [mensagens, setMensagens] = useState<WhatsappMensagem[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const mensagensEndRef = useRef<HTMLDivElement>(null)

  const [editSystemPrompt, setEditSystemPrompt] = useState<string | null>(null)
  const [editBaseConhecimento, setEditBaseConhecimento] = useState<string | null>(null)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const uploadPromptRef = useRef<HTMLInputElement>(null)
  const uploadBaseRef = useRef<HTMLInputElement>(null)

  const ativas = conversas.filter((c) => c.status === 'ativo').length
  const escaladas = conversas.filter((c) => c.status === 'escalado').length
  const leads = conversas.filter((c) => c.tipo_contato === 'venda').length
  const precisamAtendimento = conversas.filter((c) => c.label === 'PRECISA_ATENDIMENTO_HUMANO').length

  const conversasVenda = conversas.filter((c) => c.tipo_contato === 'venda')
  const pipelinePorEtapa = (etapa: WhatsappConversa['etapa_pipeline']) =>
    conversasVenda.filter((c) => c.etapa_pipeline === etapa)

  async function abrirConversa(c: WhatsappConversa) {
    setConversaAberta(c)
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
      await atualizarStatus(c.id, 'encerrado')
      if (conversaAberta?.id === c.id) setConversaAberta({ ...c, status: 'encerrado' })
      toast.success('Conversa encerrada.')
    } catch {
      toast.error('Erro ao encerrar conversa.')
    }
  }

  async function handleMoverPipeline(conversaId: string, etapa: WhatsappConversa['etapa_pipeline']) {
    try {
      await moverPipeline(conversaId, etapa)
      if (conversaAberta?.id === conversaId) setConversaAberta({ ...conversaAberta, etapa_pipeline: etapa })
      toast.success(`Movido para "${PIPELINE_ETAPAS.find((e) => e.key === etapa)?.label}".`)
    } catch {
      toast.error('Erro ao mover no pipeline.')
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

  // Realtime — novas mensagens na conversa aberta chegam sem refresh
  useEffect(() => {
    if (!conversaAberta) return
    const unsub = subscribeToMensagens(conversaAberta.id, (nova) => {
      setMensagens((prev) => prev.some((m) => m.id === nova.id) ? prev : [...prev, nova])
    })
    return unsub
  }, [conversaAberta?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sincroniza conversaAberta quando conversa é atualizada via realtime
  useEffect(() => {
    if (!conversaAberta) return
    const atualizada = conversas.find((c) => c.id === conversaAberta.id)
    if (atualizada) setConversaAberta(atualizada)
  }, [conversas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll automático ao final das mensagens
  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

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
    <div className="flex gap-6 h-full min-h-0">
      {/* Coluna principal */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-xl font-bold text-ink">WhatsApp</h1>
            <p className="text-body-md text-ink-muted mt-1">
              Agente Spark · {loading ? '…' : `${conversas.length} conversas`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={recarregar}
              className="p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-line/[0.06] transition-colors"
              title="Recarregar"
            >
              <RefreshCw size={16} />
            </button>
            <Button onClick={() => setTab('configurar')} variant={tab === 'configurar' ? 'soft' : 'secondary'} size="sm">
              Configurar agente
            </Button>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Conversas', value: conversas.length, icon: <MessageCircle size={16} /> },
              { label: 'Ativas', value: ativas, icon: <CheckCheck size={16} /> },
              { label: 'Escaladas', value: escaladas, icon: <AlertCircle size={16} /> },
              { label: 'Leads de venda', value: leads, icon: <TrendingUp size={16} /> },
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
        )}

        {/* Alerta de atenção humana */}
        {precisamAtendimento > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl">
            <span className="text-red-500 shrink-0">🔴</span>
            <p className="text-body-sm text-red-700 font-medium">
              {precisamAtendimento} {precisamAtendimento === 1 ? 'contato precisa' : 'contatos precisam'} de atendimento humano urgente
            </p>
            <button
              onClick={() => setTab('conversas')}
              className="ml-auto text-[11px] text-red-500 underline font-medium"
            >
              Ver conversas
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-line/[0.08]">
          {([
            { key: 'conversas', label: 'Conversas' },
            { key: 'pipeline', label: 'Pipeline de Vendas' },
            { key: 'configurar', label: 'Configurar Agente' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-body-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Conversas */}
        {tab === 'conversas' && (
          <div className="flex-1 min-h-0">
            {loading ? (
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
                  <button
                    key={c.id}
                    onClick={() => abrirConversa(c)}
                    className={`w-full text-left bg-surface border rounded-2xl p-4 flex items-center gap-4 hover:border-line/[0.18] transition-colors ${
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
                        <TipoContactoBadge tipo={c.tipo_contato} />
                        <LabelBadge label={c.label} />
                      </div>
                      <p className="text-[11px] text-ink-faint">
                        {c.total_mensagens} mensagens · {formatDate(c.ultima_mensagem_at)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-ink-faint shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Pipeline */}
        {tab === 'pipeline' && (
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : conversasVenda.length === 0 ? (
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
              <div className="grid grid-cols-3 gap-4">
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
                                    onClick={() => handleMoverPipeline(c.id, etapa.key === 'lead' ? 'em_andamento' : 'fechado')}
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

      {/* Drawer lateral — histórico */}
      {conversaAberta && (
        <div className="w-96 shrink-0 flex flex-col bg-surface border border-line/[0.08] rounded-2xl overflow-hidden">
          {/* Header drawer */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line/[0.08]">
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
            <Badge variant={STATUS_VARIANT[conversaAberta.status]}>{STATUS_LABEL[conversaAberta.status]}</Badge>
            <button
              onClick={() => setConversaAberta(null)}
              className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-line/[0.08] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Pipeline selector (só para venda) */}
          {conversaAberta.tipo_contato === 'venda' && (
            <div className="px-4 py-3 border-b border-line/[0.08] flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-ink-faint font-medium uppercase tracking-wide">Pipeline:</span>
              {PIPELINE_ETAPAS.map((etapa) => (
                <button
                  key={etapa.key}
                  onClick={() => handleMoverPipeline(conversaAberta.id, etapa.key)}
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
          )}

          {/* Alerta label */}
          {conversaAberta.label === 'PRECISA_ATENDIMENTO_HUMANO' && (
            <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-[11px] text-red-600 font-semibold">🔴 Solicitou atendimento humano 2× — prioridade alta</p>
            </div>
          )}

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {loadingMsgs ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : mensagens.length === 0 ? (
              <p className="text-center text-body-sm text-ink-faint py-10">Nenhuma mensagem.</p>
            ) : (
              mensagens.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    m.role === 'user' ? 'bg-line/[0.08]' : 'bg-accent/[0.15]'
                  }`}>
                    {m.role === 'user'
                      ? <User size={11} className="text-ink-muted" />
                      : <Bot size={11} className="text-accent" />
                    }
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                    m.role === 'user'
                      ? 'bg-surface-2 text-ink rounded-tl-sm'
                      : 'bg-accent/[0.12] text-ink rounded-tr-sm'
                  }`}>
                    <p className="text-body-sm leading-relaxed whitespace-pre-wrap">{m.conteudo}</p>
                    <p className="text-[10px] text-ink-faint mt-1">{formatHora(m.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Ações */}
          {conversaAberta.status !== 'encerrado' && (
            <div className="p-3 border-t border-line/[0.08]">
              <div className="flex gap-2">
                {conversaAberta.status === 'escalado' && (
                  <Button
                    variant="soft"
                    size="sm"
                    className="flex-1"
                    onClick={() => { atualizarStatus(conversaAberta.id, 'ativo'); setConversaAberta({ ...conversaAberta, status: 'ativo' }) }}
                  >
                    <CheckCheck size={14} />
                    Reativar agente
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => encerrarConversa(conversaAberta)}
                >
                  <Clock size={14} />
                  Encerrar conversa
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
