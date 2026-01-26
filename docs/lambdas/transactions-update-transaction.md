# Lambda: updateTransaction (`PATCH /transactions/{transactionId}`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/transactions/updateTransaction.handler`
- **Evento:** HTTP API (`PATCH /transactions/{transactionId}`)
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
import { UpdateTransactionController } from "@application/controllers/transactions/UpdateTransactionController";

export const handler = lambdaHttpAdapter(UpdateTransactionController);
```

## Controller
```ts
import { Schema } from "@kernel/decorators/Schema";
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";
import { Transaction } from "@application/entities/Transaction";
import {
  UpdateTransactionBody,
  updateTransactionSchema,
} from "./schemas/updateTransactionSchema";
import { UpdateTransactionUseCase } from "@application/useCases/transactions/UpdateTransactionUseCase";
import {
  UpdateTransactionParams,
  updateTransactionParamsSchema,
} from "./schemas/updateTransactionParamsSchema";

@Injectable()
@Schema(updateTransactionSchema)
export class UpdateTransactionController extends Controller<
  "private",
  UpdateTransactionController.Response
> {
  constructor(
    private readonly updateTransactionUseCase: UpdateTransactionUseCase
  ) {
    super();
  }

  protected override async handle({
    userId,
    body,
    params,
  }: Controller.Request<
    "private",
    UpdateTransactionBody,
    UpdateTransactionParams
  >): Promise<Controller.Response<UpdateTransactionController.Response>> {
    const updateParams = updateTransactionParamsSchema.parse(params);
    const transaction = await this.updateTransactionUseCase.execute({
      id: updateParams.transactionId,
      ...body,
      userId,
    });

    return {
      statusCode: 200,
      body: {
        transaction,
      },
    };
  }
}

export namespace UpdateTransactionController {
  export type Response = {
    transaction: Transaction;
  };
}
```

## Schemas de validação
```ts
// src/application/controllers/transactions/schemas/createTransactionSchema.ts
import { z } from "zod";
import { createTransactionSchema } from "./createTransactionSchema";

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  entityId: createTransactionSchema.shape.entityId,
});

export type UpdateTransactionBody = z.infer<typeof updateTransactionSchema>;
```

```ts
import { z } from "zod";

export const updateTransactionParamsSchema = z.object({
  transactionId: z.string().uuid(),
});
export type UpdateTransactionParams = z.infer<
  typeof updateTransactionParamsSchema
>;
```

## Use case
```ts
import { Account } from "@application/entities/Account";
import { Transaction } from "@application/entities/Transaction";
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { TransactionRepository } from "@infra/database/neon/repositories/TransactionRepository";
import { Injectable } from "@kernel/decorators/Injectable";
import { CreateTransactionUseCase } from "./CreateTransactionUseCase";

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly entityRepository: EntityRepository
  ) {}

  async execute(
    transactionInput: UpdateTransactionUseCase.Input
  ): Promise<UpdateTransactionUseCase.Output> {
    const entity = await this.entityRepository.findByUserId({
      userId: transactionInput.userId,
      entityId: transactionInput.entityId,
    });

    if (!entity) {
      throw new UnauthorizedException(
        "Usuário não tem permissão para editar transações nessa entidade."
      );
    }

    const transactionExists = await this.transactionRepository.findOne({
      transactionId: transactionInput.id,
      userId: transactionInput.userId,
      entityId: transactionInput.entityId,
    });

    if (!transactionExists) {
      throw new UnauthorizedException("Transação não encontrada para editar.");
    }

    const transaction = new Transaction({
      ...transactionExists,
      ...transactionInput,
    });

    const updatedTransaction = await this.transactionRepository.update(
      transactionInput.id,
      transaction
    );

    return updatedTransaction;
  }
}

export namespace UpdateTransactionUseCase {
  export type Input = Partial<CreateTransactionUseCase.Input> & {
    id: string;
    entityId: string;
    userId: string;
  };
  export type Output = Transaction;
}
```

## Dependências downstream
### `TransactionRepository`
```ts
import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";
import { Injectable } from "@kernel/decorators/Injectable";
import { DatabaseService } from "..";
import { accountsTable, categoriesTable, transactionsTable } from "../schema";
import { Transaction } from "@application/entities/Transaction";
import { TransactionItem } from "../items/TransactionItem";
import { ListTransactionQuery } from "@application/controllers/transactions/schemas/listTransactionQuerySchema";
import { types } from "util";
import { TransactionListItem } from "@application/queries/types/TransactionListItem";
import { Account } from "@application/entities/Account";

type UpdatePatch = {
  bankAccountId?: string; // trocar conta
  categoryId?: string | null; // null = limpar
  creditCardId?: string | null;
  installmentPurchaseId?: string | null;
  contactId?: string | null;
  name?: string;
  value?: number; // number no domínio
  date?: Date;
  dueDate?: Date | null;
  type?: "INCOME" | "EXPENSE";
  isPaid?: boolean;
  notes?: string | null;
};

@Injectable()
export class TransactionRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /** Cria e retorna a entidade criada */
  async create(transaction: Transaction): Promise<Transaction> {
    const rowToInsert = TransactionItem.toRow(transaction);

    const [created] = await this.databaseService.db
      .insert(transactionsTable)
      .values(rowToInsert)
      .returning();

    return TransactionItem.fromRow(created);
  }

  async findOne({
    transactionId,
    userId,
    entityId,
  }: {
    transactionId: string;
    userId: string;
    entityId: string;
  }) {
    const [r] = await this.databaseService.db
      .select()
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, transactionId),
          eq(transactionsTable.entityId, entityId),
          eq(transactionsTable.userId, userId)
        )
      );

    return r ? TransactionItem.fromRow(r) : null;
  }

  async listAll({
    filters,
    userId,
  }: {
    filters: ListTransactionQuery;
    userId: string;
  }) {
    // ---------- mesmo where da sua listAll ----------
    const whereClause = [
      eq(transactionsTable.entityId, filters.entityId),
      eq(transactionsTable.userId, userId),
    ] as any[];

    if (filters.accountId?.length) {
      whereClause.push(inArray(transactionsTable.accountId, filters.accountId));
    }
    if (filters.categoryId?.length) {
      whereClause.push(
        inArray(transactionsTable.categoryId, filters.categoryId)
      );
    }
    if (filters.type?.length) {
      whereClause.push(
        inArray(transactionsTable.type, filters.type as Transaction.Type[])
      );
    }
    if (typeof filters.isPaid === "boolean") {
      whereClause.push(eq(transactionsTable.isPaid, filters.isPaid));
    }
    if (filters.search && filters.search.trim()) {
      whereClause.push(
        ilike(transactionsTable.name, `%${filters.search.trim()}%`)
      );
    }
    if (filters.startDate)
      whereClause.push(gte(transactionsTable.date, filters.startDate));
    if (filters.endDate)
      whereClause.push(lte(transactionsTable.date, filters.endDate));
    if (filters.dueDateStart)
      whereClause.push(gte(transactionsTable.dueDate, filters.dueDateStart));
    if (filters.dueDateEnd)
      whereClause.push(lte(transactionsTable.dueDate, filters.dueDateEnd));

    if (filters.minValue != null)
      whereClause.push(
        sql`${transactionsTable.value}::numeric >= ${Number(
          filters.minValue
        ).toFixed(2)}::numeric`
      );
    if (filters.maxValue != null)
      whereClause.push(
        sql`${transactionsTable.value}::numeric <= ${Number(
          filters.maxValue
        ).toFixed(2)}::numeric`
      );

    const whereExpr = and(...whereClause);

    // ---------- ordenação/tie-breakers idênticos ----------
    const orderCol =
      filters.sortBy === "value"
        ? sql`${transactionsTable.value}::numeric`
        : filters.sortBy === "name"
        ? transactionsTable.name
        : filters.sortBy === "createdAt"
        ? transactionsTable.createdAt
        : transactionsTable.date;

    const orderMain =
      filters.sortDir === "asc" ? asc(orderCol as any) : desc(orderCol as any);
    const orderTiebreakers = [
      desc(transactionsTable.createdAt),
      desc(transactionsTable.id),
    ];

    // ---------- paginação ----------
    const limit = Math.min(Math.max(Number(filters.pageSize ?? "10"), 1), 100);
    const offset = (Math.max(Number(filters.page ?? "1"), 1) - 1) * limit;

    const [{ total }] = await this.databaseService.db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(transactionsTable)
      .where(whereExpr);

    // ---------- SELECT com aliases (t, acc, cat) ----------
    const rows = await this.databaseService.db
      .select({
        t: transactionsTable, // transação inteira (para usar o TransactionItem)
        acc: {
          id: accountsTable.id,
          name: accountsTable.name,
          color: accountsTable.color,
          type: accountsTable.type,
        },
        cat: {
          id: categoriesTable.id,
          name: categoriesTable.name,
          icon: categoriesTable.icon,
          type: categoriesTable.type,
        },
      })
      .from(transactionsTable)
      .leftJoin(
        accountsTable,
        eq(accountsTable.id, transactionsTable.accountId)
      )
      .leftJoin(
        categoriesTable,
        eq(categoriesTable.id, transactionsTable.categoryId)
      )
      .where(whereExpr)
      .orderBy(orderMain, ...orderTiebreakers)
      .limit(limit)
      .offset(offset);

    // ---------- mapping (mantém seu TransactionItem) ----------
    const items: TransactionListItem[] = rows.map(({ t, acc, cat }) => {
      const tx = TransactionItem.fromRow(t); // aqui você mantém todas as conversões (numeric->number etc)

      return {
        ...tx,
        account: acc?.id
          ? {
              id: acc.id!,
              name: acc.name!,
              color: acc.color ?? "#868E96",
              type: acc.type! as Account.Type, // "CHECKING" | "INVESTMENT" | "CASH"
            }
          : null,
        category: cat?.id
          ? {
              id: cat.id!,
              name: cat.name!,
              icon: cat.icon!,
              type: cat.type! as Transaction.Type, // "INCOME" | "EXPENSE"
            }
          : null,
      };
    });

    const hasNext = Number(filters.page ?? "1") * limit < total;
    return { items, total, page: filters.page, pageSize: limit, hasNext };
  }

  async getPaidTransactions(userId: string, entityId: string) {
    const rows = await this.databaseService.db
      .select({
        accountId: transactionsTable.accountId,
        income: sql<number>`coalesce(sum(CASE WHEN ${transactionsTable.type}='INCOME' AND ${transactionsTable.isPaid}=true THEN (${transactionsTable.value})::numeric ELSE 0 END),0)`,
        expense: sql<number>`coalesce(sum(CASE WHEN ${transactionsTable.type}='EXPENSE' AND ${transactionsTable.isPaid}=true THEN (${transactionsTable.value})::numeric ELSE 0 END),0)`,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.entityId, entityId),
          eq(transactionsTable.userId, userId)
        )
      )
      .groupBy(transactionsTable.accountId);

    return rows;
  }

  async getDueUpcoming(entityId: string, userId: string, to: Date) {
    const today = new Date();
    const rows = await this.databaseService.db
      .select({
        id: transactionsTable.id,
        name: transactionsTable.name,
        dueDate: transactionsTable.dueDate,
        value: transactionsTable.value,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.entityId, entityId),
          eq(transactionsTable.userId, userId),
          eq(transactionsTable.isPaid, false),
          gte(transactionsTable.dueDate, today),
          lte(transactionsTable.dueDate, to)
        )
      )
      .orderBy(asc(transactionsTable.dueDate))
      .limit(20);

    return rows;
  }

  async update(
    transactionId: string,
    transaction: Transaction
  ): Promise<Transaction> {
    const row = TransactionItem.toRow(transaction);
    const rowToInsert = { ...row, updatedAt: new Date() };
    const [updated] = await this.databaseService.db
      .update(transactionsTable)
      .set(rowToInsert)
      .where(eq(transactionsTable.id, transactionId))
      .returning();
    return TransactionItem.fromRow(updated);
  }

  /** Exclui por id (escopado por entityId/userId). Lança erro se não encontrar. */
  async delete(params: {
    id: string;
    entityId: string;
    userId: string;
  }): Promise<void> {
    const { id, entityId, userId } = params;

    await this.databaseService.db
      .delete(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, id),
          eq(transactionsTable.entityId, entityId),
          eq(transactionsTable.userId, userId)
        )
      );
  }

  async getSumIncome(entityId: string, userId: string, from: Date, to: Date) {
    const [{ sumIncome }] = await this.databaseService.db
      .select({
        sumIncome: sql<number>`coalesce(sum(CASE WHEN ${transactionsTable.type}='INCOME'
                                  THEN (${transactionsTable.value})::numeric ELSE 0 END),0)`,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.entityId, entityId),
          eq(transactionsTable.userId, userId),
          gte(transactionsTable.date, from),
          lte(transactionsTable.date, to)
        )
      );

    return sumIncome;
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
1. A IA/Frontend chama `PATCH /transactions/{transactionId}` com body parcial e `Authorization`.
2. O controller valida params/body e chama o use case.
3. O use case valida permissão e atualiza a transação.
4. Resposta retorna `{ transaction }`.
