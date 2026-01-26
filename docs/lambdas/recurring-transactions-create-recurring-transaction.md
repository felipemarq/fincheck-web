# Lambda: createRecurringTransaction (`POST /recurring-transactions`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/recurringTransactions/createRecurringTransaction.handler`
- **Evento:** HTTP API (`POST /recurring-transactions`)
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
import { CreateRecurringTransactionController } from "@application/controllers/recurringTransactions/CreateRecurringTransactionController";

export const handler = lambdaHttpAdapter(CreateRecurringTransactionController);
```

## Controller
```ts
import { Schema } from "@kernel/decorators/Schema";
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";
import {
  CreateRecurringTransactionBody,
  createRecurringTransactionSchema,
} from "./schemas/createRecurringTransactionSchema";

import { Transaction } from "@application/entities/Transaction";
import { CreateRecurringTransactionUseCase } from "@application/useCases/recurringTransactions/CreateRecurringTransactionUseCase";
import { RecurringTransaction } from "@application/entities/RecurringTransaction";

@Injectable()
@Schema(createRecurringTransactionSchema)
export class CreateRecurringTransactionController extends Controller<
  "private",
  CreateRecurringTransactionController.Response
> {
  constructor(
    private readonly createRecurringTransactionUseCase: CreateRecurringTransactionUseCase
  ) {
    super();
  }

  protected override async handle({
    userId,
    body,
  }: Controller.Request<"private", CreateRecurringTransactionBody>): Promise<
    Controller.Response<CreateRecurringTransactionController.Response>
  > {
    const recurringTransaction =
      await this.createRecurringTransactionUseCase.execute({
        ...body,
        userId,
      });

    return {
      statusCode: 201,
      body: {
        recurringTransaction,
      },
    };
  }
}

export namespace CreateRecurringTransactionController {
  export type Response = {
    recurringTransaction: RecurringTransaction;
  };
}
```

## Schemas de validação
```ts
// src/application/controllers/transactions/schemas/createTransactionSchema.ts
import { z } from "zod";
import { Transaction } from "@application/entities/Transaction";
import { RecurringTransaction } from "@application/entities/RecurringTransaction";

export const createRecurringTransactionSchema = z
  .object({
    // contexto
    entityId: z
      .string({ required_error: "Id da entidade é obrigatório" })
      .uuid("entityId inválido"),
    // vínculos
    accountId: z
      .string({ required_error: "Conta é obrigatória" })
      .uuid("accountId inválido"),
    categoryId: z
      .string({ required_error: "Categoria é obrigatória" })
      .uuid("categoryId inválido"),
    creditCardId: z.string().uuid().optional(),
    contactId: z.string().uuid().optional(),

    // dados principais
    name: z
      .string({ required_error: "Nome é obrigatório" })
      .min(1, "Nome é obrigatório")
      .max(120, "Nome deve ter no máximo 120 caracteres"),

    value: z.coerce
      .number({ required_error: "Valor é obrigatório" })
      .positive("Valor deve ser maior que zero"),

    type: z.nativeEnum(Transaction.Type, {
      required_error: "Tipo é obrigatório",
    }), // "INCOME" | "EXPENSE"

    startDate: z.coerce.date({ required_error: "Data é obrigatória" }),
    endDate: z.coerce.date().optional(),
    recurrence: z.nativeEnum(RecurringTransaction.Recurrence, {
      required_error: "Tipo é obrigatório",
    }),

    notes: z.string().max(500, "Observações até 500 caracteres").optional(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "Data de término não pode ser anterior à data de início",
    path: ["startDate"],
  });

export type CreateRecurringTransactionBody = z.infer<
  typeof createRecurringTransactionSchema
>;

/* export const recurringTransactionsTable = pgTable(
  {
    entityId,
    userId,
    accountId,
    categoryId,
    creditCardId,
    name,
    value,
    type,
    startDate,
    endDate:,
    recurrence,
    // Opcional: série para idempotência (ex.: UUID fixo para a recorrência)
    seriesKey: varchar("series_key", { length: 64 }),
  },
  
); */
```

## Use case
```ts
import { RecurringTransaction } from "@application/entities/RecurringTransaction";
import { Transaction } from "@application/entities/Transaction";
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { RecurringMaterializer } from "@application/services/RecurringMaterializer";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { RecurringTransactionRepository } from "@infra/database/neon/repositories/RecurringTransactionRepository";
import { Injectable } from "@kernel/decorators/Injectable";
import { AppConfig } from "@shared/config/AppConfig";

@Injectable()
export class CreateRecurringTransactionUseCase {
  constructor(
    private readonly recurringTransactionRepository: RecurringTransactionRepository,
    private readonly entityRepository: EntityRepository,
    private readonly recurringMaterializer: RecurringMaterializer,
    private readonly appConfig: AppConfig
  ) {}

  async execute(
    recurringTransactionInput: CreateRecurringTransactionUseCase.Input
  ): Promise<CreateRecurringTransactionUseCase.Output> {
    const recurringTransaction = new RecurringTransaction(
      recurringTransactionInput
    );

    const entity = await this.entityRepository.findByUserId({
      userId: recurringTransactionInput.userId,
      entityId: recurringTransactionInput.entityId,
    });

    if (!entity) {
      throw new UnauthorizedException(
        "Usuário não tem permissão para criar transações nessa entidade."
      );
    }

    const createdTransaction = await this.recurringTransactionRepository.create(
      recurringTransaction
    );

    // horizonte inicial – hoje até +horizonDays, respeitando start/end da regra
    const now = new Date();
    const horizonEnd = new Date(
      Date.now() + this.appConfig.recurrence.horizonDays * 24 * 60 * 60 * 1000
    );
    const start =
      createdTransaction.startDate > now
        ? createdTransaction.startDate
        : now;
    const end =
      createdTransaction.endDate && createdTransaction.endDate < horizonEnd
        ? createdTransaction.endDate
        : horizonEnd;

    if (start <= end) {
      await this.recurringMaterializer.materializeWithin(
        createdTransaction,
        start,
        end
      );
    }

    return createdTransaction;
  }
}

export namespace CreateRecurringTransactionUseCase {
  export type Input = {
    entityId: string;
    userId: string;
    accountId: string;
    categoryId: string;
    creditCardId?: string;
    contactId?: string;
    name: string;
    value: number;
    startDate: Date;
    endDate?: Date;
    recurrence: RecurringTransaction.Recurrence;
    type: Transaction.Type;
    notes?: string;
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

### `RecurringMaterializer`
```ts
// src/application/services/RecurringMaterializer.ts
import { Injectable } from "@kernel/decorators/Injectable";
import { DatabaseService } from "@infra/database/neon";
import { transactionsTable } from "@infra/database/neon/schema";
import { RecurringEngine } from "./RecurringEngine";
import { RecurringTransaction } from "@application/entities/RecurringTransaction";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isoMinute(d: Date) {
  return d.toISOString().slice(0, 16);
}

function recurringKey(rule: RecurringTransaction, occ: Date) {
  return rule.recurrence === "MINUTELY"
    ? `${rule.id}:${isoMinute(occ)}`
    : `${rule.id}:${ymd(occ)}`;
}

@Injectable()
export class RecurringMaterializer {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Gera transações normais para a recorrência dentro de [from..to],
   * usando seriesKey para idempotência.
   */
  async materializeWithin(
    rule: RecurringTransaction,
    from: Date,
    to: Date
  ): Promise<void> {
    for (const occ of RecurringEngine.occurrences(
      {
        recurrence: rule.recurrence,
        startDate: rule.startDate,
        endDate: rule.endDate,
      },
      from,
      to
    )) {
      const key = recurringKey(rule, occ);

      console.log(
        JSON.stringify({
          msg: "recurring.materializeWithin",
          ruleId: rule.id,
          from: from.toISOString(),
          to: to.toISOString(),
        })
      );

      await this.database.db
        .insert(transactionsTable)
        .values({
          entityId: rule.entityId,
          userId: rule.userId,
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          creditCardId: rule.creditCardId ?? null,
          contactId: rule.contactId ?? null,

          name: rule.name,
          value: (Math.round(rule.value * 100) / 100).toFixed(2), // NUMERIC(string)
          date: occ,
          dueDate: null,
          type: rule.type,
          isPaid: false, // futuros como não pagos
          notes: rule.notes ?? null,

          seriesKey: key,
        })
        .onConflictDoNothing({ target: [transactionsTable.seriesKey] });
    }
  }
}
```

### `RecurringEngine`
```ts
// src/application/services/RecurringEngine.ts
export type RecurrenceKind =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "MINUTELY"
  | "YEARLY";

function startOfUTCDate(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}
function startOfUTCMinute(d: Date) {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      0,
      0
    )
  );
}
function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86400000);
}
function addWeeks(d: Date, n: number) {
  return addDays(d, 7 * n);
}
function addMinutes(d: Date, n: number) {
  return new Date(d.getTime() + n * 60000);
}
function addMonths(d: Date, n: number) {
  const dt = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate())
  );
  // ajusta para último dia do mês quando necessário
  if (dt.getUTCDate() !== d.getUTCDate()) {
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 0));
  }
  return dt;
}
function addYears(d: Date, n: number) {
  return new Date(
    Date.UTC(d.getUTCFullYear() + n, d.getUTCMonth(), d.getUTCDate())
  );
}

export const RecurringEngine = {
  *occurrences(
    rule: {
      recurrence: RecurrenceKind;
      startDate: Date;
      endDate?: Date | null;
    },
    rangeStart: Date,
    rangeEnd: Date
  ): Generator<Date> {
    const normalize =
      rule.recurrence === "MINUTELY" ? startOfUTCMinute : startOfUTCDate;
    const start = normalize(
      rule.startDate > rangeStart ? rule.startDate : rangeStart
    );
    const last = normalize(
      rule.endDate && rule.endDate < rangeEnd ? rule.endDate : rangeEnd
    );
    if (start > last) return;

    switch (rule.recurrence) {
      case "DAILY": {
        let d = start;
        while (d <= last) {
          yield d;
          d = addDays(d, 1);
        }
        break;
      }
      case "WEEKLY": {
        let d = start;
        while (d <= last) {
          yield d;
          d = addWeeks(d, 1);
        }
        break;
      }
      case "MONTHLY": {
        let d = start;
        while (d <= last) {
          yield d;
          d = addMonths(d, 1);
        }
        break;
      }
      case "MINUTELY": {
        let d = start;
        while (d <= last) {
          yield d;
          d = addMinutes(d, 1);
        }
        break;
      }
      case "YEARLY": {
        let d = start;
        while (d <= last) {
          yield d;
          d = addYears(d, 1);
        }
        break;
      }
    }
  },
};
```

## Fluxo para o frontend
1. A IA/Frontend chama `POST /recurring-transactions` com dados da regra recorrente e `Authorization`.
2. O controller valida o body e aciona o use case.
3. O use case valida acesso, cria a regra e materializa ocorrências iniciais.
4. Resposta retorna `{ recurringTransaction }`.
