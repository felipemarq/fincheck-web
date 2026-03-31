# Estado atual do Web

## O que esta funcionando

- Login e cadastro
- Solicitacao e confirmacao de recuperacao de senha
- Recuperacao transparente de sessao por refresh token
- Carregamento do usuario atual e das entidades
- Troca de entidade ativa com persistencia local
- Criacao e edicao de entidades PF/PJ
- Redirecionamento da entidade nova para o fluxo de configuracao inicial
- Tela dedicada de gestao de entidades
- Tela dedicada de gestao de contas
- Dashboard com dados reais da API
- Header e estados vazios mais explicitos sobre qual entidade esta ativa
- Resumo de contas a pagar e contas a receber no dashboard
- Tela dedicada de contas a pagar
- Tela dedicada de contas a receber
- Filtros rapidos por vencidas/hoje/proximos dias
- Agrupamento operacional por contato
- Marcacao direta de pago/recebido nas tabelas de pagar/receber
- Listagem, criacao e edicao de cartoes
- Listagem, criacao, edicao e exclusao de contatos
- Configuracao mensal de impostos com integracao ao dashboard
- Criacao, edicao e exclusao protegida de contas
- Criacao, edicao e exclusao de transacoes
- Criacao, edicao e exclusao de recorrencias

## Correcoes estruturais aplicadas neste pacote

- Correcao da rota de exclusao de transacoes para alinhar com a API.
- Sessao local agora guarda refresh token e tenta renovacao automatica.
- `baseURL` da API passou a ser configuravel por ambiente.
- Cache de contas e categorias passou a respeitar a entidade selecionada.
- Sidebar e seletor de entidade foram ajustados para o dominio real PF/PJ.
- `lint` voltou a funcionar com uma baseline compativel com o estado atual do projeto.
- A gestao de contas agora invalida tambem o dashboard para manter os saldos sincronizados.
- O app passou a persistir o passo de onboarding da entidade para guiar primeira conta e primeira transacao.

## Debitos ainda existentes

- Ha bastante codigo de UI herdado de scaffolds e componentes experimentais.
- O app ainda nao cobre os modulos de relatorios e investimentos.
- O bundle de producao ainda esta grande e merece uma etapa futura de code splitting.

## Proximo passo recomendado

1. abrir o modulo de relatorios por entidade
2. aprofundar visoes gerenciais por categoria e contato
3. ligar investimentos aos endpoints ja disponiveis no backend
