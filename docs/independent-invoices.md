# Notas fiscais

Branch: `codex/independent-invoices`.

`/invoices` reúne notas com e sem OC. O cadastro permite selecionar uma ordem ou
informar livremente cliente, itens, valores, emissão e vencimento. O vencimento
inicial é 30 dias após a emissão, ajustável pelo usuário. Após uma baixa, os valores
ficam bloqueados e somente vencimento/observações permanecem editáveis.

`/receivables` usa a mesma carteira e os mesmos pagamentos. Sem OC, a interface
mostra “Sem ordem de compra”; não cria uma ordem fictícia. O painel apresenta o
faturamento pela emissão das notas e mantém custos/margens operacionais das OCs
em indicadores distintos. Atualização automática a cada minuto e invalidação
após salvar notas/recebimentos.

O perfil do usuário continua controlando os botões de cadastro/edição e baixa.
A data inicial segue `America/Sao_Paulo`, evitando virar o dia às 21h locais.
Não há importação de XML nem conciliação automática de extrato nesta entrega.

Use `corepack pnpm@10.5.2 run lint` e `corepack pnpm@10.5.2 run build` para validar.
O deploy deve publicar assets antes do HTML e preservar o HTML anterior para
rollback, no bucket `moneystack-frontend` e distribuição `E25QMGVM17EIA6`, sempre
com perfil AWS `felipe` e conta `379443323181` verificada. Veja também a documentação
de implantação do módulo de notas no repositório da API; não publique a stack
principal antiga.

Publicado em 03/11/2026 (São Paulo): código Web
`7d0499e4b9b650e692ff62916332b2a6d6372394`, branch
`codex/independent-invoices`. A invalidação
`I28GB9JQW2ZRGMU12RV2Y5QHV6` foi concluída. HTML e assets publicados foram
verificados, assim como o formulário e os registros antigos na sessão existente.
O relatório completo está em `fincheck-api/docs/independent-invoices-release.md`.
