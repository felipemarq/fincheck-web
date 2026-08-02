# Fincheck Web

Frontend web da nova operacao de ordens de compra. Esta branch inicia a V2 do
produto, simplificada em torno do fluxo real da empresa: receber uma ordem,
comprar, conferir chegadas, entregar, faturar e acompanhar o pagamento.

O codigo da experiencia financeira anterior foi removido desta branch e
continua preservado no historico Git e na branch
`codex/entity-onboarding-flow`.

## Fluxo atual da V2

- autenticacao e recuperacao de sessao existentes
- selecao da organizacao ativa
- criacao de organizacao com encaminhamento para o primeiro produto
- cadastro e edicao de clientes
- catalogo de produtos com busca, edicao, inativacao e precos de referencia
- listagem e filtros de ordens de compra
- cadastro e edicao da ordem com selecao de produtos e cadastro rapido
- detalhe operacional da ordem
- registro e edicao de aquisicoes
- varias compras atendendo o mesmo item da ordem
- chegadas totais e parciais por aquisicao
- entregas totais e parciais por lote
- notas fiscais por item entregue
- recebimentos parciais e saldo por nota
- quantidades compradas, recebidas, entregues e faturadas
- custos, impostos, deducoes e margens
- dashboard com filas operacionais e contas vencidas
- preservacao do total oficial do documento
- alerta quando o total oficial diverge da soma dos itens
- interface dark responsiva para desktop e celular

Anexos, OCR/importacao de PDF, estoque reutilizavel entre ordens, conciliacao
bancaria e relatorios avancados permanecem como evolucoes pos-MVP.

## Stack

- React 19 e TypeScript
- Vite
- TanStack Query
- React Hook Form e Zod
- Radix UI
- Tailwind CSS

## Estrutura principal

- `src/app/entities`: contratos de dominio usados pelo frontend
- `src/app/services`: integracao HTTP com a API
- `src/app/hooks`: consultas e mutacoes da aplicacao
- `src/view/pages`: fluxos e telas
- `src/view/modals`: formularios em dialogo
- `src/components`: shell e componentes compartilhados
- `docs`: arquitetura e estado funcional

## Ambiente

Copie as variaveis documentadas em `.env.example` para um arquivo local:

```env
VITE_API_URL=http://localhost:3000
```

Sem `VITE_API_URL`, o app usa `https://api.moneystack.com.br`. Para trabalhar
na V2 localmente, a API deve estar na mesma branch e com o banco criado a
partir das migracoes da V2, incluindo `0003_product-catalog.sql`.

O servidor de desenvolvimento usa `http://localhost:5173` com porta estrita.
Se a porta estiver ocupada, encerre a instancia anterior antes de executar
`pnpm dev` novamente.

## Comandos

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
```

## Documentacao

- [Arquitetura](./docs/architecture.md)
- [Estado atual da V2](./docs/current-state.md)
