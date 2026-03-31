# Fincheck Web

Frontend web do Fincheck. A aplicacao consome a Fincheck API, gerencia a sessao do usuario, mantem o contexto da entidade ativa e entrega a experiencia de dashboard e gestao financeira no navegador.

## Stack

- React 19
- TypeScript
- Vite
- TanStack Query
- React Hook Form
- Radix UI
- Tailwind CSS

## O que existe hoje

- Login e cadastro
- Recuperacao de senha
- Sessao autenticada com refresh token automatico
- Selecao de entidade ativa
- Gestao de entidades PF/PJ com criacao, edicao e troca pela sidebar
- Onboarding operacional para entidade nova, guiando da criacao ate a primeira conta e a primeira transacao
- Gestao dedicada de contas bancarias, caixa e investimento
- Dashboard
- Contas a pagar
- Contas a receber
- Filtros rapidos de vencimento e agrupamento por contato em pagar/receber
- Cartoes de credito
- Contatos
- Configuracao de impostos mensais
- CRUD de contas
- CRUD de transacoes
- CRUD de transacoes recorrentes

## O que ainda esta em construcao

- Relatorios
- Investimentos

## Estrutura principal

- `src/app`: entidades, hooks, config e servicos HTTP
- `src/view`: paginas, modais, layouts e componentes da aplicacao
- `src/components`: componentes compartilhados e shell visual
- `docs/`: documentacao do estado atual do frontend

## Ambiente

Use o `.env.example` como base:

- `VITE_API_URL`

Se a variavel nao for definida, o app usa `https://api.moneystack.com.br` como fallback.

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`

## Documentacao

- [Arquitetura](./docs/architecture.md)
- [Estado atual](./docs/current-state.md)
