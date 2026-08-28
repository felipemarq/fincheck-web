# Estado atual do Web

## Contexto da branch

`codex/purchase-orders-v2` e a versao operacional atual do produto. A navegacao
e o codigo de runtime estao centrados em ordens de compra, clientes e produtos.
A experiencia financeira generica anterior foi retirada. O financeiro atual e
novo e limitado a cartoes, parcelas de aquisicoes e recebimentos das notas.

## Fluxo entregue

1. o usuario autentica e escolhe a organizacao ativa
2. ao criar uma organizacao, segue para o cadastro do primeiro produto
3. cadastra a unidade compradora em `Clientes`
4. cadastra produtos ou os cria rapidamente dentro de uma cotacao ou ordem
5. prepara a cotacao, anexa imagens opcionais e exporta o PDF para o cliente
6. quando vencer a proposta, cadastra manualmente a ordem confirmada
7. cria uma ordem, seleciona os produtos e informa quantidades e precos
8. usa a compra rapida para uma ordem ou registra um pedido ao fornecedor com
   produtos destinados a varias ordens
9. seleciona forma de pagamento, cartao, parcelas e primeiro vencimento
10. acompanha contas a pagar e a receber e quita faturas mensais por cartao em
    `Financeiro`
11. registra chegadas totais ou parciais de cada compra
12. separa, despacha e conclui entregas parciais
13. registra notas fiscais sobre os itens separados
14. acompanha pagamentos, pendencias, atrasos e margem no painel
15. pesquisa, compra e recebe itens de todas as ordens na fila operacional

## Telas e comportamentos

- `/dashboard`: indicadores operacionais e financeiros reunidos no topo, com
  explicacao dos resultados e ordens que exigem atencao; os indicadores
  operacionais abrem em uma nova aba a listagem exata das ordens que compoem
  cada numero. O periodo usa a emissao da ordem, inicia nos ultimos 30 dias e
  oferece atalhos de 7, 15 e 30 dias ou intervalo personalizado
- `/quotations`: listagem linear, busca e filtro por situacao das propostas
- `/quotations/new`: criacao com cliente, dados da empresa, itens do catalogo,
  cadastro rapido de produto, valores, condicoes e imagens opcionais
- `/quotations/:quotationId`: revisao dos snapshots, exclusao e exportacao do
  PDF com tabela paginada e galeria de imagens
- `/quotations/:quotationId/edit`: edicao dos dados, itens e imagens da cotacao
- `/orders`: indicadores, busca, filtros de situacao, etapa e visao do painel,
  parametros compartilhados pela URL, periodo herdado do dashboard e listagem
  linear responsiva das ordens
- `/orders/new`: cadastro completo da ordem e de uma ou mais linhas
- `/orders/:purchaseOrderId`: detalhe comercial e operacional, com exportacao
  da ordem completa em PDF
- `/orders/:purchaseOrderId/edit`: edicao do cabecalho e dos itens
- `/items`: fila paginada dos itens de ordens ativas, com busca por produto,
  codigo, ordem ou cliente; filtros de compra, recebimento e prazo; ordenacao
  por urgencia; e acoes diretas de comprar e receber
- `/purchases`: pedidos reais a fornecedores, com varios produtos, destinos em
  uma ou mais ordens e custos compartilhados registrados uma unica vez
- `/customers`: busca, cadastro e edicao de clientes
- `/products`: busca por codigo ou descricao, cadastro, edicao, inativacao,
  exclusao protegida e precos de referencia; o codigo ERP/SKU e opcional e
  unico por organizacao
- `/pricing`: calculadora local de precos sugeridos com acrescimos comerciais
  de 70% e 100%, imposto de 24,5% sobre o subtotal e frete somado ao final
- `/finance`: contas a pagar, vencidas, proximos 30 dias, contas a receber,
  recebimentos, gestao segura de cartoes e quitacao das parcelas abertas de uma
  fatura pelo mes de vencimento
- `/me/peso`: area pessoal fora da organizacao ativa, acessivel somente com a
  feature individual `BODY_WEIGHT`; registra peso e calorias por dia, permite
  meta e data-alvo opcionais, mostra media movel de sete dias, comparativos de
  7 e 30 dias e balanco calorico com cobertura explicita
- seletor de produto em cada item da ordem, com preenchimento automatico dos
  dados e sugestao do ultimo preco vendido
- busca de produtos por codigo, nome, marca, especificacao e embalagem, sem
  diferenciar acentos, caixa ou a ordem das palavras pesquisadas
- cadastro rapido de produto sem sair da ordem
- cadastro rapido de produto sem sair da cotacao
- ate tres imagens JPG, PNG ou WEBP de 3 MB em cada produto da cotacao
- separacao entre observacoes publicas do PDF e anotacoes internas
- totais de cotacao calculados no front para revisao e confirmados pela API
- acao de adicionar item posicionada depois da ultima linha
- modal de aquisicao com forma padronizada, cadastro rapido de cartao,
  parcelamento, vencimento, custos e itens
- editor agrupado com linhas de produto, multiplas destinacoes, quantidade sem
  alocacao e rateio automatico de frete, despesas e desconto por ordem
- edicao dos pedidos ao fornecedor com PATCH somente dos campos alterados;
  pedidos recebidos exibem a acao `Corrigir dados`, mantendo produtos e
  destinacoes em modo somente leitura
- precificacao da compra por valor unitario ou pelo valor total da quantidade;
  no segundo modo, o custo unitario e calculado automaticamente com precisao de
  ate seis casas decimais antes do envio para a API
- historico de compras dentro do detalhe da ordem
- filtros dos itens da ordem por compra pendente, comprados, recebidos e com
  excedente, com contadores atualizados a partir do progresso operacional
- PDF A4 com identidade visual, dados comerciais, cliente, enderecos, todos os
  itens e valores, resumo financeiro, cabecalho repetido e paginacao automatica
- gestao de chegadas dentro de cada aquisicao
- historico e edicao dos lotes de entrega, com frete opcional e sem campos de
  destinatario ou rastreio
- notas fiscais, vencimentos e pagamentos dentro da ordem
- acoes contextuais de comprar, entregar e faturar por item
- margens projetada e faturada, custos e saldo do cliente
- bloqueio de edicao dos itens depois do inicio das aquisicoes
- sidebar reduzida aos modulos atuais da V2
- organizacao ativa explicita em todas as telas privadas
- dark theme unico e layout responsivo

## Integracao com a API

Todas as consultas sao delimitadas pela organizacao ativa:

- `GET|POST /entities/{entityId}/customers`
- `PATCH /entities/{entityId}/customers/{customerId}`
- `GET|POST /entities/{entityId}/products`
- `PATCH|DELETE /entities/{entityId}/products/{productId}`
- `GET|POST /entities/{entityId}/quotations`
- `GET|PUT|DELETE /entities/{entityId}/quotations/{quotationId}`
- `POST /entities/{entityId}/quotations/{quotationId}/items/{quotationItemId}/images`
- `DELETE /entities/{entityId}/quotations/{quotationId}/images/{imageId}`
- `GET|POST /entities/{entityId}/purchase-orders`
- `GET|PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}`
- `GET /entities/{entityId}/purchase-order-items`
- `GET|POST /entities/{entityId}/credit-cards`
- `PATCH /entities/{entityId}/credit-cards/{creditCardId}`
- `GET /entities/{entityId}/payables`
- `PATCH /entities/{entityId}/payables/{payableId}`
- `POST /entities/{entityId}/payables/card-statements/settle`
- `GET|POST /entities/{entityId}/purchase-orders/{purchaseOrderId}/acquisitions`
- `PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}/acquisitions/{acquisitionId}`
- `GET|POST /entities/{entityId}/supplier-purchases`
- `PATCH /entities/{entityId}/supplier-purchases/{acquisitionId}`
- `GET|POST /entities/{entityId}/purchase-orders/{purchaseOrderId}/acquisitions/{acquisitionId}/receipts`
- `PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}/acquisitions/{acquisitionId}/receipts/{receiptId}`
- `GET|POST /entities/{entityId}/purchase-orders/{purchaseOrderId}/deliveries`
- `PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}/deliveries/{deliveryId}`
- `GET|POST /entities/{entityId}/purchase-orders/{purchaseOrderId}/invoices`
- `PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}/invoices/{invoiceId}`
- `POST /entities/{entityId}/purchase-orders/{purchaseOrderId}/invoices/{invoiceId}/payments`
- `PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}/invoices/{invoiceId}/payments/{paymentId}`
- `GET /entities/{entityId}/operations-dashboard`

As rotas pessoais nao usam organizacao e derivam o proprietario do token:

- `GET|PUT /me/health-profile`
- `GET /me/body-weights`
- `PUT|DELETE /me/body-weights/{measuredOn}`
- `GET /me/daily-calories`
- `PUT|DELETE /me/daily-calories/{loggedOn}`

O gasto diario exibido pode vir da estimativa com atividade ou de um valor
manual. Dias sem calorias ficam como ausentes e nao entram no deficit semanal.

O frontend preserva os campos opcionais, os snapshots de endereco, os snapshots
do produto e o total oficial retornado pela API. O valor calculado dos itens e
exibido separadamente quando houver divergencia.

## Fora desta entrega

- conversao total ou parcial da cotacao em ordem
- anexos de ordem, compra, entrega e nota fiscal
- importacao automatica e OCR de PDF
- estoque excedente reutilizavel entre ordens
- conciliacao bancaria automatica
- relatorios avancados e exportacoes consolidadas de multiplas ordens

## Debitos conhecidos

- o bundle principal ainda e grande e pede code splitting futuro
- ainda nao ha uma suite automatizada de componentes no frontend

## Proxima fatia recomendada

Validar o fluxo com dados reais e priorizar os refinamentos encontrados pela
equipe antes de iniciar anexos e importacao automatica de documentos.
