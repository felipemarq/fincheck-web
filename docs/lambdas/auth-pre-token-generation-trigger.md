# Lambda: preTokenGenerationTrigger (Cognito PreTokenGeneration)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/auth/cognito/preTokenGenerationTrigger.handler`
- **Evento:** Cognito User Pool Trigger (PreTokenGeneration, V2)
- **Autenticação:** N/A (evento do Cognito)

## Handler
```ts
import { PreTokenGenerationV2TriggerEvent } from "aws-lambda";

export async function handler(event: PreTokenGenerationV2TriggerEvent) {
  console.log("preTokenGenerationTrigger");
  console.log(event);
  event.response = {
    claimsAndScopeOverrideDetails: {
      accessTokenGeneration: {
        claimsToAddOrOverride: {
          internalId: event.request.userAttributes["custom:internalId"],
        },
      },
    },
  };
  return event;
}
```

## Handler wrapper
- **Não aplicável:** não usa `lambdaHttpAdapter`.

## Controller / Schema / Use case
- **Não aplicável:** é um handler direto do Cognito.

## Dependências downstream
- **Nenhuma:** o handler apenas ajusta claims.

## Fluxo para o frontend
1. O frontend não chama este handler diretamente.
2. O Cognito injeta o `internalId` nos claims do access token, usado pelos endpoints privados.
