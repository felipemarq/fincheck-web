# Lambda: listAccounts (`GET /entities/{entityId}/accounts`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/accounts/listAccounts.handler`
- **Evento:** HTTP API (`GET /entities/{entityId}/accounts`)
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
import { ListAccountsController } from "@application/controllers/accounts/ListAccountsController";

export const handler = lambdaHttpAdapter(ListAccountsController);
```

## Controller
```ts
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";
import { Account } from "@application/entities/Account";
import { ListAccountsUseCase } from "@application/useCases/accounts/ListAccountsUseCase";
import {
  ListAccountsParams,
  listAccountsParamsSchema,
} from "./schemas/listAccountsParamsSchema";

@Injectable()
export class ListAccountsController extends Controller<
  "private",
  ListAccountsController.Response
> {
  constructor(private readonly listAccountsUseCase: ListAccountsUseCase) {
    super();
  }

  protected override async handle({
    userId,
    body,
    params,
  }: Controller.Request<
    "private",
    Record<string, any>,
    ListAccountsParams
  >): Promise<Controller.Response<ListAccountsController.Response>> {
    const listParams = listAccountsParamsSchema.parse(params);

    const accounts = await this.listAccountsUseCase.execute({
      entityId: listParams.entityId,
      userId,
    });

    return {
      statusCode: 200,
      body: {
        accounts,
      },
    };
  }
}

export namespace ListAccountsController {
  export type Response = { accounts: Account[] };
}
```

## Schemas de validação
```ts
import { z } from "zod";

export const listAccountsParamsSchema = z.object({
  entityId: z.string().uuid(),
});
export type ListAccountsParams = z.infer<typeof listAccountsParamsSchema>;
```

## Use case
```ts
import { Account } from "@application/entities/Account";
import { AccountRepository } from "@infra/database/neon/repositories/AccountRepository";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class ListAccountsUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute({
    entityId,
    userId,
  }: ListAccountsUseCase.Input): Promise<ListAccountsUseCase.Output> {
    const accounts = await this.accountRepository.listAll({
      entityId,
      userId,
    });

    return accounts;
  }
}

export namespace ListAccountsUseCase {
  export type Input = {
    entityId: string;
    userId: string;
  };
  export type Output = Account[];
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

## Fluxo para o frontend
1. A IA/Frontend chama `GET /entities/{entityId}/accounts` com `Authorization`.
2. O controller valida `entityId` via `listAccountsParamsSchema` e chama o use case.
3. O use case busca contas no `AccountRepository` filtrando por `entityId` e `userId`.
4. A resposta retorna `{ accounts }`.
