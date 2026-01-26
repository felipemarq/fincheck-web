# Lambda: listRecurringTransactions (`GET /recurring-transactions`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/recurringTransactions/listRecurringTransactions.handler`
- **Evento:** HTTP API (`GET /recurring-transactions`)
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
import { ListRecurringTransactionController } from "@application/controllers/recurringTransactions/ListRecurringTransactionController";

export const handler = lambdaHttpAdapter(ListRecurringTransactionController);
```

## Controller
```ts
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";

import { ListTransactionUseCase } from "@application/useCases/transactions/ListTransactionUseCase";
import { Transaction } from "@application/entities/Transaction";
import {
  ListRecurringTransactionQuery,
  listRecurringTransactionQuerySchema,
} from "./schemas/listRecurringTransactionQuerySchema";
import { ListRecurringTransactionUseCase } from "@application/useCases/recurringTransactions/ListRecurringTransactionUseCase";
import { RecurringTransaction } from "@application/entities/RecurringTransaction";

@Injectable()
export class ListRecurringTransactionController extends Controller<
  "private",
  ListRecurringTransactionController.Response
> {
  constructor(
    private readonly listRecurringTransactionUseCase: ListRecurringTransactionUseCase
  ) {
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
    ListRecurringTransactionQuery
  >): Promise<
    Controller.Response<ListRecurringTransactionController.Response>
  > {
    const listTransactionFilters = listRecurringTransactionQuerySchema.parse(
      queryParams ?? {}
    );

    const { hasNext, items, total, page, pageSize } =
      await this.listRecurringTransactionUseCase.execute({
        ...listTransactionFilters,
        userId,
      });

    return {
      statusCode: 200,
      body: { hasNext, items, total, page, pageSize },
    };
  }
}

export namespace ListRecurringTransactionController {
  export type Response = {
    items: RecurringTransaction[];
    total: number;
    page: string | undefined;
    pageSize: number;
    hasNext: boolean;
  };
}
```

## Schemas de validação
```ts
import { RecurringTransaction } from "@application/entities/RecurringTransaction";
import { Transaction } from "@application/entities/Transaction";
import { z } from "zod";

const csvToUuidArray = z.preprocess((val) => {
  if (val == null) return [];
  const arr = Array.isArray(val) ? val : [String(val)];
  return arr
    .flatMap((x) => String(x).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}, z.array(z.string().uuid()));

const csvToTransactionTypeArray = z.preprocess((val) => {
  if (val == null) return [];
  const arr = Array.isArray(val) ? val : [String(val)];
  return arr
    .flatMap((x) => String(x).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}, z.array(z.nativeEnum(Transaction.Type)));

const csvToRecurrenceTypeArray = z.preprocess((val) => {
  if (val == null) return [];
  const arr = Array.isArray(val) ? val : [String(val)];
  return arr
    .flatMap((x) => String(x).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}, z.array(z.nativeEnum(RecurringTransaction.Recurrence)));

const optionalDate = z.preprocess((val) => {
  if (val == null) return undefined; // não veio
  const s = String(val).trim();
  if (!s) return undefined; // veio vazio → ignora
  const d = new Date(s);
  return d; // se for inválido, z.date() acusa
}, z.date().optional());

const optionalBool = z.preprocess((val) => {
  if (val == null) return undefined;
  const s = String(val).trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return val; // deixa o z.boolean() acusar erro se vier lixo
}, z.boolean().optional());

export const listRecurringTransactionQuerySchema = z.object({
  entityId: z.string().uuid(),
  accountId: csvToUuidArray.optional(),
  categoryId: csvToUuidArray.optional(),
  name: z.string().optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  type: csvToTransactionTypeArray.optional(),
  value: z.string().optional(),
  recurrence: csvToRecurrenceTypeArray.optional(),
  sortBy: z
    .enum(["startDate", "endDate", "createdAt", "value", "name"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
});

export type ListRecurringTransactionQuery = z.infer<
  typeof listRecurringTransactionQuerySchema
>;
```

## Use case
```ts
import { ListRecurringTransactionQuery } from "@application/controllers/recurringTransactions/schemas/listRecurringTransactionQuerySchema";
import { Account } from "@application/entities/Account";
import { RecurringTransaction } from "@application/entities/RecurringTransaction";
import { Transaction } from "@application/entities/Transaction";
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { RecurringTransactionRepository } from "@infra/database/neon/repositories/RecurringTransactionRepository";
import { TransactionRepository } from "@infra/database/neon/repositories/TransactionRepository";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class ListRecurringTransactionUseCase {
  constructor(
    private readonly recurringTransactionRepository: RecurringTransactionRepository,
    private readonly entityRepository: EntityRepository
  ) {}

  async execute(
    recurringTransactionInput: ListRecurringTransactionUseCase.Input
  ): Promise<ListRecurringTransactionUseCase.Output> {
    const entity = await this.entityRepository.findByUserId({
      userId: recurringTransactionInput.userId,
      entityId: recurringTransactionInput.entityId,
    });

    if (!entity) {
      throw new UnauthorizedException(
        "Usuário não tem permissão para visualizar as  transações recorrentes nessa entidade."
      );
    }

    const result = await this.recurringTransactionRepository.listAll({
      filters: {
        ...recurringTransactionInput,
        page: recurringTransactionInput.page ?? "1",
        pageSize: recurringTransactionInput.pageSize ?? "10",
      },
      userId: recurringTransactionInput.userId,
    });

    return result;
  }
}

export namespace ListRecurringTransactionUseCase {
  export type Input = ListRecurringTransactionQuery & { userId: string };
  export type Output = {
    items: RecurringTransaction[];
    total: number;
    page: string | undefined;
    pageSize: number;
    hasNext: boolean;
  };
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
1. A IA/Frontend chama `GET /recurring-transactions` com filtros via query e `Authorization`.
2. O controller valida a query e chama `ListRecurringTransactionUseCase`.
3. O use case valida acesso e retorna itens paginados.
4. Resposta retorna `items`, `total`, `page`, `pageSize` e `hasNext`.
