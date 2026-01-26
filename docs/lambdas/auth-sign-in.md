# Lambda: signIn (`POST /auth/sign-in`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/auth/signIn.handler`
- **Evento:** HTTP API (`POST /auth/sign-in`)
- **Autenticação:** pública (sem Cognito Authorizer)

## Handler wrapper
```ts
import { Controller } from "@application/contracts/Controller";
import { ApplicationError } from "@application/errors/application/ApplicationError";
import { ErrorCode } from "@application/errors/ErrorCode";
import { HttpError } from "@application/errors/http/HttpError";
import { Registry } from "@kernel/di/Registry";
import { lambdaBodyParser } from "@main/utils/lambdaBodyParser";
import { lambdaErrorResponse } from "@main/utils/lambdaErrorResponse";
import { Constructor } from "@shared/types/Constructor";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { ZodError } from "zod";

type Event = APIGatewayProxyEventV2 | APIGatewayProxyEventV2WithJWTAuthorizer;

export function lambdaHttpAdapter(
  controllerImpl: Constructor<Controller<any, unknown>>
) {
  return async (event: Event): Promise<APIGatewayProxyResultV2> => {
    try {
      const controller = Registry.getInstance().resolve(controllerImpl);
      const body = lambdaBodyParser(event.body);
      const params = event.pathParameters ?? {};
      const queryParams = event.queryStringParameters ?? {};
      const userId =
        "authorizer" in event.requestContext
          ? (event.requestContext.authorizer.jwt.claims.internalId as string)
          : null;

      console.log({
        params,
        queryParams,
        body,
      });
      if ("authorizer" in event.requestContext) {
        console.log(
          JSON.stringify(
            {
              internalId: event.requestContext.authorizer.jwt.claims.internalId,
            },
            null,
            2
          )
        );
      }

      const response = await controller.execute({
        body,
        params,
        queryParams,
        userId,
      });

      return {
        statusCode: response.statusCode,
        body: response.body ? JSON.stringify(response.body) : undefined,
      };
    } catch (error) {
      console.log(error);
      if (error instanceof ZodError) {
        return lambdaErrorResponse({
          code: ErrorCode.VALIDATION,
          message: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
          statusCode: 400,
        });
      }

      if (error instanceof HttpError) {
        return lambdaErrorResponse(error);
      }

      if (error instanceof ApplicationError) {
        return lambdaErrorResponse({
          statusCode: error.statusCode ?? 400,
          code: error.code,
          message: error.message,
        });
      }

      console.log("Internal server error", error);

      return lambdaErrorResponse({
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
        statusCode: 500,
      });
    }
  };
}
```

## Handler
```ts
import "reflect-metadata";
import { lambdaHttpAdapter } from "@main/adapters/lambdaHttpAdapter";
import { SignInController } from "@application/controllers/auth/SignInController";

export const handler = lambdaHttpAdapter(SignInController);
```

## Controller
```ts
import { Schema } from "@kernel/decorators/Schema";

import { Controller } from "@application/contracts/Controller";

import { Injectable } from "@kernel/decorators/Injectable";
import { SignInUseCase } from "@application/useCases/auth/SignInUseCase";
import { SignInBody, signInSchema } from "./schemas/signInSchema";

@Injectable()
@Schema(signInSchema)
export class SignInController extends Controller<
  "public",
  SignInController.Response
> {
  constructor(private readonly signInUseCase: SignInUseCase) {
    super();
  }

  protected override async handle({
    body,
  }: Controller.Request<"public", SignInBody>): Promise<
    Controller.Response<SignInController.Response>
  > {
    const { email, password } = body;
    const { accessToken, refreshToken } = await this.signInUseCase.execute({
      email,
      password,
    });
    return {
      statusCode: 200,
      body: {
        accessToken,
        refreshToken,
      },
    };
  }
}

export namespace SignInController {
  export type Response = {
    accessToken: string;
    refreshToken: string;
  };
}
```

## Schemas de validação
```ts
import { z } from "zod";

export const signInSchema = z.object({
  password: z
    .string({ message: "Password should be a string" })
    .min(8, "Password is too short"),
  email: z.string().min(5, "Email is too short").email("Invalid email"),
});

export type SignInBody = z.infer<typeof signInSchema>;
```

## Use case
```ts
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { AuthGateway } from "@infra/gateways/AuthGateway";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class SignInUseCase {
  constructor(private readonly authGateway: AuthGateway) {}
  async execute({
    email,
    password,
  }: SignInUseCase.Input): Promise<SignInUseCase.Output> {
    try {
      const { accessToken, refreshToken } = await this.authGateway.signIn({
        email,
        password,
      });
      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException("Email ou senha inválidos.");
    }
  }
}

export namespace SignInUseCase {
  export type Input = {
    email: string;
    password: string;
  };
  export type Output = {
    accessToken: string;
    refreshToken: string;
  };
}
```

## Dependências downstream
### `AuthGateway`
```ts
import { InvalidRefreshToken } from "@application/errors/application/InvalidRefreshToken";
import {
  AdminDeleteUserCommand,
  CognitoIdentityProvider,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  GetTokensFromRefreshTokenCommand,
  InitiateAuthCommand,
  RefreshTokenReuseException,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cognitoClient } from "@infra/clients/cognitoClient";
import { Injectable } from "@kernel/decorators/Injectable";
import { AppConfig } from "@shared/config/AppConfig";

import { createHmac } from "crypto";

@Injectable()
export class AuthGateway {
  constructor(private readonly appConfig: AppConfig) {}
  async signUp({
    email,
    password,
    internalId,
  }: AuthGateway.SignUpParams): Promise<AuthGateway.SignUpResult> {
    const command = new SignUpCommand({
      ClientId: this.appConfig.auth.cognito.client.id,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: "custom:internalId", Value: internalId }],
      SecretHash: this.getSecretHash(email),
    });

    const { UserSub: externalId } = await cognitoClient.send(command);
    if (!externalId) {
      throw new Error("Cannot signup user: " + email);
    }
    return {
      externalId,
    };
  }

  async signIn({
    email,
    password,
  }: AuthGateway.SignInParams): Promise<AuthGateway.SignInResult> {
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: this.appConfig.auth.cognito.client.id,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: this.getSecretHash(email),
      },
    });

    const { AuthenticationResult } = await cognitoClient.send(command);

    if (
      !AuthenticationResult?.RefreshToken ||
      !AuthenticationResult?.AccessToken
    ) {
      throw new Error("Cannot signin user: " + email);
    }

    return {
      accessToken: AuthenticationResult?.AccessToken,
      refreshToken: AuthenticationResult?.RefreshToken,
    };
  }

  async refreshToken({
    refreshToken,
  }: AuthGateway.RefreshTokenParams): Promise<AuthGateway.RefreshTokenResult> {
    try {
      const command = new GetTokensFromRefreshTokenCommand({
        ClientId: this.appConfig.auth.cognito.client.id,
        RefreshToken: refreshToken,
        ClientSecret: this.appConfig.auth.cognito.client.secret,
      });

      const { AuthenticationResult } = await cognitoClient.send(command);

      if (
        !AuthenticationResult?.RefreshToken ||
        !AuthenticationResult?.AccessToken
      ) {
        throw new Error("Cannot refresh token.");
      }

      return {
        accessToken: AuthenticationResult?.AccessToken,
        refreshToken: AuthenticationResult?.RefreshToken,
      };
    } catch (error) {
      /*  if (error instanceof RefreshTokenReuseException) {
        throw new InvalidRefreshToken();
      } */

      throw new InvalidRefreshToken();
    }
  }

  async forgotPassword({
    email,
  }: AuthGateway.ForgotPasswordParams): Promise<void> {
    const command = new ForgotPasswordCommand({
      ClientId: this.appConfig.auth.cognito.client.id,
      Username: email,
      SecretHash: this.getSecretHash(email),
    });

    await cognitoClient.send(command);
  }

  async confirmForgotPassword({
    email,
    confirmationCode,
    password,
  }: AuthGateway.ConfirmForgotPasswordParams): Promise<void> {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: this.appConfig.auth.cognito.client.id,
      ConfirmationCode: confirmationCode,
      Password: password,
      Username: email,
      SecretHash: this.getSecretHash(email),
    });

    await cognitoClient.send(command);
  }

  async deleteUser({ externalId }: AuthGateway.DeleteUserParams) {
    const command = new AdminDeleteUserCommand({
      UserPoolId: this.appConfig.auth.cognito.pool.id,
      Username: externalId,
    });

    await cognitoClient.send(command);
  }

  private getSecretHash(email: string) {
    const { id, secret } = this.appConfig.auth.cognito.client;
    const secretHash = createHmac("SHA256", secret)
      .update(`${email}${id}`)
      .digest("base64");

    return secretHash;
  }
}

export namespace AuthGateway {
  export type SignUpParams = {
    email: string;
    password: string;
    internalId: string;
  };
  export type SignUpResult = { externalId: string };

  export type SignInParams = { email: string; password: string };
  export type SignInResult = { accessToken: string; refreshToken: string };

  export type RefreshTokenParams = { refreshToken: string };
  export type RefreshTokenResult = {
    accessToken: string;
    refreshToken: string;
  };

  export type ForgotPasswordParams = { email: string };

  export type ConfirmForgotPasswordParams = {
    email: string;
    confirmationCode: string;
    password: string;
  };

  export type DeleteUserParams = { externalId: string };
}
```

## Fluxo para o frontend
1. A IA/Frontend envia `POST /auth/sign-in` com `email` e `password`.
2. O `lambdaHttpAdapter` instancia `SignInController` e valida o body com `signInSchema`.
3. O use case chama o `AuthGateway` para autenticar no Cognito.
4. Em caso de sucesso, retorna `accessToken` e `refreshToken`.
