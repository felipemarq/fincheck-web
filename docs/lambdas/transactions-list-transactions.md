# Lambda: listTransactions (`GET /transactions`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/transactions/listTransactions.handler`
- **Evento:** HTTP API (`GET /transactions`)
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
import { ListTransactionController } from "@application/controllers/transactions/ListTransactionController";

export const handler = lambdaHttpAdapter(ListTransactionController);
```

## Controller
```ts
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";
import { DeleteTransactionParams } from "./schemas/deleteTransactionParamsSchema";
import {
  listTransactionQuerySchema,
  ListTransactionQuery,
} from "./schemas/listTransactionQuerySchema";
import { ListTransactionUseCase } from "@application/useCases/transactions/ListTransactionUseCase";
import { Transaction } from "@application/entities/Transaction";
import { TransactionListItem } from "@application/queries/types/TransactionListItem";

@Injectable()
export class ListTransactionController extends Controller<
  "private",
  ListTransactionController.Response
> {
  constructor(private readonly listTransactionUseCase: ListTransactionUseCase) {
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
    ListTransactionQuery
  >): Promise<Controller.Response<ListTransactionController.Response>> {
    const listTransactionFilters = listTransactionQuerySchema.parse(
      queryParams ?? {}
    );

    const { hasNext, items, total, page, pageSize } =
      await this.listTransactionUseCase.execute({
        ...listTransactionFilters,
        userId,
      });

    return {
      statusCode: 200,
      body: { hasNext, items, total, page, pageSize },
    };
  }
}

export namespace ListTransactionController {
  export type Response = {
    items: TransactionListItem[]; // <<< agora vem com refs
    total: number;
    page: string | undefined;
    pageSize: number;
    hasNext: boolean;
  };
}
```

## Schemas de validação
```ts
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

export const listTransactionQuerySchema = z.object({
  entityId: z.string().uuid(),
  accountId: csvToUuidArray.optional(),
  categoryId: csvToUuidArray.optional(),
  type: csvToTransactionTypeArray.optional(),
  isPaid: optionalBool,
  startDate: optionalDate,
  endDate: optionalDate,
  dueDateStart: optionalDate,
  dueDateEnd: optionalDate,
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  sortBy: z.enum(["date", "createdAt", "value", "name"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
});

export type ListTransactionQuery = z.infer<typeof listTransactionQuerySchema>;
```

## Use case
```ts
import { ListTransactionQuery } from "@application/controllers/transactions/schemas/listTransactionQuerySchema";
import { Account } from "@application/entities/Account";
import { Transaction } from "@application/entities/Transaction";
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { TransactionListItem } from "@application/queries/types/TransactionListItem";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { TransactionRepository } from "@infra/database/neon/repositories/TransactionRepository";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class ListTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly entityRepository: EntityRepository
  ) {}

  async execute(
    transactionInput: ListTransactionUseCase.Input
  ): Promise<ListTransactionUseCase.Output> {
    const entity = await this.entityRepository.findByUserId({
      userId: transactionInput.userId,
      entityId: transactionInput.entityId,
    });

    if (!entity) {
      throw new UnauthorizedException(
        "Usuário não tem permissão para editar transações nessa entidade."
      );
    }

    const result = await this.transactionRepository.listAll({
      filters: {
        ...transactionInput,
        page: transactionInput.page ?? "1",
        pageSize: transactionInput.pageSize ?? "10",
      },
      userId: transactionInput.userId,
    });

    return result;
  }
}

export namespace ListTransactionUseCase {
  export type Input = ListTransactionQuery & { userId: string };
  export type Output = {
    items: TransactionListItem[];
    total: number;
    page: string | undefined;
    pageSize: number;
    hasNext: boolean;
  };
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
1. A IA/Frontend chama `GET /transactions` com filtros via query e `Authorization`.
2. O controller valida a query com `listTransactionQuerySchema`.
3. O use case valida acesso e lista transações paginadas.
4. A resposta retorna `items`, `total`, `page`, `pageSize` e `hasNext`.
