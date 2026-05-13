# Schema Prisma — Social Attack

> Documentação viva do banco de dados. Atualizar sempre que uma nova funcionalidade exigir mudança no schema.
>
> **Banco:** PostgreSQL via Supabase  
> **ORM:** Prisma  
> **Arquivo:** `prisma/schema.prisma`  
> **Última atualização:** 2026-05-11

---

## Sumário

- [Visão geral das entidades](#visão-geral-das-entidades)
- [Diagrama de relacionamentos](#diagrama-de-relacionamentos)
- [Modelos](#modelos)
  - [User](#user)
  - [Categoria](#categoria)
  - [Ideia](#ideia)
  - [Referencia](#referencia)
  - [TomDeVoz](#tomdevoz)
  - [Criativo](#criativo)
  - [Slide](#slide)
  - [Agendamento](#agendamento)
  - [Todo](#todo)
- [Enums](#enums)
- [Regras de negócio](#regras-de-negócio)
- [Storage (Supabase)](#storage-supabase)
- [Como atualizar este schema](#como-atualizar-este-schema)

---

## Visão geral das entidades

| Modelo       | Tabela          | Descrição                                              |
|--------------|-----------------|--------------------------------------------------------|
| `User`       | `users`         | Usuário do sistema (preparado para Supabase Auth V2)   |
| `Categoria`  | `categorias`    | Agrupa ideias e criativos por tema                     |
| `Ideia`      | `ideias`        | Conceito de post dentro de uma categoria               |
| `Referencia` | `referencias`   | Link, arquivo ou texto vinculado a uma ideia           |
| `TomDeVoz`   | `tons_de_voz`   | Estilo de comunicação reutilizável nos criativos       |
| `Criativo`   | `criativos`     | Carrossel ou post gerado a partir de uma ideia         |
| `Slide`      | `slides`        | Slide individual de um carrossel (máx. 20)             |
| `Agendamento`| `agendamentos`  | Data e plataforma de publicação de um criativo         |
| `Todo`       | `todos`         | Tarefa de gestão de conteúdo com prazo e prioridade    |

---

## Diagrama de relacionamentos

```
User
 ├── Categoria[]         (1:N)
 ├── Ideia[]             (1:N)
 ├── Criativo[]          (1:N)
 ├── Agendamento[]       (1:N)
 ├── Todo[]              (1:N)
 └── TomDeVoz[]          (1:N)

Categoria
 ├── Ideia[]             (1:N)
 └── Criativo[]          (1:N)

Ideia
 ├── Referencia[]        (1:N, cascade delete)
 └── Criativo[]          (1:N, set null on delete)

TomDeVoz
 └── Criativo[]          (1:N, set null on delete)

Criativo
 ├── Slide[]             (1:N, cascade delete)
 └── Agendamento[]       (1:N, cascade delete)
```

---

## Modelos

---

### User

> Preparado para integração com Supabase Auth. Em V1, não há autenticação — o `user_id` é opcional em todas as tabelas.

| Campo       | Tipo      | Descrição                        |
|-------------|-----------|----------------------------------|
| `id`        | `String`  | CUID gerado automaticamente      |
| `email`     | `String`  | Único, identificador principal   |
| `nome`      | `String`  | Nome de exibição                 |
| `avatar_url`| `String?` | URL da foto de perfil            |
| `criado_em` | `DateTime`| Data de cadastro                 |

**Relações:** possui `Categoria[]`, `Ideia[]`, `Criativo[]`, `Agendamento[]`, `Todo[]`, `TomDeVoz[]`

---

### Categoria

> Organiza o conteúdo por temas. Cada categoria tem uma cor e um ícone Lucide para identificação visual.

| Campo       | Tipo      | Descrição                                         |
|-------------|-----------|---------------------------------------------------|
| `id`        | `String`  | CUID                                              |
| `nome`      | `String`  | Ex: "Marketing Digital"                           |
| `descricao` | `String?` | Texto livre de descrição                          |
| `cor`       | `String`  | Cor hexadecimal, ex: `"#6D28D9"`                  |
| `icone`     | `String`  | Nome do ícone Lucide, ex: `"TrendingUp"`          |
| `criado_em` | `DateTime`| Timestamp de criação                              |
| `user_id`   | `String?` | FK para `User` (opcional em V1)                   |

**Relações:** pertence a `User`, tem `Ideia[]` e `Criativo[]`

---

### Ideia

> Repositório de conceitos de posts. Uma ideia pode gerar zero ou mais criativos.

| Campo             | Tipo      | Descrição                                      |
|-------------------|-----------|------------------------------------------------|
| `id`              | `String`  | CUID                                           |
| `titulo`          | `String`  | Título da ideia                                |
| `descricao`       | `String?` | Desenvolvimento da ideia                       |
| `favorita`        | `Boolean` | Marcada como favorita (`false` padrão)         |
| `conteudo_gerado` | `Boolean` | Já tem criativo gerado (`false` padrão)        |
| `criado_em`       | `DateTime`| Timestamp de criação                           |
| `atualizado_em`   | `DateTime`| Atualizado automaticamente pelo Prisma         |
| `categoria_id`    | `String`  | FK para `Categoria` (cascade delete)           |
| `user_id`         | `String?` | FK para `User`                                 |

**Relações:** pertence a `Categoria` e `User`, tem `Referencia[]` e `Criativo[]`

---

### Referencia

> Fontes vinculadas a uma ideia. Podem ser URLs, trechos de texto ou arquivos enviados (PDF, DOC, TXT).

| Campo       | Tipo             | Descrição                                        |
|-------------|------------------|--------------------------------------------------|
| `id`        | `String`         | CUID                                             |
| `tipo`      | `ReferenciaType` | `url` \| `texto` \| `arquivo` \| `pdf`           |
| `valor`     | `String`         | A URL ou o conteúdo de texto                     |
| `nome`      | `String?`        | Nome do arquivo (quando tipo é `arquivo` ou `pdf`)|
| `criado_em` | `DateTime`       | Timestamp                                        |
| `ideia_id`  | `String`         | FK para `Ideia` (cascade delete)                 |

**Obs:** ao excluir uma `Ideia`, todas as suas `Referencia[]` são excluídas em cascata.

---

### TomDeVoz

> Estilos de comunicação personalizados pelo usuário. Selecionáveis ao criar um criativo.

| Campo       | Tipo      | Descrição                                           |
|-------------|-----------|-----------------------------------------------------|
| `id`        | `String`  | CUID                                                |
| `nome`      | `String`  | Ex: "Provocativo", "Técnico", "Bem-humorado"        |
| `descricao` | `String`  | Como esse tom se comporta                           |
| `exemplo`   | `String?` | Frase de exemplo que ilustra o tom                  |
| `criado_em` | `DateTime`| Timestamp                                           |
| `user_id`   | `String?` | FK para `User`                                      |

**Relações:** pertence a `User`, referenciado em `Criativo[]`

---

### Criativo

> Peça de conteúdo gerada — carrossel, imagem única ou roteiro de Reels. Núcleo do sistema.

| Campo           | Tipo            | Descrição                                           |
|-----------------|-----------------|-----------------------------------------------------|
| `id`            | `String`        | CUID                                                |
| `titulo`        | `String`        | Título do criativo                                  |
| `tipo`          | `CriativoTipo`  | `carrossel` \| `imagem_unica` \| `reels_roteiro`    |
| `status`        | `CriativoStatus`| `rascunho` → `revisao` → `pronto` → `agendado` → `publicado` |
| `legenda`       | `String?`       | Legenda gerada pelo Claude                          |
| `hashtags`      | `String[]`      | Array de hashtags (PostgreSQL native array)         |
| `prompt_imagem` | `String?`       | Prompt base usado no Gemini para gerar imagens      |
| `criado_em`     | `DateTime`      | Timestamp de criação                                |
| `atualizado_em` | `DateTime`      | Atualizado automaticamente                          |
| `ideia_id`      | `String?`       | FK para `Ideia` (opcional, set null on delete)      |
| `categoria_id`  | `String`        | FK para `Categoria` (obrigatório)                   |
| `tom_de_voz_id` | `String?`       | FK para `TomDeVoz` (optional, set null on delete)   |
| `user_id`       | `String?`       | FK para `User`                                      |

**Relações:** tem `Slide[]` e `Agendamento[]`

---

### Slide

> Slide individual de um carrossel. Ordem definida pelo campo `numero` (1–20).

| Campo           | Tipo      | Descrição                                        |
|-----------------|-----------|--------------------------------------------------|
| `id`            | `String`  | CUID                                             |
| `numero`        | `Int`     | Posição do slide (1 a 20). Único por criativo.   |
| `texto`         | `String`  | Texto do slide editado pelo usuário              |
| `url_imagem`    | `String?` | URL da imagem gerada no Supabase Storage         |
| `prompt_imagem` | `String?` | Prompt específico deste slide para o Gemini      |
| `criado_em`     | `DateTime`| Timestamp                                        |
| `criativo_id`   | `String`  | FK para `Criativo` (cascade delete)              |

**Constraint:** `@@unique([criativo_id, numero])` — sem slides duplicados na mesma posição.

---

### Agendamento

> Define quando e onde um criativo será publicado.

| Campo            | Tipo              | Descrição                                   |
|------------------|-------------------|---------------------------------------------|
| `id`             | `String`          | CUID                                        |
| `data_publicacao`| `DateTime`        | Data e hora da publicação                   |
| `plataforma`     | `Plataforma`      | `instagram` \| `linkedin` \| `twitter` \| `tiktok` |
| `status`         | `AgendamentoStatus`| `agendado` \| `publicado` \| `cancelado`   |
| `notas`          | `String?`         | Observações livres                          |
| `criado_em`      | `DateTime`        | Timestamp                                   |
| `atualizado_em`  | `DateTime`        | Atualizado automaticamente                  |
| `criativo_id`    | `String`          | FK para `Criativo` (cascade delete)         |
| `user_id`        | `String?`         | FK para `User`                              |

---

### Todo

> Lista de tarefas relacionadas ao fluxo de produção de conteúdo.

| Campo          | Tipo            | Descrição                                     |
|----------------|-----------------|-----------------------------------------------|
| `id`           | `String`        | CUID                                          |
| `titulo`       | `String`        | Descrição da tarefa                           |
| `concluida`    | `Boolean`       | `false` padrão                                |
| `prazo`        | `DateTime?`     | Data limite opcional                          |
| `prioridade`   | `TodoPrioridade`| `baixa` \| `media` \| `alta`                 |
| `criado_em`    | `DateTime`      | Timestamp                                     |
| `atualizado_em`| `DateTime`      | Atualizado automaticamente                    |
| `user_id`      | `String?`       | FK para `User`                                |

---

## Enums

| Enum               | Valores                                                                 |
|--------------------|-------------------------------------------------------------------------|
| `ReferenciaType`   | `url`, `texto`, `arquivo`, `pdf`                                        |
| `CriativoTipo`     | `carrossel`, `imagem_unica`, `reels_roteiro`                            |
| `CriativoStatus`   | `rascunho`, `revisao`, `pronto`, `agendado`, `publicado`                |
| `Plataforma`       | `instagram`, `linkedin`, `twitter`, `tiktok`                            |
| `AgendamentoStatus`| `agendado`, `publicado`, `cancelado`                                    |
| `TodoPrioridade`   | `baixa`, `media`, `alta`                                                |

---

## Regras de negócio

### Deleções em cascata
| Pai excluído | Filhos afetados                            |
|--------------|--------------------------------------------|
| `Ideia`      | `Referencia[]` excluídas em cascata        |
| `Criativo`   | `Slide[]` e `Agendamento[]` excluídos em cascata |
| `User`       | `user_id` vira `null` em todas as tabelas (`SetNull`) |

### Slides
- Um `Criativo` pode ter no mínimo 3 e no máximo **20 slides**
- `(criativo_id, numero)` é único — sem duplicata de posição
- `url_imagem` fica nula até a geração via Gemini API

### Status do criativo
O fluxo esperado é linear, mas não há constraint de banco — a transição é controlada pela aplicação:
```
rascunho → revisao → pronto → agendado → publicado
```

### Hashtags
Armazenadas como `String[]` (array nativo do PostgreSQL). Não há tabela separada.

---

## Storage (Supabase)

| Bucket                 | Conteúdo                              | Acesso       |
|------------------------|---------------------------------------|--------------|
| `criativos-imagens`    | Imagens dos slides geradas pelo Gemini | Público      |
| `referencias-arquivos` | PDFs e documentos enviados como referência | Privado |

**Convenção de path:**
- Imagens: `criativos-imagens/{criativo_id}/{slide_numero}.jpg`
- Arquivos: `referencias-arquivos/{ideia_id}/{referencia_id}/{nome_arquivo}`

---

## Como atualizar este schema

Sempre que uma nova funcionalidade for implementada que exija persistência, seguir este processo:

1. **Adicionar o modelo** em `prisma/schema.prisma`
2. **Atualizar este documento** (`schema-prisma.md`):
   - Tabela de entidades
   - Seção de modelo com campos e relações
   - Diagrama de relacionamentos (se houver nova relação)
   - Enums (se novos valores forem adicionados)
   - Regras de negócio (se houver comportamento especial)
3. **Rodar a migration:**
   ```bash
   npx prisma migrate dev --name nome_da_mudanca
   ```
4. **Regenerar o client:**
   ```bash
   npx prisma generate
   ```

### Checklist de nova funcionalidade

- [ ] Modelo adicionado em `schema.prisma`
- [ ] `schema-prisma.md` atualizado
- [ ] Migration criada e aplicada
- [ ] Hook/serviço atualizado em `src/hooks/`
- [ ] Dados mock em `src/data/mock.ts` refletem o novo schema
