# Estado atual do Web

## Contexto da branch

`codex/purchase-orders-v2` e a versao operacional atual do produto. A navegacao
e o codigo de runtime estao centrados em ordens de compra, clientes e produtos.
A experiencia financeira anterior foi retirada desta branch e continua
preservada no historico Git e na branch `codex/entity-onboarding-flow`.

## Fluxo entregue

1. o usuario autentica e escolhe a organizacao ativa
2. ao criar uma organizacao, segue para o cadastro do primeiro produto
3. cadastra a unidade compradora em `Clientes`
4. cadastra produtos ou os cria rapidamente dentro de uma nova ordem
5. cria uma ordem, seleciona os produtos e informa quantidades e precos
6. registra uma ou mais compras para os itens da ordem
7. registra chegadas totais ou parciais de cada compra
8. separa, despacha e conclui entregas parciais
9. registra notas fiscais sobre os itens separados
10. acompanha pagamentos, pendencias, atrasos e margem no painel

## Telas e comportamentos

- `/dashboard`: filas operacionais, financeiro e ordens que exigem atencao
- `/orders`: indicadores, busca, filtro de situacao e cards das ordens
- `/orders/new`: cadastro completo da ordem e de uma ou mais linhas
- `/orders/:purchaseOrderId`: detalhe comercial e operacional
- `/orders/:purchaseOrderId/edit`: edicao do cabecalho e dos itens
- `/customers`: busca, cadastro e edicao de clientes
- `/products`: busca, cadastro, edicao, inativacao, exclusao protegida e precos
  de referencia
- seletor de produto em cada item da ordem, com preenchimento automatico dos
  dados e sugestao do ultimo preco vendido
- cadastro rapido de produto sem sair da ordem
- acao de adicionar item posicionada depois da ultima linha
- modal de aquisicao com vendedor, comprador, pagamento, custos e itens
- historico de compras dentro do detalhe da ordem
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
- `GET|POST /entities/{entityId}/purchase-orders`
- `GET|PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}`
- `GET|POST /entities/{entityId}/purchase-orders/{purchaseOrderId}/acquisitions`
- `PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}/acquisitions/{acquisitionId}`
- `GET|POST /entities/{entityId}/purchase-orders/{purchaseOrderId}/acquisitions/{acquisitionId}/receipts`
- `PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}/acquisitions/{acquisitionId}/receipts/{receiptId}`
- `GET|POST /entities/{entityId}/purchase-orders/{purchaseOrderId}/deliveries`
- `PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}/deliveries/{deliveryId}`
- `GET|POST /entities/{entityId}/purchase-orders/{purchaseOrderId}/invoices`
- `PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}/invoices/{invoiceId}`
- `POST /entities/{entityId}/purchase-orders/{purchaseOrderId}/invoices/{invoiceId}/payments`
- `PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}/invoices/{invoiceId}/payments/{paymentId}`
- `GET /entities/{entityId}/operations-dashboard`

O frontend preserva os campos opcionais, os snapshots de endereco, os snapshots
do produto e o total oficial retornado pela API. O valor calculado dos itens e
exibido separadamente quando houver divergencia.

## Fora desta entrega

- anexos de ordem, compra, entrega e nota fiscal
- importacao automatica e OCR de PDF
- estoque excedente reutilizavel entre ordens
- conciliacao bancaria automatica
- relatorios avancados e exportacao

## Debitos conhecidos

- o bundle principal ainda e grande e pede code splitting futuro
- ainda nao ha uma suite automatizada de componentes no frontend

## Proxima fatia recomendada

Validar o fluxo com dados reais e priorizar os refinamentos encontrados pela
equipe antes de iniciar anexos e importacao automatica de documentos.
