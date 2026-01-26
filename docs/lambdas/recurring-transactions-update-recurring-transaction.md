# Lambda: updateRecurringTransaction (`PATCH /recurring-transactions/{recurringTransactionId}`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/recurringTransactions/updateRecurringTransaction.handler`
- **Evento:** HTTP API (`PATCH /recurring-transactions/{recurringTransactionId}`)
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
import { UpdateRecurringTransactionController } from "@application/controllers/recurringTransactions/UpdateRecurringTransactionController";

export const handler = lambdaHttpAdapter(UpdateRecurringTransactionController);
```

## Controller
```ts
import { Schema } from "@kernel/decorators/Schema";
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";
import {
  UpdateRecurringTransactionParams,
  updateRecurringTransactionParamsSchema,
} from "./schemas/updateRecurringTransactionParamsSchema";
import {
  UpdateRecurringTransactionBody,
  updateRecurringTransactionSchema,
} from "./schemas/updateRecurringTransactionSchema";
import { UpdateRecurringTransactionUseCase } from "@application/useCases/recurringTransactions/UpdateRecurringTransactionUseCase";
import { RecurringTransaction } from "@application/entities/RecurringTransaction";

@Injectable()
@Schema(updateRecurringTransactionSchema)
export class UpdateRecurringTransactionController extends Controller<
  "private",
  UpdateRecurringTransactionController.Response
> {
  constructor(
    private readonly updateRecurringTransactionUseCase: UpdateRecurringTransactionUseCase
  ) {
    super();
  }

  protected override async handle({
    userId,
    body,
    params,
  }: Controller.Request<
    "private",
    UpdateRecurringTransactionBody,
    UpdateRecurringTransactionParams
  >): Promise<
    Controller.Response<UpdateRecurringTransactionController.Response>
  > {
    const updateParams = updateRecurringTransactionParamsSchema.parse(params);
    const recurringTransaction =
      await this.updateRecurringTransactionUseCase.execute({
        id: updateParams.recurringTransactionId,
        ...body,
        userId,
      });

    return {
      statusCode: 200,
      body: {
        recurringTransaction,
      },
    };
  }
}

export namespace UpdateRecurringTransactionController {
  export type Response = {
    recurringTransaction: RecurringTransaction;
  };
}
```

## Schemas de validação
```ts
// src/application/controllers/transactions/schemas/createTransactionSchema.ts
import { z } from "zod";
import { createRecurringTransactionSchema } from "./createRecurringTransactionSchema";

export const updateRecurringTransactionSchema =
  createRecurringTransactionSchema.partial().extend({
    entityId: createRecurringTransactionSchema.shape.entityId,
  });

export type UpdateRecurringTransactionBody = z.infer<
  typeof updateRecurringTransactionSchema
>;
```

```ts
import { z } from "zod";

export const updateRecurringTransactionParamsSchema = z.object({
  recurringTransactionId: z.string().uuid(),
});
export type UpdateRecurringTransactionParams = z.infer<
  typeof updateRecurringTransactionParamsSchema
>;
```

## Use case
```ts
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { Injectable } from "@kernel/decorators/Injectable";
import { CreateRecurringTransactionUseCase } from "./CreateRecurringTransactionUseCase";
import { RecurringTransaction } from "@application/entities/RecurringTransaction";
import { RecurringTransactionRepository } from "@infra/database/neon/repositories/RecurringTransactionRepository";

@Injectable()
export class UpdateRecurringTransactionUseCase {
  constructor(
    private readonly recurringTransactionRepository: RecurringTransactionRepository,
    private readonly entityRepository: EntityRepository
  ) {}

  async execute(
    recurringTransactionInput: UpdateRecurringTransactionUseCase.Input
  ): Promise<UpdateRecurringTransactionUseCase.Output> {
    const entity = await this.entityRepository.findByUserId({
      userId: recurringTransactionInput.userId,
      entityId: recurringTransactionInput.entityId,
    });

    if (!entity) {
      throw new UnauthorizedException(
        "Usuário não tem permissão para editar transações nessa entidade."
      );
    }

    const recurringTransactionExists =
      await this.recurringTransactionRepository.findOne({
        recurringTransactionId: recurringTransactionInput.id,
        entityId: recurringTransactionInput.entityId,
        userId: recurringTransactionInput.userId,
      });

    if (!recurringTransactionExists) {
      throw new UnauthorizedException(
        "Transação recorrente não encontrada para editar."
      );
    }

    const recurringTransaction = new RecurringTransaction({
      ...recurringTransactionExists,
      ...recurringTransactionInput,
    });

    const updatedTransaction = await this.recurringTransactionRepository.update(
      recurringTransactionInput.id,
      recurringTransaction
    );

    return updatedTransaction;
  }
}

export namespace UpdateRecurringTransactionUseCase {
  export type Input = Partial<CreateRecurringTransactionUseCase.Input> & {
    id: string;
    entityId: string;
    userId: string;
  };
  export type Output = RecurringTransaction;
}
```

## Dependências downstream
### `RecurringTransactionRepository`
```ts
import { Injectable } from "@kernel/decorators/Injectable";
import { DatabaseService } from "..";
import { recurringTransactionsTable } from "../schema";
import { RecurringTransactionItem } from "../items/RecurringTransactionItem";
import { RecurringTransaction } from "@application/entities/RecurringTransaction";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { ListRecurringTransactionQuery } from "@application/controllers/recurringTransactions/schemas/listRecurringTransactionQuerySchema";
import { Transaction } from "@application/entities/Transaction";
import { TransactionItem } from "../items/TransactionItem";

@Injectable()
export class RecurringTransactionRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /** Cria e retorna a entidade criada */
  async create(
    recurringTransaction: RecurringTransaction
  ): Promise<RecurringTransaction> {
    const rowToInsert = RecurringTransactionItem.toRow(recurringTransaction);

    const [created] = await this.databaseService.db
      .insert(recurringTransactionsTable)
      .values(rowToInsert)
      .returning();

    return RecurringTransactionItem.fromRow(created);
  }

  async listAll({
    filters,
    userId,
  }: {
    filters: ListRecurringTransactionQuery;
    userId: string;
  }) {
    console.log({ filters });
    const whereClause = [
      eq(recurringTransactionsTable.entityId, filters.entityId),
      eq(recurringTransactionsTable.userId, userId),
    ];

    if (filters.accountId?.length) {
      whereClause.push(
        inArray(recurringTransactionsTable.accountId, filters.accountId)
      );
    }

    if (filters.categoryId?.length) {
      whereClause.push(
        inArray(recurringTransactionsTable.categoryId, filters.categoryId)
      );
    }

    if (filters.type?.length) {
      whereClause.push(
        inArray(
          recurringTransactionsTable.type,
          filters.type as Transaction.Type[]
        )
      );
    }

    if (filters.search && filters.search.trim()) {
      whereClause.push(
        ilike(recurringTransactionsTable.name, `%${filters.search.trim()}%`)
      );
    }

    // NUMERIC (string) -> compare/sort com CAST
    if (filters.value != null)
      whereClause.push(
        sql`${recurringTransactionsTable.value}::numeric >= ${Number(
          filters.value
        ).toFixed(2)}::numeric`
      );

    const whereExpr = and(...whereClause);

    // Ordenação primária + tie-breakers estáveis
    const orderCol =
      filters.sortBy === "value"
        ? sql`${recurringTransactionsTable.value}::numeric`
        : filters.sortBy === "name"
        ? recurringTransactionsTable.name
        : recurringTransactionsTable.createdAt; // default "createdAt"
    const orderMain =
      filters.sortDir === "asc" ? asc(orderCol as any) : desc(orderCol as any);
    const orderTiebreakers = [
      desc(recurringTransactionsTable.createdAt),
      desc(recurringTransactionsTable.id),
    ];

    //paginação
    const limit = Math.min(Math.max(Number(filters.pageSize!), 1), 100);
    const offset = (Math.max(Number(filters.page!), 1) - 1) * limit;

    // total (para paginação)
    const [{ total }] = await this.databaseService.db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(recurringTransactionsTable)
      .where(whereExpr);

    // page
    const rows = await this.databaseService.db
      .select()
      .from(recurringTransactionsTable)
      .where(whereExpr)
      .orderBy(orderMain, ...orderTiebreakers)
      .limit(limit)
      .offset(offset);

    const items = rows.map(RecurringTransactionItem.fromRow);
    const hasNext = Number(filters.page!) * limit < total;

    return { items, total, page: filters.page, pageSize: limit, hasNext };
  }

  async update(
    recurringTransactionId: string,
    recurringTransaction: RecurringTransaction
  ): Promise<RecurringTransaction> {
    const row = RecurringTransactionItem.toRow(recurringTransaction);
    const rowToInsert = { ...row, updatedAt: new Date() };
    const [updated] = await this.databaseService.db
      .update(recurringTransactionsTable)
      .set(rowToInsert)
      .where(eq(recurringTransactionsTable.id, recurringTransactionId))
      .returning();
    return RecurringTransactionItem.fromRow(updated);
  }

  async findOne({
    recurringTransactionId,
    entityId,
    userId,
  }: {
    recurringTransactionId: string;
    entityId: string;
    userId: string;
  }): Promise<RecurringTransaction | null> {
    const [row] = await this.databaseService.db
      .select()
      .from(recurringTransactionsTable)
      .where(
        and(
          eq(recurringTransactionsTable.id, recurringTransactionId),
          eq(recurringTransactionsTable.entityId, entityId),
          eq(recurringTransactionsTable.userId, userId)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return RecurringTransactionItem.fromRow(row);
  }

  async delete(params: {
    id: string;
    entityId: string;
    userId: string;
  }): Promise<void> {
    const { id, entityId, userId } = params;

    await this.databaseService.db
      .delete(recurringTransactionsTable)
      .where(
        and(
          eq(recurringTransactionsTable.id, id),
          eq(recurringTransactionsTable.entityId, entityId),
          eq(recurringTransactionsTable.userId, userId)
        )
      );
  }

  /**
   * Regras cuja janela [startDate..endDate] intersecta [from..to]
   * (startDate <= to) AND (endDate IS NULL OR endDate >= from)
   */
  async listIntersecting(
    from: Date,
    to: Date
  ): Promise<RecurringTransaction[]> {
    const rows = await this.databaseService.db
      .select()
      .from(recurringTransactionsTable)
      .where(
        and(
          lte(recurringTransactionsTable.startDate, to),
          or(
            isNull(recurringTransactionsTable.endDate),
            gte(recurringTransactionsTable.endDate, from)
          )
        )
      );

    return rows.map(RecurringTransactionItem.fromRow);
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
1. A IA/Frontend chama `PATCH /recurring-transactions/{recurringTransactionId}` com body parcial e `Authorization`.
2. O controller valida params/body e chama o use case.
3. O use case valida permissão e atualiza a regra.
4. Resposta retorna `{ recurringTransaction }`.
