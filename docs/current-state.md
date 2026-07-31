# Estado atual do Web

## Contexto da branch

`codex/purchase-orders-v2` e o inicio da nova versao do produto. A navegacao
principal agora e centrada em ordens de compra e clientes. A experiencia
financeira anterior nao foi apagada: seu codigo e seu ultimo estado estao
preservados na branch `codex/entity-onboarding-flow`.

## Fluxo entregue

1. o usuario autentica e escolhe a organizacao ativa
2. cadastra a unidade compradora em `Clientes`
3. cria uma ordem e transcreve seus dados e itens
4. consulta a ordem e confere o valor contratado
5. identifica imediatamente divergencias entre o total oficial e os itens

## Telas e comportamentos

- `/orders`: indicadores, busca, filtro de situacao e cards das ordens
- `/orders/new`: cadastro completo da ordem e de uma ou mais linhas
- `/orders/:purchaseOrderId`: detalhe comercial e operacional
- `/orders/:purchaseOrderId/edit`: edicao do cabecalho e dos itens
- `/customers`: busca, cadastro e edicao de clientes
- sidebar reduzida aos modulos atuais da V2
- organizacao ativa explicita em todas as telas privadas
- dark theme unico e layout responsivo

## Integracao com a API

Todas as consultas sao delimitadas pela organizacao ativa:

- `GET|POST /entities/{entityId}/customers`
- `PATCH /entities/{entityId}/customers/{customerId}`
- `GET|POST /entities/{entityId}/purchase-orders`
- `GET|PATCH /entities/{entityId}/purchase-orders/{purchaseOrderId}`

O frontend preserva os campos opcionais, os snapshots de endereco e o total
oficial retornado pela API. O valor calculado dos itens e exibido
separadamente quando houver divergencia.

## Fora desta entrega

- registro das aquisicoes dos itens
- controle de chegada e estoque excedente
- entregas totais e parciais
- anexos e notas fiscais
- faturamento e recebimento do cliente
- custos de frete, impostos e margem
- importacao automatica de PDF

## Debitos conhecidos

- o bundle principal ainda e grande e pede code splitting futuro
- os componentes e modulos legados continuam no repositorio, embora fora das
  rotas da V2
- ainda nao ha uma suite automatizada de componentes no frontend

## Proxima fatia recomendada

Modelar aquisicoes vinculadas aos itens da ordem, permitindo registrar
fornecedor, quantidade comprada, custo, forma de pagamento, comprador e
previsao de chegada. Essa fatia deve atualizar o progresso da ordem sem tratar
excedentes como estoque no MVP.
