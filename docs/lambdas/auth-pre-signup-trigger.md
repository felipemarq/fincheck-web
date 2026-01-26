# Lambda: preSignUpTrigger (Cognito PreSignUp)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/auth/cognito/preSignUpTrigger.handler`
- **Evento:** Cognito User Pool Trigger (PreSignUp)
- **Autenticação:** N/A (evento do Cognito)

## Handler
```ts
import { PreSignUpTriggerEvent } from "aws-lambda";

export async function handler(event: PreSignUpTriggerEvent) {
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;
  return event;
}
```

## Handler wrapper
- **Não aplicável:** não usa `lambdaHttpAdapter`.

## Controller / Schema / Use case
- **Não aplicável:** é um handler direto do Cognito.

## Dependências downstream
- **Nenhuma:** o handler só ajusta flags do evento.

## Fluxo para o frontend
1. O frontend não chama este handler diretamente.
2. Durante o signup no Cognito, o trigger marca o usuário como confirmado/verificado automaticamente.
