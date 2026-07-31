# Fincheck Web

Frontend web da nova operacao de ordens de compra. Esta branch inicia a V2 do
produto, simplificada em torno do fluxo real da empresa: receber uma ordem de
um cliente, registrar seus itens e acompanhar as proximas etapas operacionais.

O sistema financeiro anterior continua preservado na branch
`codex/entity-onboarding-flow`.

## Primeira entrega da V2

- autenticacao e recuperacao de sessao existentes
- selecao da organizacao ativa
- cadastro e edicao de clientes
- listagem e filtros de ordens de compra
- cadastro e edicao da ordem com seus itens
- detalhe operacional da ordem
- preservacao do total oficial do documento
- alerta quando o total oficial diverge da soma dos itens
- interface dark responsiva para desktop e celular

Compras, recebimentos, entregas, faturamento e margem ainda nao fazem parte
desta primeira fatia. Eles serao acrescentados sobre a ordem e os itens ja
modelados, sem reintroduzir os modulos financeiros genericos da versao
anterior.

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
partir da nova migration baseline.

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
