# Arquitetura do Web

## Visao geral

O frontend esta organizado em tres blocos principais:

- `app`: estado, hooks e integracao com API
- `view`: paginas, layouts, tabelas e modais
- `components`: shell da aplicacao e componentes compartilhados

## Fluxo de autenticacao

1. Login, cadastro e recuperacao de senha chamam os endpoints de auth da API.
2. `AuthContext` persiste `accessToken`, `refreshToken` e entidade selecionada.
3. O `httpClient` envia o token no header `Authorization`.
4. Em `401`, o cliente tenta renovar a sessao via `/auth/refresh-token`.
5. Se a renovacao falhar, a sessao local e limpa e o usuario volta para `/login`.

## Roteamento

Hoje o app expoe as seguintes areas privadas:

- `/`: dashboard
- `/entities`: gestao de entidades
- `/accounts`: gestao de contas
- `/payables`: contas a pagar
- `/receivables`: contas a receber
- `/credit-cards`: cartoes
- `/contacts`: contatos
- `/taxes`: impostos
- `/recurring-transactions`: gestao de recorrencias

As rotas publicas ficam em:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

## Estado e cache

- TanStack Query centraliza fetch e cache.
- As queries de contas e categorias sao escopadas por `entityId`.
- A entidade ativa fica no contexto e tambem no `localStorage`.
- A gestao de contas invalida tambem o dashboard para manter os saldos consolidados sincronizados depois de criar, editar ou excluir contas.

## Integracao com a API

- A URL base fica em `VITE_API_URL`.
- O dashboard usa a secao `balances` para consolidar saldos por conta e a secao `settlements` para resumir contas a pagar e contas a receber.
- O frontend consome os endpoints ja consolidados de auth, contas, categorias, cartoes, contatos, impostos, transacoes, recorrencias, entidades e dashboard.
- As telas de pagar/receber reutilizam `GET /transactions` com filtros por vencimento e contato, e `PATCH /transactions/{transactionId}` para liquidar itens diretamente da tabela.
