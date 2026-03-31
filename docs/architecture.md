# Arquitetura do Web

## Visão geral

O frontend está organizado em três blocos principais:

- `app`: estado, hooks e integração com API
- `view`: páginas, layouts, tabelas e modais
- `components`: shell da aplicação e componentes compartilhados

## Fluxo de autenticação

1. Login e cadastro chamam os endpoints de auth da API.
2. `AuthContext` persiste `accessToken`, `refreshToken` e entidade selecionada.
3. O `httpClient` envia o token no header `Authorization`.
4. Em `401`, o cliente tenta renovar a sessão via `/auth/refresh-token`.
5. Se a renovação falhar, a sessão local é limpa e o usuário volta para `/login`.

## Roteamento

Hoje o app expõe duas áreas privadas:

- `/`: dashboard
- `/recurring-transactions`: gestão de recorrências

As rotas públicas ficam em:

- `/login`
- `/register`

## Estado e cache

- TanStack Query centraliza fetch e cache.
- As queries de contas e categorias agora são escopadas por `entityId`.
- A entidade ativa fica no contexto e também no `localStorage`.

## Integração com a API

- A URL base fica em `VITE_API_URL`.
- O frontend consome os endpoints já consolidados de auth, contas, categorias, cartões, impostos, transações, recorrências e dashboard.
