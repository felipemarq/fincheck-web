# Fincheck Web

Frontend web da nova operacao comercial e de ordens de compra. Esta branch
inicia a V2 do produto, simplificada em torno do fluxo real da empresa: cotar,
receber uma ordem, comprar, conferir chegadas, entregar, faturar e acompanhar
o pagamento.

O codigo da experiencia financeira generica anterior foi removido. O modulo
atual foi redesenhado em torno das compras, parcelas e recebimentos da operacao.

## Fluxo atual da V2

- autenticacao e recuperacao de sessao existentes
- selecao da organizacao ativa
- criacao de organizacao com encaminhamento para o primeiro produto
- cadastro e edicao de clientes
- catalogo de produtos com codigo ERP/SKU opcional, busca, edicao, inativacao e
  precos de referencia
- cotacoes com cadastro rapido de produto, precos, condicoes e imagens
  opcionais por item
- revisao, edicao, exclusao e exportacao da cotacao em PDF paginado com
  galeria de imagens
- listagem e filtros de ordens de compra
- fila unificada de itens pendentes, comprados e recebidos, com busca, filtros,
  prazos, paginacao e acoes operacionais
- cadastro e edicao da ordem com selecao de produtos e cadastro rapido
- detalhe operacional da ordem
- exportacao da ordem completa em PDF paginado, com dados comerciais, cliente,
  itens e resumo operacional
- compra rapida por ordem e pedidos agrupados a fornecedores
- um unico frete e pagamento distribuido entre produtos de varias ordens
- entrada de preco por unidade ou pelo total do lote, com calculo unitario
  automatico
- edicao segura de pedidos ao fornecedor, inclusive para correcoes descritivas
  depois do recebimento, sem reenviar itens e parcelas inalterados
- formas de pagamento padronizadas e cartoes identificados com seguranca
- compras parceladas com contas a pagar e vencimentos automaticos
- painel financeiro com faturas mensais por cartao, saidas e recebiveis da
  operacao
- varias compras atendendo o mesmo item da ordem
- chegadas totais e parciais por aquisicao
- entregas totais e parciais por lote
- notas fiscais por item entregue
- recebimentos parciais e saldo por nota
- quantidades compradas, recebidas, entregues e faturadas
- custos, impostos, deducoes, margem projetada e margem com custo conhecido
- dashboard com periodo de 7, 15, 30 dias ou intervalo personalizado, filas
  operacionais e contas vencidas
- preservacao do total oficial do documento
- alerta quando o total oficial diverge da soma dos itens
- interface dark responsiva para desktop e celular

Conversao de cotacao em ordem, anexos dos demais documentos, OCR/importacao de
PDF, estoque reutilizavel entre ordens, conciliacao bancaria e relatorios
avancados permanecem como evolucoes pos-MVP.

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
partir das migracoes da V2, incluindo `0008_quotations.sql` para o modulo de
cotacoes. A API publicada tambem precisa do bucket privado criado pelo
Serverless.

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
