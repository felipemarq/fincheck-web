# Publicação — 04/10/2026

Disponível em [Listas de compras](https://app.moneystack.com.br/shopping-lists).

- Branch publicada: `codex/shopping-lists`.
- Commit do frontend em produção: `720d55538700cc20987525ca5fca04b259c48c2f`.
- Commit da API em produção: `096bfcf4ff47ac399fd049ccdfb2a39146c8b1a7`.
- Publicado às 02:10 de São Paulo (`2026-10-04T05:10:42Z`).
- CloudFront `E25QMGVM17EIA6`, invalidação `I81XD1NZKZVSYB1X3AZKBSIJYH` concluída.
- HTML publicado idêntico ao build local; JS/CSS com HTTP 200.
- Página aberta no navegador com a sessão existente, sem erros no console.

Lint e build aprovados. A API passou em 95 testes e na verificação autenticada
em produção: check, compra integrada à OC/financeiro, compra avulsa, conflitos,
isolamento entre organizações e repetição sem duplicar pedido. Todos os dados
temporários de teste foram removidos. Desktop e mobile conferidos no navegador.

O HTML anterior está em:
`s3://moneystack-frontend/releases/shopping-lists/20261004-021033-720d55538700cc20987525ca5fca04b259c48c2f/previous-index.html`.
Os assets anteriores foram preservados. O procedimento de rollback está em
[shopping-lists.md](shopping-lists.md); os detalhes da API estão no documento
`docs/shopping-lists-release.md` do repositório `fincheck-api`.
