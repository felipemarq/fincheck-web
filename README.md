# Fincheck Web

Frontend web do Fincheck. A aplicação consome a Fincheck API, gerencia a sessão do usuário, mantém o contexto da entidade ativa e entrega a experiência de dashboard e gestão financeira no navegador.

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
- Recuperação de senha
- Sessão autenticada com refresh token automático
- Seleção de entidade ativa
- Dashboard
- Cartões de crédito
- Configuração de impostos mensais
- CRUD de contas
- CRUD de transações
- CRUD de transações recorrentes

## O que ainda está em construção

- Relatórios
- Contatos
- Investimentos

## Estrutura principal

- `src/app`: entidades, hooks, config e serviços HTTP
- `src/view`: páginas, modais, layouts e componentes da aplicação
- `src/components`: componentes compartilhados e shell visual
- `docs/`: documentação do estado atual do frontend

## Ambiente

Use o `.env.example` como base:

- `VITE_API_URL`

Se a variável não for definida, o app usa `https://api.moneystack.com.br` como fallback.

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`

## Documentação

- [Arquitetura](./docs/architecture.md)
- [Estado atual](./docs/current-state.md)
