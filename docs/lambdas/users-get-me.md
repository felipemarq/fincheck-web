# Lambda: getMe (`GET /me`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/users/getMe.handler`
- **Evento:** HTTP API (`GET /me`)
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
import { GetMeController } from "@application/controllers/users/GetMeController";

export const handler = lambdaHttpAdapter(GetMeController);
```

## Controller
```ts
import { Controller } from "@application/contracts/Controller";
import { Entity } from "@application/entities/Entity";
import { User } from "@application/entities/User";
import { GetMeQuery } from "@application/queries/GetMeQuery";

import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class GetMeController extends Controller<
  "private",
  GetMeController.Response
> {
  constructor(private readonly getMeQuery: GetMeQuery) {
    super();
  }

  protected override async handle({
    userId,
  }: Controller.Request<"private">): Promise<
    Controller.Response<GetMeController.Response>
  > {
    const { entities, user } = await this.getMeQuery.execute({ userId });

    return {
      statusCode: 200,
      body: { ...user, entities },
    };
  }
}

export namespace GetMeController {
  export type Response = User & { entities: Entity[] };
}
```

## Schemas de validação
- **Não aplicável:** sem body/params/query específicos.

## Query (equivalente a use case)
```ts
import { ListTransactionQuery } from "@application/controllers/transactions/schemas/listTransactionQuerySchema";
import { Entity } from "@application/entities/Entity";
import { Transaction } from "@application/entities/Transaction";
import { User } from "@application/entities/User";
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { DatabaseService } from "@infra/database/neon";
import { UserRepository } from "@infra/database/neon/repositories/UserRepository";
import { entitiesTable, usersTable } from "@infra/database/neon/schema";
import { Injectable } from "@kernel/decorators/Injectable";
import { eq } from "drizzle-orm";

@Injectable()
export class GetMeQuery {
  constructor(private readonly databaseService: DatabaseService) {}

  async execute(getMeQueryInput: GetMeQuery.Input): Promise<GetMeQuery.Output> {
    const rows = await this.databaseService.db
      .select()
      .from(usersTable)
      .leftJoin(entitiesTable, eq(usersTable.id, entitiesTable.ownerUserId))
      .where(eq(usersTable.id, getMeQueryInput.userId));

    if (rows.length === 0) {
      throw new UnauthorizedException(
        "Usuário não tem permissão para acessar suas informações."
      );
    }
    const userRow = rows[0].users;
    const user = new User({
      ...userRow,
      externalId: userRow?.externalId ?? undefined,
    });

    const entities = rows
      .filter((r) => r.entities) // remove linhas sem entidade (LEFT JOIN)
      .map(
        (r) =>
          new Entity({
            name: r.entities!.name,
            type: r.entities!.type as Entity.Type,
            color: r.entities!.color,
            ownerUserId: r.entities!.ownerUserId,
            id: r.entities!.id,
            createdAt: r.entities!.createdAt,
            updatedAt: r.entities!.updatedAt,
          })
      ); // uma entidade por linha

    return { user, entities };
  }
}

export namespace GetMeQuery {
  export type Input = { userId: string };
  export type Output = {
    user: User;
    entities: Entity[];
  };
}
```

## Dependências downstream
### `DatabaseService`
```ts
// database.ts
import { Injectable } from "@kernel/decorators/Injectable";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import { AppConfig } from "@shared/config/AppConfig";

@Injectable()
export class DatabaseService {
  public readonly db: NeonHttpDatabase;

  constructor(private readonly config: AppConfig) {
    const url = this.config.db?.url;
    if (!url) {
      throw new Error("DATABASE_URL não configurada em AppConfig.database.url");
    }

    // Instância do Drizzle sobre o cliente HTTP do Neon
    this.db = drizzle(url);
  }
}
```

## Fluxo para o frontend
1. A IA/Frontend chama `GET /me` com `Authorization`.
2. O controller usa `GetMeQuery` para carregar usuário e entidades relacionadas.
3. A resposta retorna os dados do usuário e a lista de entidades.
