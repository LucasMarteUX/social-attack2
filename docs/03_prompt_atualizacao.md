# Prompt de Atualização do Agente

> **Quando usar:** Sempre que quiser evoluir o agente após o go-live.  
> Cole este prompt no Claude junto com o que quer atualizar.

---

---

Tenho um agente de atendimento WhatsApp em produção e quero fazer atualizações.

Os arquivos atuais do agente são:
- `01_prompt_onboarding.md` — contexto do negócio
- `system_prompt.md` — prompt do sistema em uso
- `base_conhecimento.md` — base de conhecimento atual
- `regras_negocio.md` — regras e fluxos atuais

Vou te informar o que quero atualizar e você vai me dizer exatamente o que mudar em qual arquivo, e gerar o trecho atualizado.

---

## Tipos de Atualização

Escolha o que se aplica e me diga mais sobre cada um:

### A — Adicionar novo conhecimento
Quero ensinar algo novo ao agente que ele ainda não sabe.

*Me diga:*
- Qual é o tema novo?
- Qual é a informação completa sobre esse tema?
- Em qual seção da base de conhecimento isso se encaixa?

### B — Corrigir uma resposta errada
O agente respondeu algo incorreto e quero corrigir.

*Me diga:*
- Qual foi a pergunta do usuário?
- Qual foi a resposta errada do agente?
- Qual é a resposta correta?

### C — Mudar o tom de voz
Quero que o agente fale de forma diferente.

*Me diga:*
- O que está errado no tom atual?
- Como você quer que ele fale agora?
- Tem algum exemplo de como deveria soar?

### D — Adicionar novo fluxo
Quero criar um novo caminho de atendimento.

*Me diga:*
- Qual é a situação que dispara esse fluxo?
- O que o agente deve fazer passo a passo?
- Como o fluxo termina?

### E — Adicionar nova regra de escalada
Quero que o agente encaminhe para humano em uma situação nova.

*Me diga:*
- O que deve disparar a escalada?
- Qual mensagem o agente deve enviar antes de escalar?
- O que deve ser registrado no banco de dados?

### F — Revisar com base em conversas reais
Tenho conversas reais do histórico que mostram onde o agente errou.

*Me diga:*
- Cole as conversas aqui (ou descreva o padrão de erro)
- Quero que você analise e sugira melhorias específicas

---

## O que você vai entregar

Para cada atualização solicitada:

1. **Análise:** por que a mudança faz sentido
2. **O que muda:** em qual arquivo e em qual seção
3. **Trecho atualizado:** o conteúdo novo pronto para substituir
4. **Impacto:** se essa mudança afeta alguma outra parte do sistema

---

Me diga o que quer atualizar hoje e vamos começar.
