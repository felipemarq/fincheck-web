# Lambda: upsertTaxRate (`PUT /entities/{entityId}/tax-rates/{year}/{month}`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/taxes/upsertTaxRate.handler`
- **Evento:** HTTP API (`PUT /entities/{entityId}/tax-rates/{year}/{month}`)
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
import { UpsertTaxRateController } from "@application/controllers/taxes/UpsertTaxRateController";

export const handler = lambdaHttpAdapter(UpsertTaxRateController);
```

## Controller
```ts
// src/application/controllers/taxes/UpsertTaxRateController.ts
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";

import {
  UpsertTaxRateBody,
  upsertTaxRateBodySchema,
  UpsertTaxRateParams,
  upsertTaxRateParamsSchema,
} from "./schema/upsertTaxRateSchema";
import { UpsertTaxRateUseCase } from "@application/useCases/taxes/UpsertTaxRateUseCase";
import { TaxRate } from "@application/entities/TaxRate";

@Injectable()
export class UpsertTaxRateController extends Controller<
  "private",
  UpsertTaxRateController.Response
> {
  constructor(private readonly upsertTaxRateUseCase: UpsertTaxRateUseCase) {
    super();
  }

  protected override async handle({
    userId,
    params,
    body,
  }: Controller.Request<"private", UpsertTaxRateBody, UpsertTaxRateParams>) {
    const upsertParams = upsertTaxRateParamsSchema.parse(params);
    const upsertBody = upsertTaxRateBodySchema.parse(body);

    const taxRate = await this.upsertTaxRateUseCase.execute({
      entityId: upsertParams.entityId,
      userId,
      year: upsertParams.year,
      month: upsertParams.month,
      ratePercent: upsertBody.ratePercent,
    });

    return { statusCode: 200, body: { taxRate } };
  }
}

export namespace UpsertTaxRateController {
  export type Response = {
    taxRate: TaxRate;
  };
}
```

## Schemas de validação
```ts
// src/application/controllers/taxes/schemas/upsertTaxRateSchema.ts
import { z } from "zod";

export const upsertTaxRateParamsSchema = z.object({
  entityId: z.string().uuid(),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const upsertTaxRateBodySchema = z.object({
  ratePercent: z.coerce.number().min(0).max(100), // ex.: 6.00
});

export type UpsertTaxRateParams = z.infer<typeof upsertTaxRateParamsSchema>;
export type UpsertTaxRateBody = z.infer<typeof upsertTaxRateBodySchema>;
```

## Use case
```ts
// src/application/useCases/taxes/UpsertTaxRateUseCase.ts
import { Injectable } from "@kernel/decorators/Injectable";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { TaxRate } from "@application/entities/TaxRate";
import { TaxRateRepository } from "@infra/database/neon/repositories/TaxRateRepository";

@Injectable()
export class UpsertTaxRateUseCase {
  constructor(
    private readonly taxRepository: TaxRateRepository,
    private readonly entityRepository: EntityRepository
  ) {}

  async execute(
    upsertTaxRateInput: UpsertTaxRateUseCase.Input
  ): Promise<UpsertTaxRateUseCase.Output> {
    const entity = await this.entityRepository.findByUserId({
      entityId: upsertTaxRateInput.entityId,
      userId: upsertTaxRateInput.userId,
    });

    console.log({
      entityId: upsertTaxRateInput.entityId,
      userId: upsertTaxRateInput.userId,
    });

    if (!entity) {
      throw new UnauthorizedException("Sem permissão nesta entidade.");
    }
    const tax = new TaxRate(upsertTaxRateInput);

    const saved = await this.taxRepository.upsert(tax);

    return {
      entityId: saved.entityId,
      userId: saved.userId,
      year: saved.year,
      month: saved.month,
      ratePercent: Number(saved.ratePercent),
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}

export namespace UpsertTaxRateUseCase {
  export type Input = {
    entityId: string;
    userId: string;
    year: number;
    month: number;
    ratePercent: number;
  };

  export type Output = TaxRate;
}
```

## Dependências downstream
### `TaxRateRepository`
```ts
// src/infra/database/neon/repositories/TaxRateRepository.ts
import { Injectable } from "@kernel/decorators/Injectable";
import { DatabaseService } from "..";
import { taxRates } from "../schema";
import { TaxRate } from "@application/entities/TaxRate";
import { TaxRateItem } from "../items/TaxRateItem";
import { and, eq } from "drizzle-orm";

@Injectable()
export class TaxRateRepository {
  constructor(private readonly dbs: DatabaseService) {}

  /** Upsert por (entityId, year, month) */
  async upsert(rate: TaxRate): Promise<TaxRate> {
    const row = TaxRateItem.toRow(rate);

    const [saved] = await this.dbs.db
      .insert(taxRates)
      .values(row)
      .onConflictDoUpdate({
        target: [taxRates.entityId, taxRates.year, taxRates.month],
        set: { ratePercent: row.ratePercent, updatedAt: new Date() },
      })
      .returning();

    return TaxRateItem.fromRow(saved);
  }

  async get(
    entityId: string,
    userId: string,
    year: number,
    month: number
  ): Promise<TaxRate | null> {
    const [r] = await this.dbs.db
      .select()
      .from(taxRates)
      .where(
        and(
          eq(taxRates.entityId, entityId),
          eq(taxRates.userId, userId),
          eq(taxRates.year, year),
          eq(taxRates.month, month)
        )
      );

    return r ? TaxRateItem.fromRow(r) : null;
  }

  async getRateValue(
    entityId: string,
    userId: string,
    year: number,
    month: number
  ): Promise<number | null> {
    const r = await this.get(entityId, userId, year, month);
    return r ? r.ratePercent : null;
  }

  async getMonthlyTax(entityId: string, userId: string, anyDateInMonth: Date) {
    const y = anyDateInMonth.getUTCFullYear();
    const m = anyDateInMonth.getUTCMonth() + 1;

    // pega taxa (se existir)
    const [rateRow] = await this.dbs.db
      .select({ ratePercent: taxRates.ratePercent })
      .from(taxRates)
      .where(
        and(
          eq(taxRates.entityId, entityId),
          eq(taxRates.userId, userId),
          eq(taxRates.year, y),
          eq(taxRates.month, m)
        )
      )
      .limit(1);

    const rate = rateRow ? Number(rateRow.ratePercent) : null;
    return rate;
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
1. A IA/Frontend envia `PUT /entities/{entityId}/tax-rates/{year}/{month}` com `ratePercent` no body e `Authorization`.
2. O controller valida params/body e aciona `UpsertTaxRateUseCase`.
3. O use case valida acesso à entidade e faz upsert da taxa mensal.
4. A resposta retorna `{ taxRate }`.
