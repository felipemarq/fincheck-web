# Lambda: createAccount (`POST /accounts`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/accounts/createAccount.handler`
- **Evento:** HTTP API (`POST /accounts`)
- **Autenticação:** Cognito Authorizer

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
import { CreateAccountController } from "@application/controllers/accounts/CreateAccountController";

export const handler = lambdaHttpAdapter(CreateAccountController);
```

## Controller
```ts
import { Schema } from "@kernel/decorators/Schema";

import { Controller } from "@application/contracts/Controller";

import { Injectable } from "@kernel/decorators/Injectable";
import {
  CreateAccountBody,
  createAccountSchema,
} from "./schemas/createAccountSchema";
import { CreateAccountUseCase } from "@application/useCases/accounts/CreateAccountUseCase";
import { Account } from "@application/entities/Account";

@Injectable()
@Schema(createAccountSchema)
export class CreateAccountController extends Controller<
  "private",
  CreateAccountController.Response
> {
  constructor(private readonly createAccountUseCase: CreateAccountUseCase) {
    super();
  }

  protected override async handle({
    userId,
    body,
  }: Controller.Request<"private", CreateAccountBody>): Promise<
    Controller.Response<CreateAccountController.Response>
  > {
    const account = await this.createAccountUseCase.execute({
      userId,
      ...body,
    });

    return {
      statusCode: 201,
      body: {
        account,
      },
    };
  }
}

export namespace CreateAccountController {
  export type Response = {
    account: Account;
  };
}
```

## Schemas de validação
```ts
import { Account } from "@application/entities/Account";
import { z } from "zod";

export const createAccountSchema = z.object({
  entityId: z.string().uuid("Id da entidade inválido"),
  initialBalance: z.number(),
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.nativeEnum(Account.Type),
  color: z.string().optional(),
});

export type CreateAccountBody = z.infer<typeof createAccountSchema>;
```

## Use case
```ts
import { Account } from "@application/entities/Account";
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { AccountRepository } from "@infra/database/neon/repositories/AccountRepository";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class CreateAccountUseCase {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly entityRepository: EntityRepository
  ) {}

  async execute({
    entityId,
    initialBalance,
    name,
    type,
    userId,
    color,
  }: CreateAccountUseCase.Input): Promise<CreateAccountUseCase.Output> {
    const entity = await this.entityRepository.findByUserId({
      userId,
      entityId,
    });

    if (!entity) {
      throw new UnauthorizedException(
        "Usuário não tem permissão para criar contas nessa entidade."
      );
    }

    const account = new Account({
      entityId,
      initialBalance,
      name,
      type,
      userId,
      color,
    });

    const createdAccount = await this.accountRepository.create(account);

    return createdAccount;
  }
}

export namespace CreateAccountUseCase {
  export type Input = {
    userId: string;
    entityId: string;
    name: string;
    initialBalance: number;
    type: Account.Type;
    color?: string;
  };
  export type Output = Account;
}
```

## Dependências downstream
### `AccountRepository`
```ts
import { Account } from "@application/entities/Account";
import { DatabaseService } from "..";
import { accountsTable } from "../schema";
import { AccountItem } from "../items/AccountItem";
import { Injectable } from "@kernel/decorators/Injectable";
import { and, eq } from "drizzle-orm";

@Injectable()
export class AccountRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /** Cria e retorna a entidade criada */
  async create(account: Account): Promise<Account> {
    const rowToInsert = AccountItem.toRow(account);

    // Neon/Drizzle: .returning() retorna as colunas que você quiser (ou todas)
    const [created] = await this.databaseService.db
      .insert(accountsTable)
      .values(rowToInsert)
      .returning();

    // Mapeia de volta p/ entidade (string -> number)
    return AccountItem.fromRow(created);
  }

  async listAll({ entityId, userId }: { entityId: string; userId: string }) {
    const accounts = await this.databaseService.db
      .select()
      .from(accountsTable)
      .where(
        and(
          eq(accountsTable.entityId, entityId),
          eq(accountsTable.userId, userId)
        )
      );

    return accounts.map((account) => AccountItem.fromRow(account));
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

## Fluxo para o frontend
1. A IA/Frontend envia `POST /accounts` com dados da conta e `Authorization: Bearer <token>`.
2. O `lambdaHttpAdapter` resolve o usuário (`internalId`) e instancia o `CreateAccountController`.
3. O controller valida o body com `createAccountSchema` e chama `CreateAccountUseCase`.
4. O use case checa permissão na entidade e cria a conta no repositório.
5. A resposta retorna o objeto `account` criado.
