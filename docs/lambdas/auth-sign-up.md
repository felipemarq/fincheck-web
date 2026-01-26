# Lambda: signUp (`POST /auth/sign-up`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/auth/signUp.handler`
- **Evento:** HTTP API (`POST /auth/sign-up`)
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
import { SignUpController } from "@application/controllers/auth/SignUpController";

export const handler = lambdaHttpAdapter(SignUpController);
```

## Controller
```ts
import { Injectable } from "@kernel/decorators/Injectable";
import { Schema } from "@kernel/decorators/Schema";

import { SignUpUseCase } from "@application/useCases/auth/SignUpUseCase";

import { Controller } from "@application/contracts/Controller";
import { SignUpBody, signUpSchema } from "./schemas/signUpSchema";

@Injectable()
@Schema(signUpSchema)
export class SignUpController extends Controller<
  "public",
  SignUpController.Response
> {
  constructor(private readonly signUpUseCase: SignUpUseCase) {
    super();
  }

  protected override async handle({
    body,
  }: Controller.Request<"public", SignUpBody>): Promise<
    Controller.Response<SignUpController.Response>
  > {
    const { email, name, password } = body;

    const { accessToken, refreshToken } = await this.signUpUseCase.execute({
      email,
      name,
      password,
    });

    return {
      statusCode: 201,
      body: {
        accessToken,
        refreshToken,
      },
    };
  }
}

export namespace SignUpController {
  export type Response = {
    accessToken: string;
    refreshToken: string;
  };
}
```

## Schemas de validação
```ts
import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  password: z
    .string({ message: "Password should be a string" })
    .min(8, "Password is too short"),
  email: z.string().min(5, "Email is too short").email("Invalid email"),
});

export type SignUpBody = z.infer<typeof signUpSchema>;
```

## Use case
```ts
import { Entity } from "@application/entities/Entity";
import { User } from "@application/entities/User";
import { BadRequestException } from "@application/errors/http/BadRequestException";
import { ConflictException } from "@application/errors/http/ConflictException";
import { CategoryRepository } from "@infra/database/neon/repositories/CategoryRepository";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { UserRepository } from "@infra/database/neon/repositories/UserRepository";
import { AuthGateway } from "@infra/gateways/AuthGateway";
import { Injectable } from "@kernel/decorators/Injectable";
import { Saga } from "@shared/saga/saga";

@Injectable()
export class SignUpUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly userRepository: UserRepository,
    private readonly entityRepository: EntityRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly saga: Saga
  ) {}
  async execute({
    email,
    name,
    password,
  }: SignUpUseCase.Input): Promise<SignUpUseCase.Output> {
    return this.saga.run(async () => {
      const userAlreadyExists = await this.userRepository.findByEmail(email);

      if (userAlreadyExists) {
        throw new ConflictException("Este email já está cadastrado.");
      }
      const user = new User({ email, name });

      const pendingUser = await this.userRepository.create(user);

      //SignUp Unit of Work

      if (!pendingUser) {
        throw new BadRequestException("Erro ao criar usuário");
      }

      const entity = new Entity({
        name: pendingUser.name,
        ownerUserId: pendingUser.id,
      });

      const createdEntity = await this.entityRepository.create(entity);

      const { externalId } = await this.authGateway.signUp({
        email,
        password,
        internalId: pendingUser.id,
      });

      await this.userRepository.setExternalId(externalId, pendingUser.id);
      await this.categoryRepository.seedDefault({
        entityId: createdEntity.id,
        userId: pendingUser.id,
      });

      this.saga.addCompensation(() =>
        this.userRepository.delete(pendingUser.id)
      );
      this.saga.addCompensation(() =>
        this.authGateway.deleteUser({ externalId })
      );

      const { accessToken, refreshToken } = await this.authGateway.signIn({
        email,
        password,
      });
      return { accessToken, refreshToken };
    });
  }
}

export namespace SignUpUseCase {
  export type Input = { email: string; password: string; name: string };
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

### `UserRepository`
```ts
import { Injectable } from "@kernel/decorators/Injectable";
import { DatabaseService } from "..";
import { usersTable } from "../schema";
import { User } from "@application/entities/User";
import { eq } from "drizzle-orm";

@Injectable()
export class UserRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(user: User) {
    const { name, email } = user;
    const [userCreated] = await this.databaseService.db
      .insert(usersTable)
      .values({ name, email })
      .returning({
        id: usersTable.id,
        name: usersTable.name,
      });

    return userCreated;
  }

  async findByEmail(email: string) {
    const [user] = await this.databaseService.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      return null;
    }
    return new User({ ...user, externalId: user?.externalId ?? undefined });
  }

  async setExternalId(externalId: string, userId: string) {
    const user = await this.databaseService.db
      .update(usersTable)
      .set({
        externalId: externalId,
      })
      .where(eq(usersTable.id, userId))
      .returning();
  }

  async delete(userId: string) {
    await this.databaseService.db
      .delete(usersTable)
      .where(eq(usersTable.id, userId));
  }
}
```

### `EntityRepository`
```ts
import { Injectable } from "@kernel/decorators/Injectable";
import { DatabaseService } from "..";
import { entitiesTable, usersTable } from "../schema";
import { and, eq } from "drizzle-orm";
import { Entity } from "@application/entities/Entity";

@Injectable()
export class EntityRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(entity: Entity) {
    const { name, ownerUserId, type } = entity;
    const [entityCreated] = await this.databaseService.db
      .insert(entitiesTable)
      .values({ name, ownerUserId, type })
      .returning(/* {
        id: entitiesTable.id,
      } */);

    return entityCreated;
  }

  async findByUserId({
    userId,
    entityId,
  }: {
    userId: string;
    entityId: string;
  }) {
    const [entity] = await this.databaseService.db
      .select()
      .from(entitiesTable)
      .where(
        and(
          eq(entitiesTable.ownerUserId, userId),
          eq(entitiesTable.id, entityId)
        )
      );

    return entity;
  }

  async delete(userId: string) {
    await this.databaseService.db
      .delete(usersTable)
      .where(eq(usersTable.id, userId));
  }
}
```

### `CategoryRepository`
```ts
import { Account } from "@application/entities/Account";
import { DatabaseService } from "..";
import { accountsTable, categoriesTable, transactionsTable } from "../schema";
import { AccountItem } from "../items/AccountItem";
import { Injectable } from "@kernel/decorators/Injectable";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { ListCategoriesQuery } from "@application/controllers/categories/schemas/listCategoriesQuerySchema";
import { Category } from "@application/entities/Category";
import { CategoryItem } from "../items/CategoryItem";

export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
}> = [
  // INCOME
  { name: "Salário", type: "INCOME", icon: "salary" },
  { name: "Vendas", type: "INCOME", icon: "sale" },
  { name: "Rendimentos", type: "INCOME", icon: "trending-up" },

  // EXPENSE
  { name: "Aluguel", type: "EXPENSE", icon: "home" },
  { name: "Alimentação", type: "EXPENSE", icon: "food" },
  { name: "Transporte", type: "EXPENSE", icon: "transport" },
  { name: "Saúde", type: "EXPENSE", icon: "health" },
  { name: "Educação", type: "EXPENSE", icon: "edication" },
  { name: "Lazer", type: "EXPENSE", icon: "fun" },
  { name: "Impostos", type: "EXPENSE", icon: "tax" },
];

@Injectable()
export class CategoryRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async seedDefault({
    entityId,
    userId,
  }: {
    entityId: string;
    userId: string;
  }) {
    const values = DEFAULT_CATEGORIES.map((c) => ({
      entityId,
      userId,
      name: c.name,
      icon: c.icon,
      type: c.type, // 'INCOME' | 'EXPENSE'
    }));
    const insertedCategories = await this.databaseService.db
      .insert(categoriesTable)
      .values(values)
      .onConflictDoNothing({
        target: [
          categoriesTable.entityId,
          categoriesTable.name,
          categoriesTable.type,
        ],
      })
      .returning();

    return insertedCategories;
  }

  async listAll({
    filters,
    userId,
  }: {
    filters: ListCategoriesQuery;
    userId: string;
  }): Promise<Category[]> {
    const whereClause = [
      eq(categoriesTable.entityId, filters.entityId),
      eq(categoriesTable.userId, userId),
    ];

    const whereExpr = and(...whereClause);

    const cards = await this.databaseService.db
      .select()
      .from(categoriesTable)
      .where(whereExpr);

    return cards.map((row) => CategoryItem.fromRow(row));
  }

  async getTopCategories(
    entityId: string,
    userId: string,
    from: Date,
    to: Date,
    topN: number
  ) {
    const rows = await this.databaseService.db
      .select({
        categoryId: transactionsTable.categoryId,
        name: categoriesTable.name,
        icon: categoriesTable.icon,
        amount: sql<number>`sum((${transactionsTable.value})::numeric)`,
      })
      .from(transactionsTable)
      .innerJoin(
        categoriesTable,
        and(
          eq(categoriesTable.id, transactionsTable.categoryId),
          eq(categoriesTable.entityId, entityId)
        )
      )
      .where(
        and(
          eq(transactionsTable.entityId, entityId),
          eq(transactionsTable.userId, userId),
          eq(transactionsTable.type, "EXPENSE"),
          gte(transactionsTable.date, from),
          lte(transactionsTable.date, to)
        )
      )
      .groupBy(
        transactionsTable.categoryId,
        categoriesTable.name,
        categoriesTable.icon
      )
      .orderBy(desc(sql`sum((${transactionsTable.value})::numeric)`))
      .limit(topN);
    return rows;
  }
}
```

### `Saga`
```ts
import { Injectable } from "@kernel/decorators/Injectable";

type CompensationFn = () => Promise<void>;

@Injectable()
export class Saga {
  private compensations: CompensationFn[] = [];

  addCompensation(fn: CompensationFn) {
    this.compensations.unshift(fn);
  }

  async run<TResult>(fn: () => Promise<TResult>) {
    try {
      return await fn();
    } catch (error) {
      await this.compensate();
      throw error;
    }
  }

  async compensate() {
    for await (const compensation of this.compensations) {
      try {
        await compensation();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(error);
      }
    }
  }
}
```

## Fluxo para o frontend
1. A IA/Frontend envia `POST /auth/sign-up` com `name`, `email` e `password`.
2. O `lambdaHttpAdapter` faz parsing de body/params/query e instancia o `SignUpController` via DI.
3. O controller valida o body com `signUpSchema` e aciona o `SignUpUseCase`.
4. O use case cria usuário no banco, entidade default, cadastra o usuário no Cognito e faz login retornando `accessToken` e `refreshToken`.
5. O frontend deve armazenar os tokens e seguir usando `Authorization: Bearer <token>` nos endpoints privados.
