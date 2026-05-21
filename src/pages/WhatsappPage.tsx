import { useState } from 'react'
import { MessageCircle, User, Bot, CheckCheck, AlertCircle, Clock, RefreshCw, Save, ChevronRight, X } from 'lucide-react'
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

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function WhatsappPage() {
  const { conversas, configs, loading, mensagensDeConversa, atualizarConfig, atualizarStatus, recarregar } = useWhatsapp()
  const toast = useToast()

  const [tab, setTab] = useState<'conversas' | 'configurar'>('conversas')
  const [conversaAberta, setConversaAberta] = useState<WhatsappConversa | null>(null)
  const [mensagens, setMensagens] = useState<WhatsappMensagem[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const [editSystemPrompt, setEditSystemPrompt] = useState<string | null>(null)
  const [editBaseConhecimento, setEditBaseConhecimento] = useState<string | null>(null)
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  const ativas = conversas.filter((c) => c.status === 'ativo').length
  const escaladas = conversas.filter((c) => c.status === 'escalado').length

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

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Coluna principal */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-xl font-bold text-ink">WhatsApp</h1>
            <p className="text-body-md text-ink-muted mt-1">
              Agente Attack · {loading ? '…' : `${conversas.length} conversas`}
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
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: conversas.length, icon: <MessageCircle size={16} /> },
              { label: 'Ativas', value: ativas, icon: <CheckCheck size={16} /> },
              { label: 'Escaladas', value: escaladas, icon: <AlertCircle size={16} /> },
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

        {/* Tabs */}
        <div className="flex gap-1 border-b border-line/[0.08]">
          {(['conversas', 'configurar'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-body-sm font-medium transition-colors capitalize border-b-2 -mb-px ${
                tab === t
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {t === 'conversas' ? 'Conversas' : 'Configurar Agente'}
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
                  Quando alguém enviar uma mensagem para o seu número, ela aparecerá aqui.
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
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-body-md font-semibold text-ink truncate">
                          {c.nome_contato ?? c.telefone}
                        </span>
                        <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
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

        {/* Tab Configurar */}
        {tab === 'configurar' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-label font-semibold text-ink-muted uppercase tracking-wide">
                System Prompt do Agente
              </label>
              <p className="text-[12px] text-ink-faint mb-1">
                Personalidade, escopo e regras do Attack. Alterações entram em vigor na próxima mensagem recebida.
              </p>
              <textarea
                rows={14}
                value={editSystemPrompt ?? configs['system_prompt'] ?? ''}
                onChange={(e) => setEditSystemPrompt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-line/[0.1] bg-surface text-body-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 resize-y font-mono transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label font-semibold text-ink-muted uppercase tracking-wide">
                Base de Conhecimento
              </label>
              <p className="text-[12px] text-ink-faint mb-1">
                FAQ e informações sobre o Social Attack. Injeta no prompt a cada mensagem.
              </p>
              <textarea
                rows={12}
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
              <p className="text-[10px] text-ink-faint">{conversaAberta.telefone}</p>
            </div>
            <Badge variant={STATUS_VARIANT[conversaAberta.status]}>{STATUS_LABEL[conversaAberta.status]}</Badge>
            <button
              onClick={() => setConversaAberta(null)}
              className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-line/[0.08] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

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
                    <p className="text-body-sm leading-relaxed">{m.conteudo}</p>
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
