# Lambda: updateCreditCard (`PATCH /credit-cards/{creditCardId}`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/creditCards/updateCreditCard.handler`
- **Evento:** HTTP API (`PATCH /credit-cards/{creditCardId}`)
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
import { UpdateCreditCardController } from "@application/controllers/creditCards/UpdateCreditCardController";

export const handler = lambdaHttpAdapter(UpdateCreditCardController);
```

## Controller
```ts
import { Schema } from "@kernel/decorators/Schema";
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";
import {
  UpdateCreditCardBody,
  updateCreditCardSchema,
} from "./schemas/updateCreditCardSchema";
import {
  UpdateCreditCardParams,
  updateCreditCardParamsSchema,
} from "./schemas/updateCreditCardParamsSchema";
import { CreditCard } from "@application/entities/CreditCard";
import { UpdateCreditCardUseCase } from "@application/useCases/creditCards/UpdateCreditCardUseCase";

@Injectable()
@Schema(updateCreditCardSchema)
export class UpdateCreditCardController extends Controller<
  "private",
  UpdateCreditCardController.Response
> {
  constructor(
    private readonly updateCreditCardUseCase: UpdateCreditCardUseCase
  ) {
    super();
  }

  protected override async handle({
    userId,
    body,
    params,
  }: Controller.Request<
    "private",
    UpdateCreditCardBody,
    UpdateCreditCardParams
  >): Promise<Controller.Response<UpdateCreditCardController.Response>> {
    const updateParams = updateCreditCardParamsSchema.parse(params);
    const creditCard = await this.updateCreditCardUseCase.execute({
      id: updateParams.creditCardId,
      ...body,
      userId,
    });

    return {
      statusCode: 200,
      body: {
        creditCard,
      },
    };
  }
}

export namespace UpdateCreditCardController {
  export type Response = {
    creditCard: CreditCard;
  };
}
```

## Schemas de validação
```ts
// src/application/controllers/transactions/schemas/createTransactionSchema.ts
import { z } from "zod";
import { createCreditCardSchema } from "./createCreditCardSchema";

export const updateCreditCardSchema = createCreditCardSchema
  .partial()
  .extend({
    entityId: createCreditCardSchema.shape.entityId,
  });

export type UpdateCreditCardBody = z.infer<typeof updateCreditCardSchema>;
```

```ts
import { z } from "zod";

export const updateCreditCardParamsSchema = z.object({
  creditCardId: z.string().uuid(),
});
export type UpdateCreditCardParams = z.infer<
  typeof updateCreditCardParamsSchema
>;
```

## Use case
```ts
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { Injectable } from "@kernel/decorators/Injectable";
import { CreateCreditCardUseCase } from "./CreateCreditCardUseCase";
import { CreditCardRepository } from "@infra/database/neon/repositories/CreditCardRepository";
import { CreditCard } from "@application/entities/CreditCard";

@Injectable()
export class UpdateCreditCardUseCase {
  constructor(
    private readonly creditCardRepository: CreditCardRepository,
    private readonly entityRepository: EntityRepository
  ) {}

  async execute(
    creditCardInput: UpdateCreditCardUseCase.Input
  ): Promise<UpdateCreditCardUseCase.Output> {
    const entity = await this.entityRepository.findByUserId({
      userId: creditCardInput.userId,
      entityId: creditCardInput.entityId,
    });

    if (!entity) {
      throw new UnauthorizedException(
        "Usuário não tem permissão para editar transações nessa entidade."
      );
    }

    const creditCardExists = await this.creditCardRepository.findOne({
      creditCardId: creditCardInput.id,
      entityId: creditCardInput.entityId,
      userId: creditCardInput.userId,
    });

    if (!creditCardExists) {
      throw new UnauthorizedException("Cartão não encontrado para editar.");
    }

    const creditCard = new CreditCard({
      ...creditCardExists,
      ...creditCardInput,
      createdAt: creditCardInput.createdAt
        ? new Date(creditCardInput.createdAt)
        : creditCardExists.createdAt,
      updatedAt: creditCardInput.updatedAt
        ? new Date(creditCardInput.updatedAt)
        : creditCardExists.updatedAt,
    });

    const updatedTransaction = await this.creditCardRepository.update(
      creditCardInput.id,
      creditCard
    );

    return updatedTransaction;
  }
}

export namespace UpdateCreditCardUseCase {
  export type Input = Partial<CreateCreditCardUseCase.Input> & {
    id: string;
    entityId: string;
    userId: string;
    createdAt?: string;
    updatedAt?: string;
  };
  export type Output = CreditCard;
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
1. A IA/Frontend chama `PATCH /credit-cards/{creditCardId}` com body parcial e `Authorization`.
2. O controller valida params e body, depois chama `UpdateCreditCardUseCase`.
3. O use case verifica permissões e atualiza o cartão.
4. Resposta retorna `{ creditCard }`.
