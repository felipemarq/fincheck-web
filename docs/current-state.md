# Estado atual do Web

## O que está funcionando

- Login e cadastro
- Recuperação transparente de sessão por refresh token
- Carregamento do usuário atual e das entidades
- Troca de entidade ativa com persistência local
- Dashboard com dados reais da API
- Listagem, criação e edição de cartões
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
- O app ainda não cobre os módulos de relatórios, contatos e investimentos.
- O fluxo visual de recuperação de senha ainda não foi implementado no frontend.
- O bundle de produção ainda está grande e merece uma etapa futura de code splitting.

## Próximo passo recomendado

1. consolidar a experiência do dashboard e das tabelas principais
2. abrir o módulo de cartões
3. ligar impostos e relatórios a partir dos endpoints já disponíveis no backend
