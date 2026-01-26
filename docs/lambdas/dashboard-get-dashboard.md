# Lambda: getDashboard (`GET /dashboard`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/dashboard/getDashboard.handler`
- **Evento:** HTTP API (`GET /dashboard`)
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
import { GetDashboardController } from "@application/controllers/dashboard/GetDashboardController";

export const handler = lambdaHttpAdapter(GetDashboardController);
```

## Controller
```ts
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";
import {
  getDashboardQuerySchema,
  GetDashboardQuery,
} from "./schemas/getDashboardQuerySchema";
import { GetDashboardUseCase } from "@application/useCases/dashboard/GetDashboardUseCase";

@Injectable()
export class GetDashboardController extends Controller<
  "private",
  GetDashboardController.Response
> {
  constructor(private readonly useCase: GetDashboardUseCase) {
    super();
  }

  protected override async handle({
    userId,
    body,
    params,
    queryParams,
  }: Controller.Request<
    "private",
    Record<string, unknown>,
    Record<string, unknown>,
    GetDashboardQuery
  >): Promise<Controller.Response<GetDashboardController.Response>> {
    console.log(queryParams);
    const q = getDashboardQuerySchema.parse(queryParams);

    const res = await this.useCase.execute({
      ...q,
      userId,
    });

    return { statusCode: 200, body: res };
  }
}

export namespace GetDashboardController {
  export type Response = {
    body: any;
  };
}
```

## Schemas de validação
```ts
import { z } from "zod";

export const getDashboardQuerySchema = z
  .object({
    entityId: z.string().uuid(),
    range: z.enum(["this-month", "last-30d", "custom"]).default("this-month"),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    sections: z
      .string()
      .optional()
      .transform((s) =>
        s
          ? Array.from(
              new Set(
                s
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
              )
            )
          : []
      ),
    topN: z.coerce.number().int().min(1).max(20).default(5),
    // base de cálculo para cashflow/balances
    basis: z.enum(["competence", "cash"]).optional().default("cash"),
  })
  .superRefine((data, ctx) => {
    if (data.range === "custom") {
      if (!data.from) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "from é obrigatório quando range=custom",
          path: ["from"],
        });
      }
      if (!data.to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "to é obrigatório quando range=custom",
          path: ["to"],
        });
      }
      if (data.from && data.to && data.from > data.to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "from não pode ser maior que to",
          path: ["from"],
        });
      }
    }
  });

export type GetDashboardQuery = z.infer<typeof getDashboardQuerySchema>;
```

## Use case
```ts
import { Injectable } from "@kernel/decorators/Injectable";
import { GetBalancesQuery } from "@application/queries/GetBalancesQuery";
import { GetCashFlowQuery } from "@application/queries/GetCashFlowQuery";
import { GetMonthlyTaxQuery } from "@application/queries/GetMonthlyTaxQuery";
import { GetTopCategoriesQuery } from "@application/queries/GetTopCategoriesQuery";
import { GetDueUpcomingQuery } from "@application/queries/GetDueUpcomingQuery";

// ==== helpers (copie estes) ====
function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
function endOfMonthUTC(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );
}
function subDaysUTC(d: Date, days: number) {
  return new Date(d.getTime() - days * 24 * 60 * 60 * 1000);
}
function sameLengthPreviousRange(from: Date, to: Date) {
  const span = to.getTime() - from.getTime() + 1;
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span + 1);
  return { prevFrom, prevTo };
}
function previousMonthMidpoint(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15));
}
function buildDelta(current: number, prev: number) {
  const delta = +(current - prev).toFixed(2);
  const deltaPct =
    prev && Number.isFinite(prev) && Math.abs(prev) > 0
      ? +((delta / prev) * 100).toFixed(2)
      : null;
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return {
    current: +current.toFixed(2),
    prev: +prev.toFixed(2),
    delta,
    deltaPct,
    trend,
  };
}
// =================================

@Injectable()
export class GetDashboardUseCase {
  constructor(
    private readonly getTopCategoriesQuery: GetTopCategoriesQuery,
    private readonly getDueUpcomingQuery: GetDueUpcomingQuery,
    private readonly getBalancesQuery: GetBalancesQuery,
    private readonly getCashFlowQuery: GetCashFlowQuery,
    private readonly getMonthlyTaxQuery: GetMonthlyTaxQuery
  ) {}

  async execute(input: {
    entityId: string;
    userId: string;
    range: "this-month" | "last-30d" | "custom";
    from?: Date;
    to?: Date;
    sections: string[];
    topN: number;
    basis: "competence" | "cash";
  }) {
    const now = new Date();

    // ------ range atual ------
    let from = input.from;
    let to = input.to;
    if (input.range === "this-month") {
      from = startOfMonthUTC(now);
      to = endOfMonthUTC(now);
    } else if (input.range === "last-30d") {
      to = now;
      from = subDaysUTC(now, 29);
    }
    if (!from || !to) {
      from = startOfMonthUTC(now);
      to = endOfMonthUTC(now);
    }

    // ------ range anterior equivalente ------
    let prevFrom: Date;
    let prevTo: Date;
    if (input.range === "this-month") {
      const prevMid = previousMonthMidpoint(from);
      prevFrom = startOfMonthUTC(prevMid);
      prevTo = endOfMonthUTC(prevMid);
    } else {
      const r = sameLengthPreviousRange(from, to);
      prevFrom = r.prevFrom;
      prevTo = r.prevTo;
    }

    const want = (s: string) =>
      input.sections.length === 0 || input.sections.includes(s);

    // Tarefas atuais
    const tasksNow: Record<string, Promise<any>> = {};
    if (want("balances"))
      tasksNow.balances = this.getBalancesQuery.execute({
        entityId: input.entityId,
        userId: input.userId,
      });
    if (want("cashflow"))
      tasksNow.cashflow = this.getCashFlowQuery.execute({
        basis: input.basis,
        entityId: input.entityId,
        from,
        to,
        userId: input.userId,
      });
    if (want("topCategories"))
      tasksNow.topCategories = this.getTopCategoriesQuery.execute({
        entityId: input.entityId,
        userId: input.userId,
        from,
        to,
        topN: input.topN,
      });
    if (want("due"))
      tasksNow.due = this.getDueUpcomingQuery.execute({
        entityId: input.entityId,
        userId: input.userId,
        to,
      });
    if (want("tax"))
      tasksNow.tax = this.getMonthlyTaxQuery.execute({
        anyDateInMonth: from,
        entityId: input.entityId,
        userId: input.userId,
      });

    // Tarefas "previous period" (só para as seções que fazem sentido comparar)
    const tasksPrev: Record<string, Promise<any>> = {};
    if (want("cashflow"))
      tasksPrev.cashflow = this.getCashFlowQuery.execute({
        basis: input.basis,
        entityId: input.entityId,
        from: prevFrom,
        to: prevTo,
        userId: input.userId,
      });
    if (want("tax"))
      tasksPrev.tax = this.getMonthlyTaxQuery.execute({
        anyDateInMonth:
          input.range === "this-month" ? previousMonthMidpoint(from) : prevFrom,
        entityId: input.entityId,
        userId: input.userId,
      });

    // Execução paralela
    const [nowResults, prevResults] = await Promise.all([
      Promise.all(
        Object.entries(tasksNow).map(async ([k, p]) => [k, await p] as const)
      ),
      Promise.all(
        Object.entries(tasksPrev).map(async ([k, p]) => [k, await p] as const)
      ),
    ]);

    const body: any = {
      range: { from, to },
      previousRange: { from: prevFrom, to: prevTo },
      generatedAt: new Date().toISOString(),
    };
    for (const [k, v] of nowResults) body[k] = v;

    // ---- insights (deltas prontos para UI) ----
    const insights: any = {};

    if (want("cashflow") && body.cashflow) {
      const prev = Object.fromEntries(prevResults)["cashflow"];
      const nowTotals = body.cashflow.totals;
      const prevTotals = prev?.totals ?? { income: 0, expense: 0, net: 0 };

      insights.cashflow = {
        income: buildDelta(nowTotals.income, prevTotals.income),
        expense: buildDelta(nowTotals.expense, prevTotals.expense),
        net: buildDelta(nowTotals.net, prevTotals.net),
      };
    }

    if (want("tax") && body.tax) {
      const prev = Object.fromEntries(prevResults)["tax"];
      insights.tax = {
        estimated: buildDelta(body.tax.estimatedTax, prev?.estimatedTax ?? 0),
        month: body.tax.month,
        prevMonth: prev?.month ?? null,
        missingRate: body.tax.missingRate,
      };
    }

    // (Opcional futuramente: insights.balances com snapshot as-of-date)

    if (Object.keys(insights).length) body.insights = insights;

    return body;
  }
}
```

## Dependências downstream
### `GetBalancesQuery`
```ts
import { Account } from "@application/entities/Account";
import { AccountRepository } from "@infra/database/neon/repositories/AccountRepository";
import { TransactionRepository } from "@infra/database/neon/repositories/TransactionRepository";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class GetBalancesQuery {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository
  ) {}

  async execute({
    entityId,
    userId,
  }: GetBalancesQuery.Input): Promise<GetBalancesQuery.Output> {
    // 1) todas as contas da entidade
    const accounts = await this.accountRepository.listAll({
      entityId,
      userId,
    });

    // 2) agregados de receitas/despesas pagas por conta
    const rows = await this.transactionRepository.getPaidTransactions(
      userId,
      entityId
    );

    const byAcc = new Map<string, { income: number; expense: number }>();
    rows.forEach((r) =>
      byAcc.set(r.accountId, {
        income: Number(r.income),
        expense: Number(r.expense),
      })
    );

    return accounts.map((acc) => {
      const agg = byAcc.get(acc.id!) ?? { income: 0, expense: 0 };
      const ib = Number(acc.initialBalance); // NUMERIC string -> number
      const balance = +(ib + agg.income - agg.expense).toFixed(2);
      return {
        accountId: acc.id,
        name: acc.name,
        type: acc.type,
        color: acc.color,
        balance,
      };
    });
  }
}

export namespace GetBalancesQuery {
  export type Input = { userId: string; entityId: string };
  export type Output = Promise<
    {
      accountId: string | undefined;
      name: string;
      type: Account.Type;
      color: string | undefined;
      balance: number;
    }[]
  >;
}
```

### `GetCashFlowQuery`
```ts
import { Account } from "@application/entities/Account";
import { DatabaseService } from "@infra/database/neon";
import { AccountRepository } from "@infra/database/neon/repositories/AccountRepository";
import { TransactionRepository } from "@infra/database/neon/repositories/TransactionRepository";
import { transactionsTable } from "@infra/database/neon/schema";
import { Injectable } from "@kernel/decorators/Injectable";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

@Injectable()
export class GetCashFlowQuery {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly databaseService: DatabaseService
  ) {}

  async execute({
    entityId,
    userId,
    basis,
    from,
    to,
  }: GetBalancesQuery.Input): Promise<GetBalancesQuery.Output> {
    const where = [
      eq(transactionsTable.entityId, entityId),
      eq(transactionsTable.userId, userId),
      gte(transactionsTable.date, from),
      lte(transactionsTable.date, to),
    ] as any[];

    if (basis === "cash") {
      where.push(eq(transactionsTable.isPaid, true));
    }

    const dayCol = sql<string>`to_char(date_trunc('day', ${transactionsTable.date}), 'YYYY-MM-DD')`;

    const rows = await this.databaseService.db
      .select({
        day: dayCol,
        income: sql<number>`coalesce(sum(CASE WHEN ${transactionsTable.type}='INCOME'  THEN (${transactionsTable.value})::numeric ELSE 0 END),0)`,
        expense: sql<number>`coalesce(sum(CASE WHEN ${transactionsTable.type}='EXPENSE' THEN (${transactionsTable.value})::numeric ELSE 0 END),0)`,
      })
      .from(transactionsTable)
      .where(and(...where))
      .groupBy(dayCol)
      .orderBy(asc(dayCol as any));

    // acumula saldo diário
    let cum = 0;
    const series = rows.map((r) => {
      const income = Number(r.income);
      const expense = Number(r.expense);
      const net = +(income - expense).toFixed(2);
      cum = +(cum + net).toFixed(2);
      return {
        date: r.day,
        income: +income.toFixed(2),
        expense: +expense.toFixed(2),
        net,
        cum,
      };
    });

    const totals = series.reduce(
      (acc, d) => {
        acc.income += d.income;
        acc.expense += d.expense;
        acc.net += d.net;
        return acc;
      },
      { income: 0, expense: 0, net: 0 }
    );
    totals.income = +totals.income.toFixed(2);
    totals.expense = +totals.expense.toFixed(2);
    totals.net = +totals.net.toFixed(2);

    return { series, totals };
  }
}

export namespace GetBalancesQuery {
  export type Input = {
    entityId: string;
    userId: string;
    from: Date;
    to: Date;
    basis: "competence" | "cash";
  };
  export type Output = Promise<{
    series: {
      date: string;
      income: number;
      expense: number;
      net: number;
      cum: number;
    }[];
    totals: {
      income: number;
      expense: number;
      net: number;
    };
  }>;
}
```

### `GetMonthlyTaxQuery`
```ts
import { Account } from "@application/entities/Account";
import { AccountRepository } from "@infra/database/neon/repositories/AccountRepository";
import { TaxRateRepository } from "@infra/database/neon/repositories/TaxRateRepository";
import { TransactionRepository } from "@infra/database/neon/repositories/TransactionRepository";
import { Injectable } from "@kernel/decorators/Injectable";

// helpers de data
function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
function endOfMonthUTC(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );
}

@Injectable()
export class GetMonthlyTaxQuery {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly taxRateRepository: TaxRateRepository
  ) {}

  async execute({
    entityId,
    userId,
    anyDateInMonth,
  }: GetMonthlyTaxQuery.Input): Promise<GetMonthlyTaxQuery.Output> {
    const y = anyDateInMonth.getUTCFullYear();
    const m = anyDateInMonth.getUTCMonth() + 1;

    const rate = await this.taxRateRepository.getMonthlyTax(
      entityId,
      userId,
      anyDateInMonth
    );

    const from = startOfMonthUTC(anyDateInMonth);
    const to = endOfMonthUTC(anyDateInMonth);

    const sumIncome = await this.transactionRepository.getSumIncome(
      entityId,
      userId,
      from,
      to
    );

    const income = Number(sumIncome);
    const estimatedTax = rate != null ? +(income * (rate / 100)).toFixed(2) : 0;

    return {
      month: `${y}-${String(m).padStart(2, "0")}`,
      income: +income.toFixed(2),
      ratePercent: rate,
      estimatedTax,
      missingRate: rate == null,
    };
  }
}

export namespace GetMonthlyTaxQuery {
  export type Input = {
    entityId: string;
    userId: string;
    anyDateInMonth: Date;
  };
  export type Output = Promise<{
    month: string;
    income: number;
    ratePercent: number | null;
    estimatedTax: number;
    missingRate: boolean;
  }>;
}
```

### `GetTopCategoriesQuery`
```ts
import { Account } from "@application/entities/Account";
import { AccountRepository } from "@infra/database/neon/repositories/AccountRepository";
import { CategoryRepository } from "@infra/database/neon/repositories/CategoryRepository";
import { TransactionRepository } from "@infra/database/neon/repositories/TransactionRepository";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class GetTopCategoriesQuery {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute({
    entityId,
    userId,
    from,
    to,
    topN,
  }: GetTopCategoriesQuery.Input): Promise<GetTopCategoriesQuery.Output> {
    const rows = await this.categoryRepository.getTopCategories(
      entityId,
      userId,
      from,
      to,
      topN
    );

    return rows.map((r) => ({
      categoryId: r.categoryId!,
      name: r.name,
      icon: r.icon,
      amount: +Number(r.amount).toFixed(2),
    }));
  }
}

export namespace GetTopCategoriesQuery {
  export type Input = {
    entityId: string;
    userId: string;
    from: Date;
    to: Date;
    topN: number;
  };
  export type Output = Promise<
    {
      categoryId: string;
      name: string;
      icon: string;
      amount: number;
    }[]
  >;
}
```

### `GetDueUpcomingQuery`
```ts
import { Account } from "@application/entities/Account";
import { AccountRepository } from "@infra/database/neon/repositories/AccountRepository";
import { TransactionRepository } from "@infra/database/neon/repositories/TransactionRepository";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class GetDueUpcomingQuery {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository
  ) {}

  async execute({
    entityId,
    userId,
    to,
  }: GetDueUpcomingQuery.Input): Promise<GetDueUpcomingQuery.Output> {
    const rows = await this.transactionRepository.getDueUpcoming(
      entityId,
      userId,
      to
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      dueDate: r.dueDate,
      value: +Number(r.value).toFixed(2),
    }));
  }
}

export namespace GetDueUpcomingQuery {
  export type Input = { entityId: string; userId: string; to: Date };
  export type Output = Promise<
    {
      id: string;
      name: string;
      dueDate: Date | null;
      value: number;
    }[]
  >;
}
```

## Fluxo para o frontend
1. A IA/Frontend chama `GET /dashboard` com `entityId` e filtros de range/sections via query.
2. O controller valida a query com `getDashboardQuerySchema` e chama o use case.
3. O use case dispara queries paralelas para saldos, cashflow, top categorias, vencimentos e impostos.
4. A resposta consolida métricas atuais e insights (deltas) prontos para UI.
