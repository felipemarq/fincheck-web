# Estado atual do Web

## O que está funcionando

- Login e cadastro
- Solicitação e confirmação de recuperação de senha
- Recuperação transparente de sessão por refresh token
- Carregamento do usuário atual e das entidades
- Troca de entidade ativa com persistência local
- Dashboard com dados reais da API
- Resumo de contas a pagar e contas a receber no dashboard
- Tela dedicada de contas a pagar
- Tela dedicada de contas a receber
- Listagem, criação e edição de cartões
- Listagem, criação, edição e exclusão de contatos
- Configuração mensal de impostos com integração ao dashboard
- Criação, edição e exclusão de transações
- Criação, edição e exclusão de recorrências
- Criação de contas

## Correções estruturais aplicadas neste pacote

- Correção da rota de exclusão de transações para alinhar com a API.
- Sessão local agora guarda refresh token e tenta renovação automática.
- `baseURL` da API passou a ser configurável por ambiente.
- Cache de contas e categorias passou a respeitar a entidade selecionada.
- Sidebar e seletor de entidade foram ajustados para o domínio real PF/PJ.
- `lint` voltou a funcionar com uma baseline compatível com o estado atual do projeto.

## Débitos ainda existentes

- Há bastante código de UI herdado de scaffolds e componentes experimentais.
- O app ainda não cobre os módulos de relatórios e investimentos.
- O bundle de produção ainda está grande e merece uma etapa futura de code splitting.

## Próximo passo recomendado

1. consolidar a experiência de contas a pagar/receber com filtros e ações mais orientadas a cobrança e pagamento
2. abrir o módulo de relatórios
3. ligar investimentos aos endpoints já disponíveis no backend
