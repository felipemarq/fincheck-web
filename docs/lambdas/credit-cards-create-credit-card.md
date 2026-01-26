# Lambda: createCreditCard (`POST /credit-cards`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/creditCards/createCreditCard.handler`
- **Evento:** HTTP API (`POST /credit-cards`)
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
import { CreateCreditCardController } from "@application/controllers/creditCards/CreateCreditCardController";

export const handler = lambdaHttpAdapter(CreateCreditCardController);
```

## Controller
```ts
import { Schema } from "@kernel/decorators/Schema";
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";
import {
  CreateCreditCardBody,
  createCreditCardSchema,
} from "./schemas/createCreditCardSchema";
import { CreditCard } from "@application/entities/CreditCard";
import { CreateCreditCardUseCase } from "@application/useCases/creditCards/CreateCreditCardUseCase";

@Injectable()
@Schema(createCreditCardSchema)
export class CreateCreditCardController extends Controller<
  "private",
  CreateCreditCardController.Response
> {
  constructor(
    private readonly createCreditCardUseCase: CreateCreditCardUseCase
  ) {
    super();
  }

  protected override async handle({
    userId,
    body,
  }: Controller.Request<"private", CreateCreditCardBody>): Promise<
    Controller.Response<CreateCreditCardController.Response>
  > {
    const creditCard = await this.createCreditCardUseCase.execute({
      userId,
      ...body,
    });

    return {
      statusCode: 201,
      body: {
        creditCard,
      },
    };
  }
}

export namespace CreateCreditCardController {
  export type Response = {
    creditCard: CreditCard;
  };
}
```

## Schemas de validação
```ts
import { Account } from "@application/entities/Account";
import { z } from "zod";

export const createCreditCardSchema = z.object({
  entityId: z.string().uuid("Id da entidade inválido"),
  accountId: z.string().uuid("Id da conta inválido"),
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string().optional(),
  closingDay: z.number().min(1, "Dia de fechamento é obrigatório"),
  dueDay: z.number().min(1, "Dia de vencimento é obrigatório"),
  creditLimit: z.number().min(1, "Limite de crédito é obrigatório"),
});

export type CreateCreditCardBody = z.infer<typeof createCreditCardSchema>;
```

## Use case
```ts
import { CreditCard } from "@application/entities/CreditCard";
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { CreditCardRepository } from "@infra/database/neon/repositories/CreditCardRepository";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class CreateCreditCardUseCase {
  constructor(
    private readonly creditCardRepository: CreditCardRepository,
    private readonly entityRepository: EntityRepository
  ) {}

  async execute({
    entityId,
    userId,
    accountId,
    name,
    color,
    creditLimit,
    closingDay,
    dueDay,
  }: CreateCreditCardUseCase.Input): Promise<CreateCreditCardUseCase.Output> {
    const entity = await this.entityRepository.findByUserId({
      userId,
      entityId,
    });

    if (!entity) {
      throw new UnauthorizedException(
        "Usuário não tem permissão para criar cartões nessa entidade."
      );
    }

    const creditCard = new CreditCard({
      entityId,
      userId,
      accountId,
      name,
      color,
      creditLimit,
      closingDay,
      dueDay,
    });

    const createdCreditCard = await this.creditCardRepository.create(
      creditCard
    );

    return createdCreditCard;
  }
}

export namespace CreateCreditCardUseCase {
  export type Input = {
    userId: string;
    entityId: string;
    accountId?: string;
    name: string;
    color?: string;
    creditLimit?: number;
    closingDay: number; // 1–28
    dueDay: number; // 1–28
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
1. A IA/Frontend chama `POST /credit-cards` com dados do cartão e `Authorization`.
2. O controller valida o body com `createCreditCardSchema`.
3. O use case verifica permissão na entidade e cria o cartão no repositório.
4. Resposta retorna `{ creditCard }`.
