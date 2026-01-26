# Lambda: customMessageTrigger (Cognito CustomMessage)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/auth/cognito/customMessageTrigger.handler`
- **Evento:** Cognito User Pool Trigger (CustomMessage)
- **Autenticação:** N/A (evento do Cognito)

## Handler
```ts
import ForgotPassword from "@infra/emails/templates/auth/forgotPassword";
import { render } from "@react-email/render";
import { CustomMessageTriggerEvent } from "aws-lambda";

export async function handler(event: CustomMessageTriggerEvent) {
  console.log("Evento recebido:", JSON.stringify(event, null, 2));

  if (event.triggerSource === "CustomMessage_ForgotPassword") {
    const confirmationCode = event.request.codeParameter;
    const email = event.request.userAttributes?.email;

    console.log("Código de confirmação:", confirmationCode);
    console.log("E-mail de destino:", email);

    const html = await render(ForgotPassword({ confirmationCode }));
    console.log("HTML gerado para o e-mail:", html);

    event.response.emailSubject = "💰 Moneystack✅ | Recupere a sua conta!";
    event.response.emailMessage = html;
  }

  return event;
}
```

## Handler wrapper
- **Não aplicável:** não usa `lambdaHttpAdapter`.

## Controller / Schema / Use case
- **Não aplicável:** é um handler direto do Cognito.

## Dependências downstream
### Template de e-mail `ForgotPassword`
```tsx
import { Column } from "@react-email/column";
import { Heading } from "@react-email/heading";
import { Html } from "@react-email/html";
import { Row } from "@react-email/row";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import React from "react";

import { TailwindConfig } from "@infra/emails/components/TailwindConfig";
import { Img } from "@react-email/img";

interface IForgotPasswordProps {
  confirmationCode: string;
}

export default function ForgotPassword({
  confirmationCode,
}: IForgotPasswordProps) {
  return (
    <TailwindConfig>
      <Html>
        <Section>
          <Row>
            <Column className="font-sans text-center pt-10">
              <Img
                src="https://i.imgur.com/kKthsu8.png"
                alt="logo"
                height="50"
              />
              <Heading as="h1" className="text-2xl leading-[0]">
                Recupere a sua conta
              </Heading>
              <Heading as="h2" className="font-normal text-base text-gray-600">
                Resete a sua senha e volte ao foco 💪
              </Heading>
            </Column>
          </Row>

          <Row>
            <Column className="text-center pt-10">
              <span className="bg-gray-200 inline-block px-8 py-4 text-3xl font-sans rounded-md font-bold tracking-[16px]">
                {confirmationCode}
              </span>
            </Column>
          </Row>

          <Row>
            <Column className="font-sans text-center pt-10">
              <Text className="text-sm text-gray-600 ">
                Se você não solicitou esta troca, fique tranquilo, sua conta
                continua segura!
              </Text>
            </Column>
          </Row>
        </Section>
      </Html>
    </TailwindConfig>
  );
}

ForgotPassword.PreviewProps = {
  confirmationCode: "336318",
};
```

### Componente `TailwindConfig`
```tsx
import { Tailwind } from "@react-email/tailwind";
import React from "react";

interface ITailwindConfigProps {
  children: React.ReactNode;
}

export function TailwindConfig({ children }: ITailwindConfigProps) {
  return (
    <Tailwind
      config={{
        theme: {
          extend: {
            colors: {
              foodiary: {
                green: "#64A30D",
              },
              gray: {
                600: "#A1A1AA",
              },
            },
          },
        },
      }}
    >
      {children}
    </Tailwind>
  );
}
```

## Fluxo para o frontend
1. O frontend não chama este handler diretamente.
2. Durante o fluxo de recuperação de senha, o Cognito dispara o trigger que customiza o conteúdo do e-mail.
