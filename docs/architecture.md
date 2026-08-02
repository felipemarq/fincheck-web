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
delimita clientes, produtos, ordens e todos os modulos futuros da V2.
Ao criar uma organizacao, o Web a seleciona e encaminha o usuario ao catalogo
para iniciar pelos produtos que serao cotados.

## Roteamento atual

Rotas publicas:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

Rotas privadas da V2:

- `/dashboard`
- `/orders`
- `/orders/new`
- `/orders/:purchaseOrderId`
- `/orders/:purchaseOrderId/edit`
- `/customers`
- `/products`

`/` redireciona para `/dashboard`. Os modulos financeiros anteriores continuam
no historico Git e na branch legada, mas nao participam da navegacao V2.

## Estado e cache

- TanStack Query centraliza consultas, mutacoes e invalidacao
- chaves de clientes, produtos, ordens e operacoes incluem o `entityId`
- trocar a organizacao ativa troca automaticamente o conjunto de dados
- formularios usam React Hook Form e Zod
- a API e a fonte de verdade para totais calculados e progresso operacional

## Integracao com a API

- `VITE_API_URL` define a URL base
- todas as rotas privadas incluem o `entityId` no caminho
- o detalhe da ordem retorna cabecalho, snapshot do cliente, itens e metricas
  derivadas de aquisicoes, chegadas, entregas, notas e pagamentos
- criacao e edicao enviam a ordem e seus itens em uma unica operacao
- cada item envia o `productId`; nome, marca, especificacao e unidades sao
  snapshots confirmados pela API
- o modal de produto e reutilizado na pagina de catalogo e no cadastro rapido
  da ordem
- campos opcionais podem ser limpos explicitamente na edicao
- aquisicoes, chegadas, entregas e notas sao consultadas separadamente e
  invalidam ordem e dashboard ao serem criadas ou alteradas
- itens da ordem tornam-se somente leitura depois da primeira aquisicao

## Limites atuais

O fluxo operacional principal esta implementado sem criar um controle
financeiro generico paralelo. Permanecem fora do MVP anexos, OCR, estoque
reutilizavel, conciliacao bancaria e relatorios avancados.
