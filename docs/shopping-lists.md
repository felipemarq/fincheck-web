# Listas de compras

Rota: `/shopping-lists`, acessível pelo menu **Listas de compras**.
Uma lista agrupa os links enviados pela equipe. É possível criar várias listas,
editar nome/notas, arquivar e reabrir. As listas são compartilhadas somente pela
organização ativa.

## Preparar

- **Adicionar item:** exige somente o link; os detalhes opcionais ficam em uma
  seção expansível. Pode-se informar OC, item da OC, produto, quantidade, preço
  estimado, loja, prioridade, prazo e observações.
- **Colar links:** um endereço por linha, até 100 por vez. Links repetidos no
  mesmo lote são incluídos uma única vez.
- Selecionar um item da OC preenche seu produto e sugere a quantidade pendente.
- As estimativas contabilizam apenas itens pendentes que possuem preço e
  quantidade, e informam quantos itens têm esses dados.

## Comprar

- O checkbox marca o item como comprado e registra responsável/data. O check
  simples pode ser desfeito.
- **Comprar e registrar:** abre o formulário existente de pedido ao fornecedor
  com os detalhes conhecidos já preenchidos. É possível completar ou corrigir
  produto, quantidade, custo e pagamento antes de registrar.
- Ao salvar, a API grava pedido e check juntos. Os módulos de OC, financeiro e
  fornecedores são atualizados. Sem OC, a compra fica avulsa.
- Itens já marcados podem usar **Registrar compra** para completar a integração.
- **Ver pedido** abre o pedido vinculado. O checkbox desse item fica protegido;
  correções da compra devem ocorrer no pedido.

As permissões existentes permitem ao Comercial preparar listas; Operações,
Admin e Proprietário também podem confirmar e registrar compras. Financeiro e
Leitor podem consultar. A API valida as mesmas regras.

Busca, filtros por compra/prioridade e progresso funcionam no desktop e celular.
As listas são atualizadas automaticamente a cada 15 segundos e a lista aberta
a cada 8 segundos enquanto o navegador está ativo. A mudança de organização
limpa o estado e o cache. Em conflito, os dados são atualizados e o formulário
continua aberto para revisão, sem sobrescrever alterações de outro membro.

Base remota: `feature/saas-foundation`, commit `afba87d`. Branch de entrega:
`codex/shopping-lists`. O módulo exige a migração `0014_shopping-lists.sql` e a
stack adicional da API; consulte `docs/shopping-lists.md` no repositório API.

## Publicação

Execute `./scripts/deployShoppingLists.ps1` com AWS CLI e as credenciais da
conta configurada. O script compila com a API de produção, preserva os assets
anteriores, copia o `index.html` anterior para `releases/shopping-lists/` no
mesmo bucket e publica os novos assets antes do HTML. A invalidação e o caminho
de rollback ficam registrados em `tmp/shopping-lists-web-release.json`.

Para rollback, copie o `backupIndex` registrado para `s3://moneystack-frontend/index.html`
e invalide `/*` na distribuição `E25QMGVM17EIA6`. Preserve as tabelas das listas
e a stack adicional da API para manter o histórico.
