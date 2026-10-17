# TreinãoTop

Registro de treinos semanal: cada dia da semana tem seus exercícios (séries × repetições) e, a cada treino, você registra o kg máximo do dia. Ao lado de cada exercício aparece o kg da última vez, pra comparar.

## Requisitos

- Login, senha e cadastro.
- Perfil com peso (kg) e altura (cm), e IMC calculado a partir deles.
- Plano semanal: Segunda → Exercício A, B, C…, cada um com séries e repetições.
- Registro do kg máximo pego no dia, por exercício.
- Na semana seguinte, cada exercício mostra **o kg da última vez**.
- Usabilidade: **tudo que é de um contexto fica numa tela só** (sem navegar entre páginas pra registrar um treino).
- UI com componentes **shadcn/ui** (via MCP do shadcn) e ícones do **react-icons**.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| App | Next.js (App Router) + TypeScript | Front e back no mesmo projeto, Server Actions dispensam uma API REST |
| UI | shadcn/ui + Tailwind | Pedido do projeto |
| Ícones | react-icons | Pedido do projeto |
| Banco | Postgres no Supabase (cliente `postgres`) | Grátis e funciona na Vercel (serverless não guarda arquivo SQLite). Tabelas no schema `app` com RLS ligado; só a role `treinao_app` do backend acessa |
| Senha | `crypto.scrypt` (stdlib do Node) | Sem bcrypt/lib nativa |
| Sessão | Cookie httpOnly com token aleatório salvo no banco | Sem NextAuth: pra login com email e senha não compensa a dependência |

> Deploy: Vercel (front + backend, funções em `gru1`/São Paulo, ver `vercel.json`) + Supabase (`sa-east-1`). Datas de "hoje" usam o fuso `America/Sao_Paulo`.

## Modelo de dados

```sql
users     (id, email UNIQUE, password_hash, name, weight_kg, height_cm, created_at)
sessions  (token PK, user_id → users, expires_at)
exercises (id, user_id → users, weekday 0-6, name, sets, reps, position)
logs      (id, exercise_id → exercises ON DELETE CASCADE, date 'YYYY-MM-DD', kg, sets, reps,
           UNIQUE(exercise_id, date))
```

- **"Kg da última vez"** = o log mais recente do exercício com `date < hoje`:
  ```sql
  SELECT kg FROM logs WHERE exercise_id = ? AND date < ? ORDER BY date DESC LIMIT 1
  ```
- `UNIQUE(exercise_id, date)` faz com que salvar de novo no mesmo dia **atualize** o valor (upsert) em vez de duplicar.
- Um log de hoje = exercício com check. `sets`/`reps` do log guardam a série usada naquele dia.

## Telas

### 1. `/login` e `/signup`: blocks shadcn `login-04` / `signup-04`
Card em duas colunas: formulário + painel animado de academia (`components/gym-hero.tsx`, com gradiente, halter subindo, ícones flutuando e um letreiro de exercícios). No mobile o painel vira um banner acima do formulário. As animações respeitam `prefers-reduced-motion`.

### Visual
Tema escuro, `primary` laranja, títulos em Oswald (`font-heading`). **Mobile first**: no celular cada exercício é um cartão de 2 linhas (nome + menu / séries·última + kg); a partir de `sm` vira tabela de 5 colunas.

### 2. `/`: Treino de hoje (cai aqui depois do login)

```
┌─ Card do dia (compacto) ───────────────────┐
│ HOJE · 17 DE OUTUBRO                       │
│ SÁBADO                  [1/3 exercícios ▾] │  ← expande a lista
│ ▓▓▓▓▓▓░░░░░░░░░░                            │
└────────────────────────────────────────────┘
┌─ Exercício atual (foco da tela) ───────────┐
│ EXERCÍCIO 2 DE 3                           │
│ SUPINO RETO                                │
│ Última vez: 60 kg em 10/10                 │
│ [Séries 4]  [Reps 10]  [Kg __]             │
│ ▲ +2,5 kg em relação à última vez          │
│ [ ✓ CONCLUIR EXERCÍCIO ]                   │
└────────────────────────────────────────────┘
```

- Mostra só os exercícios do dia da semana atual, **na ordem do plano**.
- O card grande é o primeiro exercício sem check. Ao concluir, aparece o próximo (com animação).
- Séries e reps vêm preenchidas com a última série usada. Se você mudar e concluir, o novo valor vira o padrão (`exercises.sets/reps`).
- O check é o registro de hoje (`logs`) com kg + séries + reps. Kg é obrigatório (0 = peso do corpo).
- O card do dia mostra só dia + progresso. A lista (✔/○) e o atalho "Gerenciar exercícios" ficam num `Collapsible`. Tocar num exercício abre ele no card grande (pra corrigir ou desmarcar) e recolhe a lista.
- Tudo concluído: card de troféu com uma mensagem aleatória de parabéns.
- Dia sem exercícios: card de descanso com atalho pro plano.
- Uma coluna só (máx. 2xl), em qualquer tela: o exercício atual é o foco.

### 3. `/plano`: Gerenciar exercícios
- Abas de segunda a domingo. Em cada dia dá pra adicionar, editar (nome, séries, reps), remover e **reordenar com ↑/↓**. A ordem (`exercises.position`) define a ordem do treino de hoje.

### 4. `/historico`: Histórico com insights
- **Filtro de período** (Popover + Calendar do shadcn, `components/history-filters.tsx`): escolhe "de X até Y" no calendário ou por atalhos (7 dias, 4 semanas, 3 meses, 1 ano). Padrão: últimas 4 semanas.
- **Agrupamento Dias / Semanas / Meses** escolhido automaticamente pelo tamanho do período (até 14 dias → dias; até 92 → semanas; maior → meses) e trocável. Mudar o período volta pro automático.
- O estado fica na URL (`?de=2026-09-20&ate=2026-10-17&ver=semanas`): dá pra voltar, recarregar e compartilhar. Só o agrupamento escolhido é renderizado.
- Semanas e meses das pontas entram inteiros, e a comparação usa o histórico todo (a 1ª semana do filtro ainda compara com a anterior).
- **Gráfico "Evolução de carga"**: kg máximo por semana do exercício escolhido no Select, dentro do período. Mostra Atual, Recorde e "Desde o início" (kg e %), tooltip com crosshair, rótulo só no último ponto e tabela escondida pra leitor de tela. A cor `#e8650f` passou no validador de paleta (tema escuro).
- **Cards em grid** mobile first (1 coluna → 2 → 3), **6 por vez** com botão "Ver mais" (`components/show-more.tsx`).
- Dentro de cada semana/mês aparecem as **5 maiores mudanças** de carga; o resto fica em "Ver todos" (`<details>` nativo).
- Cada semana/mês tem selo Evolução/Retrocesso/Estável, volume médio por treino em %, quantos exercícios subiram/caíram, e a maior evolução e a maior queda.
- Regra da tendência: mais exercícios subindo que caindo = evolução (e o contrário = retrocesso). No empate, decide o volume (±5%); senão, estável.
- Lógica pura em `lib/history.ts`, com testes em `lib/history.test.ts`.

### Navegação
- `Sidebar` do shadcn (layout em `app/(app)/layout.tsx`): Treino de hoje, Plano semanal, Histórico. No mobile ela abre como gaveta pelo botão do topo e fecha ao escolher uma área.

### Visual geral
- Barras de rolagem personalizadas (finas, laranja translúcido, sobem pra laranja no hover) em `app/globals.css`.

### Perfil
- `Sheet` lateral com peso, altura, IMC e o botão de sair.

## Componentes shadcn

`button`, `input`, `label`, `card`, `tabs`, `table`, `sheet`, `dropdown-menu`, `tooltip`, `sonner` (toast de "salvo").

## Ícones (react-icons/fi)

`FiPlus`, `FiTrash2`, `FiEdit2`, `FiUser`, `FiLogOut`, `FiTrendingUp`, `FiTrendingDown`, `FiMinus`.

## Estrutura

```
app/
  login/page.tsx        # block login-04
  signup/page.tsx       # block signup-04
  (app)/layout.tsx      # sidebar + topo (usuário logado)
  (app)/page.tsx        # treino de hoje (cards + check)
  (app)/plano/page.tsx  # gerenciar exercícios e ordem
  (app)/historico/page.tsx # histórico dias/semanas/meses + insights
  actions.ts            # server actions: auth, exercícios, logs, perfil
components/
  today-workout.tsx     # card do dia + card do exercício atual + parabéns (client)
  plan-board.tsx        # abas dos dias, CRUD e reordenação (client)
  app-sidebar.tsx       # navegação lateral
  profile-sheet.tsx
  login-form.tsx, signup-form.tsx, gym-hero.tsx
lib/
  db.ts                 # cliente Postgres + consultas
  db.test.ts            # teste do "kg da última vez"
  history.ts            # agrupamento dias/semanas/meses + tendência
  history.test.ts
  auth.ts               # scrypt, sessão, getUser()/requireUser() (redireciona pra /login)
```

## Segurança (não negociável)

- Senha só como hash scrypt com salt; nunca logar.
- Cookie de sessão `httpOnly`, `sameSite=lax`, `secure` em produção.
- Toda query filtra por `user_id` da sessão (um usuário nunca acessa exercício/log de outro).
- Validar inputs no servidor (kg ≥ 0, séries/reps inteiros > 0, email válido, senha ≥ 8).

## Fora do escopo (por enquanto)

Recuperar senha, kg por série (hoje é só o máximo do dia). Entram quando forem pedidos.

## Rodando

Crie `.env.local` com a string de conexão do Postgres (pooler do Supabase, porta 6543):

```bash
DATABASE_URL=postgresql://treinao_app.<ref>:<senha>@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # testes do histórico + integração com o banco (pula sem DATABASE_URL)
npm run seed    # conta demo com plano completo + 10 semanas de histórico (credenciais em scripts/seed.ts)
```

- Next.js 16 com Cache Components: dados por usuário ficam dentro de `<Suspense>`, e `getUser()` chama `connection()` antes de usar `Date.now()`.
