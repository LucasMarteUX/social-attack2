# Continuação da implementação — Atendimento Humano via WhatsApp

## O que foi pedido
Implementar um fluxo de **takeover humano** no painel WhatsApp da plataforma Social Attack:

1. Atendente clica "Assumir atendimento" → sistema envia mensagem no WhatsApp informando o nome do atendente + exibe um **divider visual** na conversa
2. Conversa entra em **modo manual** → atendente digita e envia mensagens diretamente pela plataforma
3. Atendente pode clicar **"Voltar para atendimento automático"** → IA (Gemini/Spark) assume novamente
4. Atendente pode clicar **"Encerrar conversa"** → envia mensagem de encerramento + fecha a conversa

---

## O que já está FEITO ✅

### 1. Nova edge function: `supabase/functions/whatsapp-agent-send/index.ts` ✅
- **Criada do zero**
- Recebe `{ telefone, mensagem, delayTyping? }` via POST
- Chama Z-API `send-text` com as credenciais das env vars
- Usada para enviar mensagens do atendente humano sem expor tokens no frontend

### 2. `src/hooks/useWhatsapp.ts` ✅
- Tipos atualizados:
  - `WhatsappConversa.status` agora inclui `'manual'`
  - `WhatsappMensagem.role` agora inclui `'humano' | 'divider'`
- Novas funções adicionadas e exportadas:
  - `assumirAtendimento(conversaId, telefone, atendenteNome)` — muda status para 'manual', insere mensagem divider + mensagem de boas-vindas, chama edge function
  - `enviarMensagemHumana(conversaId, telefone, mensagem)` — insere mensagem com role 'humano', chama edge function
  - `voltarParaAutomatico(conversaId)` — muda status de volta para 'ativo'
  - `encerrarConversaManual(conversaId, telefone)` — envia mensagem de encerramento + muda status para 'encerrado'

### 3. `supabase/functions/whatsapp-webhook/index.ts` ✅
- Adicionado bloco após salvar mensagem do usuário:
  ```typescript
  if (conversa.status === 'manual') {
    // Só salva a msg do usuário, não chama Gemini
    await dbUpdate(...)
    return new Response('manual', { status: 200 })
  }
  ```

---

## O que FALTA fazer ❌

### 4. `src/pages/WhatsappPage.tsx` — NÃO INICIADO ❌

Este é o único arquivo que ainda precisa ser editado. O linter estava modificando o arquivo durante os edits e causando conflitos. **Fazer manualmente no Cursor.**

#### 4a. Adicionar imports (linha 1–11)
```tsx
// Adicionar 'Send' nos ícones lucide-react (já tem ArrowLeft, falta Send):
import {
  MessageCircle, User, Bot, CheckCheck, AlertCircle, Clock, RefreshCw, Save,
  ChevronRight, X, TrendingUp, ShoppingCart, ArrowRight, Trophy, Upload, ArrowLeft, Send,
} from 'lucide-react'

// Adicionar import do supabase (para auth.getUser):
import { supabase } from '../lib/supabase'
```

#### 4b. Atualizar STATUS_LABEL e STATUS_VARIANT (linha 13–23)
```tsx
const STATUS_LABEL: Record<WhatsappConversa['status'], string> = {
  ativo: 'Ativo',
  escalado: 'Escalado',
  encerrado: 'Encerrado',
  manual: 'Atendimento Humano',  // ADICIONAR
}

const STATUS_VARIANT: Record<WhatsappConversa['status'], 'success' | 'alert' | 'neutral'> = {
  ativo: 'success',
  escalado: 'alert',
  encerrado: 'neutral',
  manual: 'alert',  // ADICIONAR
}
```

#### 4c. Atualizar destructuring do hook (linha 63)
```tsx
const {
  conversas, configs, loading, mensagensDeConversa, subscribeToMensagens,
  atualizarConfig, atualizarStatus, classificarLead, recarregar,
  assumirAtendimento, enviarMensagemHumana, voltarParaAutomatico, encerrarConversaManual,  // ADICIONAR
} = useWhatsapp()
```

#### 4d. Adicionar estados e useEffect DENTRO do componente (após linha 76, antes dos cálculos)
```tsx
const [atendenteNome, setAtendenteNome] = useState('Atendente')
const [textoResposta, setTextoResposta] = useState('')
const [enviandoMensagem, setEnviandoMensagem] = useState(false)

// Carrega o nome do usuário logado para exibir no takeover
useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    if (data.user) {
      const nome =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email?.split('@')[0] ||
        'Atendente'
      setAtendenteNome(nome)
    }
  })
}, [])
```

#### 4e. Adicionar handlers DENTRO do componente (após a função `handleClassificarLead`)
```tsx
async function handleAssumir() {
  if (!conversaAberta) return
  try {
    await assumirAtendimento(conversaAberta.id, conversaAberta.telefone, atendenteNome)
    toast.success(`Você assumiu o atendimento como ${atendenteNome}.`)
  } catch {
    toast.error('Erro ao assumir atendimento.')
  }
}

async function handleEnviarManual() {
  if (!conversaAberta || !textoResposta.trim()) return
  setEnviandoMensagem(true)
  try {
    await enviarMensagemHumana(conversaAberta.id, conversaAberta.telefone, textoResposta.trim())
    setTextoResposta('')
  } catch {
    toast.error('Erro ao enviar mensagem.')
  } finally {
    setEnviandoMensagem(false)
  }
}

async function handleVoltarAutomatico() {
  if (!conversaAberta) return
  try {
    await voltarParaAutomatico(conversaAberta.id)
    toast.success('Atendimento devolvido ao Spark.')
  } catch {
    toast.error('Erro ao voltar para automático.')
  }
}

async function handleEncerrarManual() {
  if (!conversaAberta) return
  try {
    await encerrarConversaManual(conversaAberta.id, conversaAberta.telefone)
    toast.success('Conversa encerrada.')
  } catch {
    toast.error('Erro ao encerrar conversa.')
  }
}
```

#### 4f. Substituir o bloco de renderização de mensagens (dentro de `mensagens.map`)

Localizar o bloco atual (em torno da linha 576–596) e substituir por:
```tsx
mensagens.map((m) => {
  // Divider — separador visual do takeover humano
  if (m.role === 'divider') {
    return (
      <div key={m.id} className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-line/[0.1]" />
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-100">
          <User size={10} />
          Atendimento com {m.conteudo}
        </span>
        <div className="flex-1 h-px bg-line/[0.1]" />
      </div>
    )
  }

  // Mensagem do atendente humano
  if (m.role === 'humano') {
    return (
      <div key={m.id} className="flex gap-2 flex-row-reverse">
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-violet-100">
          <User size={11} className="text-violet-600" />
        </div>
        <div className="max-w-[75%] rounded-2xl px-3.5 py-2.5 bg-violet-50 text-ink rounded-tr-sm">
          <p className="text-body-sm leading-relaxed whitespace-pre-wrap">{m.conteudo}</p>
          <p className="text-[10px] text-ink-faint mt-1">{formatHora(m.created_at)}</p>
        </div>
      </div>
    )
  }

  // Mensagem padrão (user / agent)
  return (
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
  )
})
```

#### 4g. Substituir o bloco "Ações" no final do drawer (em torno das linhas 599–625)

Localizar:
```tsx
{/* Ações */}
{conversaAberta.status !== 'encerrado' && (
  <div className="p-3 border-t border-line/[0.08]">
    ...
  </div>
)}
```

Substituir por:
```tsx
{/* Ações — modo manual: input + botões */}
{conversaAberta.status === 'manual' && (
  <div className="p-3 border-t border-line/[0.08] flex flex-col gap-2">
    <textarea
      value={textoResposta}
      onChange={(e) => setTextoResposta(e.target.value)}
      placeholder="Digite sua resposta..."
      rows={2}
      className="w-full px-3 py-2.5 rounded-xl border border-line/[0.1] bg-surface text-body-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent/40 resize-none"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleEnviarManual()
        }
      }}
    />
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" className="flex-1" onClick={handleVoltarAutomatico}>
        <Bot size={14} />
        Voltar automático
      </Button>
      <Button variant="ghost" size="sm" onClick={handleEncerrarManual}>
        <Clock size={14} />
        Encerrar
      </Button>
      <Button
        size="sm"
        disabled={!textoResposta.trim() || enviandoMensagem}
        loading={enviandoMensagem}
        onClick={handleEnviarManual}
      >
        <Send size={14} />
        Enviar
      </Button>
    </div>
  </div>
)}

{/* Ações — conversa escalada: assumir ou encerrar */}
{conversaAberta.status === 'escalado' && (
  <div className="p-3 border-t border-line/[0.08] flex gap-2">
    <Button variant="soft" size="sm" className="flex-1" onClick={handleAssumir}>
      <User size={14} />
      Assumir atendimento
    </Button>
    <Button variant="ghost" size="sm" onClick={() => encerrarConversa(conversaAberta)}>
      <Clock size={14} />
      Encerrar
    </Button>
  </div>
)}

{/* Ações — conversa ativa (IA): só encerrar */}
{conversaAberta.status === 'ativo' && (
  <div className="p-3 border-t border-line/[0.08]">
    <Button variant="ghost" size="sm" className="w-full" onClick={() => encerrarConversa(conversaAberta)}>
      <Clock size={14} />
      Encerrar conversa
    </Button>
  </div>
)}
```

---

## Observação importante sobre o DB

As colunas `role` em `whatsapp_mensagens` e `status` em `whatsapp_conversas` **precisam ser do tipo `text`** no Supabase (não enum Postgres). Se forem enum, será necessário rodar as seguintes migrations no Supabase SQL Editor antes de testar:

```sql
-- Se role for enum, converter para text:
ALTER TABLE whatsapp_mensagens ALTER COLUMN role TYPE text;

-- Se status for enum, converter para text:
ALTER TABLE whatsapp_conversas ALTER COLUMN status TYPE text;
```

---

## Arquivos já commitados / pendentes de commit

- ✅ Commitado: `supabase/functions/whatsapp-agent-send/index.ts` (junto com outros commits anteriores)
- ✅ Commitado: `src/hooks/useWhatsapp.ts`
- ✅ Commitado: `supabase/functions/whatsapp-webhook/index.ts`
- ❌ Pendente: `src/pages/WhatsappPage.tsx` (ainda não editado)

Após editar `WhatsappPage.tsx`, fazer:
```bash
git add src/pages/WhatsappPage.tsx supabase/functions/whatsapp-agent-send/index.ts
git commit -m "feat(whatsapp): atendimento humano com takeover, input manual e encerramento"
git push
```
