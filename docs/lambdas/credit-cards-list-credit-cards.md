# Lambda: listCreditCards (`GET /credit-cards`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/creditCards/listCreditCards.handler`
- **Evento:** HTTP API (`GET /credit-cards`)
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
import { ListCreditCardsController } from "@application/controllers/creditCards/ListCreditCardsController";

export const handler = lambdaHttpAdapter(ListCreditCardsController);
```

## Controller
```ts
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";
import {
  ListCreditCardsQuery,
  listCreditCardsQuerySchema,
} from "./schemas/listCreditCardsQuerySchema";
import { CreditCard } from "@application/entities/CreditCard";
import { ListCreditCardsUseCase } from "@application/useCases/creditCards/ListCreditCardsUseCase";

@Injectable()
export class ListCreditCardsController extends Controller<
  "private",
  ListCreditCardsController.Response
> {
  constructor(private readonly listCreditCardsUseCase: ListCreditCardsUseCase) {
    super();
  }

  protected override async handle({
    userId,
    body,
    params,
    queryParams,
  }: Controller.Request<
    "private",
    Record<string, any>,
    Record<string, any>,
    ListCreditCardsQuery
  >): Promise<Controller.Response<ListCreditCardsController.Response>> {
    const listTransactionFilters = listCreditCardsQuerySchema.parse(
      queryParams ?? {}
    );

    const { creditCards } = await this.listCreditCardsUseCase.execute({
      ...listTransactionFilters,
      userId,
    });

    return {
      statusCode: 200,
      body: { creditCards },
    };
  }
}

export namespace ListCreditCardsController {
  export type Response = {
    creditCards: CreditCard[];
  };
}
```

## Schemas de validação
```ts
import { z } from "zod";

const csvToUuidArray = z.preprocess((val) => {
  if (val == null) return [];
  const arr = Array.isArray(val) ? val : [String(val)];
  return arr
    .flatMap((x) => String(x).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}, z.array(z.string().uuid()));

export const listCreditCardsQuerySchema = z.object({
  entityId: z.string().uuid(),
  accountId: csvToUuidArray.optional(),
});

export type ListCreditCardsQuery = z.infer<typeof listCreditCardsQuerySchema>;
```

## Use case
```ts
import { ListCreditCardsQuery } from "@application/controllers/creditCards/schemas/listCreditCardsQuerySchema";
import { ListTransactionQuery } from "@application/controllers/transactions/schemas/listTransactionQuerySchema";
import { Account } from "@application/entities/Account";
import { CreditCard } from "@application/entities/CreditCard";
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { CreditCardRepository } from "@infra/database/neon/repositories/CreditCardRepository";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class ListCreditCardsUseCase {
  constructor(
    private readonly creditCardRepository: CreditCardRepository,
    private readonly entityRepository: EntityRepository
  ) {}

  async execute(
    listCreditCardInput: ListCreditCardsUseCase.Input
  ): Promise<ListCreditCardsUseCase.Output> {
    const entity = await this.entityRepository.findByUserId({
      userId: listCreditCardInput.userId,
      entityId: listCreditCardInput.entityId,
    });

    const creditCards = await this.creditCardRepository.listAll({
      filters: {
        entityId: listCreditCardInput.entityId,
        accountId: listCreditCardInput.accountId,
      },
      userId: listCreditCardInput.userId,
    });

    if (!entity) {
      throw new UnauthorizedException(
        "Usuário não tem permissão para editar transações nessa entidade."
      );
    }

    return { creditCards };
  }
}

export namespace ListCreditCardsUseCase {
  export type Input = ListCreditCardsQuery & { userId: string };
  export type Output = {
    creditCards: CreditCard[];
  };
}
```

## Dependências downstream
### `CreditCardRepository`
```ts
import { CreditCard } from "@application/entities/CreditCard";
import { DatabaseService } from "..";
import { creditCardsTable } from "../schema";

import { Injectable } from "@kernel/decorators/Injectable";
import { and, eq, inArray } from "drizzle-orm";
import { CreditCardItem } from "../items/CreditCardItem";
import { ListCreditCardsQuery } from "@application/controllers/creditCards/schemas/listCreditCardsQuerySchema";

@Injectable()
export class CreditCardRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /** Cria e retorna a entidade criada */
  async create(card: CreditCard): Promise<CreditCard> {
    const rowToInsert = CreditCardItem.toRow(card);

    const [created] = await this.databaseService.db
      .insert(creditCardsTable)
      .values(rowToInsert)
      .returning();

    return CreditCardItem.fromRow(created);
  }

  /** Lista todos os cartões de uma entidade/usuário */
  async listAll({
    filters,
    userId,
  }: {
    filters: ListCreditCardsQuery;
    userId: string;
  }): Promise<CreditCard[]> {
    const whereClause = [
      eq(creditCardsTable.entityId, filters.entityId),
      eq(creditCardsTable.userId, userId),
    ];
    if (filters.accountId?.length) {
      whereClause.push(inArray(creditCardsTable.accountId, filters.accountId));
    }

    const whereExpr = and(...whereClause);

    const cards = await this.databaseService.db
      .select()
      .from(creditCardsTable)
      .where(whereExpr);

    return cards.map((row) => CreditCardItem.fromRow(row));
  }

  async update(
    creditCardId: string,
    creditCard: CreditCard
  ): Promise<CreditCard> {
    const row = CreditCardItem.toRow(creditCard);
    const rowToInsert = { ...row, updatedAt: new Date() };
    const [updated] = await this.databaseService.db
      .update(creditCardsTable)
      .set(rowToInsert)
      .where(eq(creditCardsTable.id, creditCardId))
      .returning();
    return CreditCardItem.fromRow(updated);
  }

  async findOne({
    creditCardId,
    entityId,
    userId,
  }: {
    creditCardId: string;
    entityId: string;
    userId: string;
  }): Promise<CreditCard | null> {
    const [row] = await this.databaseService.db
      .select()
      .from(creditCardsTable)
      .where(
        and(
          eq(creditCardsTable.id, creditCardId),
          eq(creditCardsTable.entityId, entityId),
          eq(creditCardsTable.userId, userId)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return CreditCardItem.fromRow(row);
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
1. A IA/Frontend chama `GET /credit-cards?entityId=...&accountId=...` com `Authorization`.
2. O controller valida query via `listCreditCardsQuerySchema`.
3. O use case checa entidade e lista cartões no `CreditCardRepository`.
4. Resposta retorna `{ creditCards }`.
