# Lambda: recurringMaterializeDaily (EventBridge cron)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/recurringTransactions/materializeDaily.handler`
- **Evento:** EventBridge Schedule (`cron(0 3 * * ? *)`)
- **Autenticação:** N/A (evento agendado)

## Handler
```ts
// src/main/functions/recurring/materializeDaily.ts
import "reflect-metadata";
import { ScheduledEvent } from "aws-lambda";
import { Registry } from "@kernel/di/Registry";
import { RecurringTransactionRepository } from "@infra/database/neon/repositories/RecurringTransactionRepository";
import { RecurringMaterializer } from "@application/services/RecurringMaterializer";

const HORIZON_DAYS = Number(process.env.RECURRENCE_HORIZON_DAYS ?? "90");

export const handler = async (_event: ScheduledEvent) => {
  console.log(
    JSON.stringify({
      msg: "recurringMaterializeDaily.start",
      at: new Date().toISOString(),
    })
  );

  // materializeDaily.ts
  console.log(
    JSON.stringify({
      msg: "recurringMaterializeDaily.start",
      horizonDays: HORIZON_DAYS,
      now: new Date().toISOString(),
    })
  );
  const registry = Registry.getInstance();

  // DI — certifique-se que estes @Injectable estão registrados/visíveis:
  const repo = registry.resolve(RecurringTransactionRepository);
  const materializer = registry.resolve(RecurringMaterializer);

  const today = new Date();
  const horizon = new Date(Date.now() + HORIZON_DAYS * 24 * 60 * 60 * 1000);

  // Busca regras que intersectam [hoje..horizonte]
  const rules = await repo.listIntersecting(today, horizon);

  for (const rule of rules) {
    // depois de materializar cada regra
    console.log(
      JSON.stringify({
        msg: "recurringMaterializeDaily.ruleDone",
        ruleId: rule.id,
        entityId: rule.entityId,
        userId: rule.userId,
      })
    );
    await materializer.materializeWithin(rule, today, horizon);
  }

  console.log(
    JSON.stringify({
      msg: "recurringMaterializeDaily.done",
      processed: rules.length,
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ processed: rules.length }),
  };
};
```

## Handler wrapper
- **Não aplicável:** handler direto agendado.

## Controller / Schema / Use case
- **Não aplicável:** execução direta do serviço.

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
1. Esta Lambda não é chamada pelo frontend.
2. Ela materializa diariamente transações recorrentes para manter a timeline atualizada.
