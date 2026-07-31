# Arquitetura do Web

## Visao geral

O frontend mantem a separacao em tres blocos:

- `app`: entidades, hooks, cache e integracao HTTP
- `view`: paginas, layouts e modais orientados aos fluxos
- `components`: shell da aplicacao e componentes compartilhados

As telas consomem tipos de dominio de `src/app/entities`, chamam a API por
servicos pequenos em `src/app/services` e coordenam cache e mutacoes por hooks
do TanStack Query.

## Autenticacao e organizacao ativa

1. login, cadastro e recuperacao de senha chamam os endpoints de autenticacao
2. `AuthContext` persiste `accessToken`, `refreshToken` e organizacao ativa
3. o cliente HTTP envia o token no header `Authorization`
4. em `401`, tenta renovar a sessao por `/auth/refresh-token`
5. se a renovacao falhar, limpa a sessao e redireciona para `/login`

A entidade existente no backend representa a organizacao operacional. Seu ID
delimita clientes, ordens e todos os modulos futuros da V2.

## Roteamento atual

Rotas publicas:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

Rotas privadas da V2:

- `/orders`
- `/orders/new`
- `/orders/:purchaseOrderId`
- `/orders/:purchaseOrderId/edit`
- `/customers`

`/` redireciona para `/orders`. Os modulos financeiros anteriores continuam
no historico Git e na branch legada, mas nao participam da navegacao V2.

## Estado e cache

- TanStack Query centraliza consultas, mutacoes e invalidacao
- chaves de clientes e ordens incluem o `entityId`
- trocar a organizacao ativa troca automaticamente o conjunto de dados
- formularios usam React Hook Form e Zod
- a API e a fonte de verdade para totais calculados e progresso operacional

## Integracao com a API

- `VITE_API_URL` define a URL base
- todas as rotas privadas incluem o `entityId` no caminho
- o detalhe da ordem retorna cabecalho, snapshot do cliente e itens
- criacao e edicao enviam a ordem e seus itens em uma unica operacao
- campos opcionais podem ser limpos explicitamente na edicao

## Evolucao da V2

Os proximos modulos devem se conectar a `PurchaseOrderItem`, sem criar um
controle financeiro generico paralelo. A sequencia prevista e:

1. aquisicoes e previsao de chegada
2. recebimento dos produtos
3. entregas totais e parciais
4. faturamento e recebimento do cliente
5. custos, impostos e margem da ordem
