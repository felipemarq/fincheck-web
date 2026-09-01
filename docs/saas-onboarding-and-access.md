# Experiencia SaaS: onboarding, acesso e assinatura

## Objetivo

Este documento traduz o roadmap de SaaS para a experiencia do Web. O frontend
deve explicar claramente a diferenca entre organizacao, papel do membro, plano,
limite e situacao da assinatura, sem assumir que esconder um botao substitui a
autorizacao da API.

## Principios de experiencia

- O produto possui uma marca de plataforma; cada organizacao possui sua propria
  marca comercial para documentos.
- O usuario enxerga somente modulos permitidos pelo plano e pelo seu papel.
- Acoes indisponiveis sempre explicam se falta permissao, plano ou cota.
- Inadimplencia nao provoca uma tela vazia nem perda aparente de dados.
- Trocar de organizacao troca tambem papel, plano, uso, branding e cache.
- Onboarding conduz rapidamente ate a primeira cotacao com valor real.
- Upgrade deve ser contextual, mas nao pode interromper tarefas com pop-ups
  agressivos.

## Estado atual na branch `feature/saas-foundation`

- `AuthContext` conhece organizacoes acessiveis, papel, permissoes e entidade
  ativa.
- A sidebar e as rotas principais sao filtradas pelas permissoes retornadas por
  `/me`.
- O cadastro exige confirmacao real do e-mail e ainda recebe uma entidade PF
  automatica.
- O modal de entidade pede somente nome, tipo e cor.
- `/settings/team` gerencia membros, papeis e convites; `/invite/:token` atende
  usuario novo ou existente.
- `/settings/organization` gerencia dados comerciais, cor, logo versionada e
  preview dos documentos.
- Nao existem telas de assinatura, consumo ou faturas do SaaS.
- O shell usa a marca neutra MoneyStack e os PDFs usam a identidade do tenant.
- A feature pessoal possui um guard proprio, mas nao representa planos do SaaS.

## Informacao de sessao necessaria

`GET /me` deve oferecer para cada organizacao acessivel:

```ts
type OrganizationAccess = {
  organization: {
    id: string;
    name: string;
    type: 'PF' | 'PJ';
    logoUrl: string | null;
  };
  membership: {
    role: 'OWNER' | 'ADMIN' | 'COMMERCIAL' | 'OPERATIONS' | 'FINANCE' | 'VIEWER';
    permissions: string[];
  };
  subscription: {
    planCode: string;
    planName: string;
    status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'READ_ONLY' | 'CANCELED' | 'EXPIRED';
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  };
  entitlements: Record<string, boolean | number>;
};
```

O contrato final pode reduzir ou agrupar os campos, mas o Web nao deve deduzir
permissoes a partir do nome do plano.

## Guardas e componentes centrais

### `OrganizationGuard`

Garante que uma organizacao acessivel esteja ativa. Quem ainda nao possui uma
organizacao segue para o onboarding; quem recebeu convite segue para o aceite.

### `PermissionGuard`

Controla rotas e acoes pelo conjunto de permissoes do membro. Uma rota negada
mostra uma pagina clara de acesso insuficiente, sem sugerir upgrade.

### `EntitlementGuard`

Controla modulos do plano. Quando o membro puder gerenciar cobranca, oferece a
comparacao de planos. Para os demais membros, orienta procurar o proprietario.

### `SubscriptionGuard`

Aplica a situacao da assinatura. Em `PAST_DUE`, mostra aviso e prazo. Em
`READ_ONLY` ou `EXPIRED`, preserva navegacao, consulta e exportacao, mas bloqueia
mutacoes com uma explicacao consistente.

### `QuotaBoundary`

Exibe uso, limite e proximo reset. O componente nao estima o consumo localmente;
usa os numeros confirmados pela API e trata `QUOTA_EXCEEDED` como fonte final.

## Navegacao alvo

### Rotas publicas

- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `/invite/:token`
- `/pricing`
- `/terms`
- `/privacy`

### Onboarding

- `/onboarding/account`
- `/onboarding/organization`
- `/onboarding/trial`
- `/onboarding/branding`
- `/onboarding/team`
- `/onboarding/first-customer`
- `/onboarding/first-product`
- `/onboarding/first-quotation`

O wizard salva cada etapa na API e pode ser retomado. Logo, equipe e importacao
de produtos sao pulaveis; organizacao e aceite dos termos nao sao.

### Configuracoes da organizacao

- `/settings/organization`
- `/settings/branding`
- `/settings/members`
- `/settings/subscription`
- `/settings/usage`
- `/settings/audit`

`/settings/subscription` e acoes de cobranca exigem `billing.manage`.
`/settings/audit` aparece somente quando o plano e o papel permitirem.

## Onboarding recomendado

### Etapa 1 - conta

O cadastro solicita nome, e-mail e senha. A interface deixa claro que o e-mail
precisa ser verificado. O usuario retorna ao ponto em que parou depois da
confirmacao.

### Etapa 2 - organizacao

Campos iniciais:

- nome fantasia
- razao social
- tipo PF ou PJ
- CPF ou CNPJ
- telefone comercial
- e-mail comercial
- endereco

Validacoes de documento ajudam a digitacao, mas a API confirma e normaliza.

### Etapa 3 - trial

O trial Profissional de 14 dias inicia sem cartao. A tela informa data final,
limites e o que ocorre depois. Nao deve simular que o plano ja foi pago.

### Etapa 4 - identidade visual

Upload por arrastar ou selecionar arquivo, com preview do cabecalho da cotacao.
Aceitar PNG, JPEG e WebP dentro do limite definido pela API. A interface oferece
corte/encaixe simples, mas preserva o arquivo original validado no servidor.

### Etapa 5 - equipe

O proprietario convida por e-mail e escolhe um papel com descricao em linguagem
de negocio. Essa etapa e opcional e respeita a cota de membros do trial.

### Etapas 6 a 8 - primeiro valor

O fluxo reutiliza clientes, produtos e cotacoes existentes. Uma barra de
progresso curta conduz a primeira cotacao, sem criar uma segunda versao das
telas de negocio.

## Sidebar e acoes

A sidebar passa a ser derivada de uma declaracao unica:

```ts
type NavigationItem = {
  label: string;
  path: string;
  requiredPermission?: string;
  requiredEntitlement?: string;
};
```

Regras visuais:

- Sem permissao do papel: ocultar o modulo quando nao houver nenhuma leitura.
- Sem entitlement do plano: exibir bloqueado somente em contextos de descoberta
  ou na pagina de planos, evitando uma sidebar cheia de propaganda.
- Em somente leitura: manter rotas e remover/desabilitar acoes de mutacao.
- Ao trocar organizacao: cancelar consultas em andamento e limpar caches
  delimitados pelo `entityId` antes de carregar o novo acesso.

O Web nao deve manter uma matriz paralela de papeis. Ele recebe permissoes
efetivas da API e usa chaves somente para apresentacao.

## Estados de bloqueio

### Falta de permissao

Mensagem: "Seu papel nesta organizacao nao permite esta acao." O CTA, quando
util, leva a lista de membros ou orienta falar com um administrador.

### Recurso fora do plano

Mensagem: "Este recurso nao faz parte do plano atual." Proprietario recebe CTA
para comparar planos; outro membro recebe orientacao para falar com o owner.

### Cota atingida

Mensagem apresenta metrica, consumo, limite e data de renovacao. Quando a cota
for de registros ativos, oferece atalho para arquivar registros elegiveis.

### Pagamento em atraso

Durante tolerancia, um banner persistente informa prazo e acao de regularizacao.
Depois, um banner de somente leitura preserva a navegacao e explica que os dados
continuam seguros.

### Assinatura cancelada

Mostra acesso ate o fim do periodo. Depois do vencimento, oferece reativacao ao
proprietario sem esconder dados historicos.

## Planos e checkout

A comparacao inicial possui Essencial e Profissional. O plano atual, consumo e
periodicidade ficam explicitos. Precos e limites devem vir da API para que o Web
nao tenha uma tabela comercial divergente.

Fluxo:

1. escolher plano mensal ou anual
2. revisar valor, periodo e mudanca de limites
3. solicitar checkout a API
4. redirecionar para pagina hospedada do provedor
5. retornar a `/settings/subscription/result`
6. mostrar processamento enquanto o webhook nao confirmar
7. atualizar acesso somente quando a API retornar o novo estado

O frontend nunca envia nem armazena dados completos de cartao.

## Branding da plataforma e do tenant

Antes do lancamento SaaS, a marca fixa da JC deve sair de:

- login, cadastro e recuperacao de senha
- favicon, titulo e metadados do app
- cabecalho e rodape globais
- fallback dos PDFs

A logo da organizacao pode aparecer no seletor e no preview dos documentos,
mas nao substitui a marca global do produto. A cotacao emitida usa a versao de
logo e os dados comerciais congelados pela API.

## Telemetria de produto

Eventos iniciais, sem dados sensiveis:

- `onboarding_started`
- `organization_created`
- `branding_uploaded`
- `member_invited`
- `first_customer_created`
- `first_product_created`
- `first_quotation_issued`
- `trial_expiring`
- `checkout_started`
- `subscription_activated`
- `quota_reached`
- `subscription_canceled`

Os eventos usam IDs internos, nunca nome de cliente, produto, CPF, CNPJ ou corpo
de cotacao.

## Roadmap do Web

### Fase A - fundacao de acesso

**Status local:** tipos, `AuthContext`, guardas e sidebar concluidos. Ainda falta
ocultar ou desabilitar todas as acoes internas e testar o fluxo em ambiente com
a migracao aplicada.

- adaptar tipos e `AuthContext` para associacoes
- implementar guardas centrais e erros estruturados
- tornar sidebar e acoes sensiveis a permissoes
- testar troca de organizacao e limpeza de cache

### Fase B - configuracoes e branding

**Status publicado:** perfil, logo, preview, shell neutro e PDFs por tenant
implementados. A migracao `0013`, a API e o Web foram publicados no ambiente
`dev` em 2026-08-30. O QA visual autenticado com documentos curtos, longos, com
logo e sem logo continua pendente.

- criar perfil da organizacao e upload de logo
- criar preview de documento
- tornar exportadores de PDF independentes da marca JC
- congelar e respeitar o snapshot de cotacao emitida

### Fase C - membros

**Status local:** listagem, convite por link, revogacao, troca de papel, aceite e
protecao do proprietario concluidos. Reenvio por e-mail e cota de assentos ficam
para a fase de planos.

- listar membros e convites
- convidar, reenviar, revogar e trocar papel
- implementar aceite para usuario novo e existente
- tratar cota de assentos e protecao do proprietario

### Fase D - planos e limites

- criar comparacao de planos e painel de consumo
- aplicar bloqueios contextuais por entitlement e cota
- implementar banners de trial e ciclo da assinatura
- preservar modo somente leitura em todas as mutacoes

### Fase E - checkout e autosservico

- iniciar checkout hospedado
- criar tela de retorno em processamento
- mostrar historico e situacao das cobrancas retornadas pela API
- implementar upgrade, downgrade agendado, cancelamento e reativacao

### Fase F - onboarding completo

- remover a criacao automatica de PF da experiencia
- implementar wizard retomavel
- conduzir ao primeiro cliente, produto e cotacao
- cobrir fluxos de convite e organizacao sem assinatura

## Cenarios E2E obrigatorios

- owner cria organizacao, envia logo e emite cotacao
- usuario convidado aceita e enxerga somente o papel recebido
- membro comercial nao acessa financeiro
- membro de operacoes nao cria cotacao chamando UI ou API
- organizacao Essencial atinge cota e recebe orientacao correta
- upgrade permanece em processamento ate o webhook
- evento duplicado nao muda a interface duas vezes
- inadimplencia entra em tolerancia e depois somente leitura
- troca de organizacao nao mostra dados ou permissao do tenant anterior
- troca de logo nao altera o PDF de uma cotacao emitida
- organizacao atual da JC continua operando depois da migracao

## Fora do MVP SaaS

- papeis customizaveis
- SSO corporativo
- faturamento por assento variavel
- cupons e afiliados
- multiplas filiais dentro do mesmo tenant
- cobranca por consumo excedente
- white-label completo da aplicacao
- impersonacao de usuario pelo suporte
- geracao e armazenamento server-side de todos os PDFs

Essas evolucoes so devem ser priorizadas depois de medir o uso do piloto.
