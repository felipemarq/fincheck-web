# Lambda: listCategories (`GET /categories`)

> ⚠️ **Aviso:** Esta Lambda/API está em desenvolvimento. O código e os contratos podem mudar a qualquer momento. Este markdown captura o estado atual da API no momento da geração.

## Entry point
- **Handler:** `src/main/functions/categories/listCategories.handler`
- **Evento:** HTTP API (`GET /categories`)
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
import { ListCategoriesController } from "@application/controllers/categories/ListCategoriesController";

export const handler = lambdaHttpAdapter(ListCategoriesController);
```

## Controller
```ts
import { Controller } from "@application/contracts/Controller";
import { Injectable } from "@kernel/decorators/Injectable";
import { Category } from "@application/entities/Category";
import { ListCategoriesUseCase } from "@application/useCases/categories/ListCategoriesUseCase";
import {
  listCategoriesQuerySchema,
  ListCategoriesQuery,
} from "./schemas/listCategoriesQuerySchema";

@Injectable()
export class ListCategoriesController extends Controller<
  "private",
  ListCategoriesController.Response
> {
  constructor(private readonly listCategoriesUseCase: ListCategoriesUseCase) {
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
    ListCategoriesQuery
  >): Promise<Controller.Response<ListCategoriesController.Response>> {
    const listCategoriesFilters = listCategoriesQuerySchema.parse(
      queryParams ?? {}
    );

    const { categories } = await this.listCategoriesUseCase.execute({
      ...listCategoriesFilters,
      userId,
    });

    return {
      statusCode: 200,
      body: { categories },
    };
  }
}

export namespace ListCategoriesController {
  export type Response = {
    categories: Category[];
  };
}
```

## Schemas de validação
```ts
import { z } from "zod";

export const listCategoriesQuerySchema = z.object({
  entityId: z.string().uuid(),
});

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
```

## Use case
```ts
import { ListCategoriesQuery } from "@application/controllers/categories/schemas/listCategoriesQuerySchema";
import { ListCreditCardsQuery } from "@application/controllers/creditCards/schemas/listCreditCardsQuerySchema";
import { Category } from "@application/entities/Category";
import { CreditCard } from "@application/entities/CreditCard";
import { UnauthorizedException } from "@application/errors/http/UnauthorizedException";
import { CategoryRepository } from "@infra/database/neon/repositories/CategoryRepository";
import { EntityRepository } from "@infra/database/neon/repositories/EntityRepository";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly entityRepository: EntityRepository
  ) {}

  async execute(
    listCategoriesInput: ListCategoriesUseCase.Input
  ): Promise<ListCategoriesUseCase.Output> {
    const entity = await this.entityRepository.findByUserId({
      userId: listCategoriesInput.userId,
      entityId: listCategoriesInput.entityId,
    });

    if (!entity) {
      throw new UnauthorizedException(
        "Usuário não tem permissão para visualizar categorias nessa entidade."
      );
    }

    const categories = await this.categoryRepository.listAll({
      filters: {
        entityId: listCategoriesInput.entityId,
      },
      userId: listCategoriesInput.userId,
    });

    return { categories };
  }
}

export namespace ListCategoriesUseCase {
  export type Input = ListCategoriesQuery & { userId: string };
  export type Output = {
    categories: Category[];
  };
}
```

## Dependências downstream
### `CategoryRepository`
```ts
import { Account } from "@application/entities/Account";
import { DatabaseService } from "..";
import { accountsTable, categoriesTable, transactionsTable } from "../schema";
import { AccountItem } from "../items/AccountItem";
import { Injectable } from "@kernel/decorators/Injectable";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { ListCategoriesQuery } from "@application/controllers/categories/schemas/listCategoriesQuerySchema";
import { Category } from "@application/entities/Category";
import { CategoryItem } from "../items/CategoryItem";

export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
}> = [
  // INCOME
  { name: "Salário", type: "INCOME", icon: "salary" },
  { name: "Vendas", type: "INCOME", icon: "sale" },
  { name: "Rendimentos", type: "INCOME", icon: "trending-up" },

  // EXPENSE
  { name: "Aluguel", type: "EXPENSE", icon: "home" },
  { name: "Alimentação", type: "EXPENSE", icon: "food" },
  { name: "Transporte", type: "EXPENSE", icon: "transport" },
  { name: "Saúde", type: "EXPENSE", icon: "health" },
  { name: "Educação", type: "EXPENSE", icon: "edication" },
  { name: "Lazer", type: "EXPENSE", icon: "fun" },
  { name: "Impostos", type: "EXPENSE", icon: "tax" },
];

@Injectable()
export class CategoryRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async seedDefault({
    entityId,
    userId,
  }: {
    entityId: string;
    userId: string;
  }) {
    const values = DEFAULT_CATEGORIES.map((c) => ({
      entityId,
      userId,
      name: c.name,
      icon: c.icon,
      type: c.type, // 'INCOME' | 'EXPENSE'
    }));
    const insertedCategories = await this.databaseService.db
      .insert(categoriesTable)
      .values(values)
      .onConflictDoNothing({
        target: [
          categoriesTable.entityId,
          categoriesTable.name,
          categoriesTable.type,
        ],
      })
      .returning();

    return insertedCategories;
  }

  async listAll({
    filters,
    userId,
  }: {
    filters: ListCategoriesQuery;
    userId: string;
  }): Promise<Category[]> {
    const whereClause = [
      eq(categoriesTable.entityId, filters.entityId),
      eq(categoriesTable.userId, userId),
    ];

    const whereExpr = and(...whereClause);

    const cards = await this.databaseService.db
      .select()
      .from(categoriesTable)
      .where(whereExpr);

    return cards.map((row) => CategoryItem.fromRow(row));
  }

  async getTopCategories(
    entityId: string,
    userId: string,
    from: Date,
    to: Date,
    topN: number
  ) {
    const rows = await this.databaseService.db
      .select({
        categoryId: transactionsTable.categoryId,
        name: categoriesTable.name,
        icon: categoriesTable.icon,
        amount: sql<number>`sum((${transactionsTable.value})::numeric)`,
      })
      .from(transactionsTable)
      .innerJoin(
        categoriesTable,
        and(
          eq(categoriesTable.id, transactionsTable.categoryId),
          eq(categoriesTable.entityId, entityId)
        )
      )
      .where(
        and(
          eq(transactionsTable.entityId, entityId),
          eq(transactionsTable.userId, userId),
          eq(transactionsTable.type, "EXPENSE"),
          gte(transactionsTable.date, from),
          lte(transactionsTable.date, to)
        )
      )
      .groupBy(
        transactionsTable.categoryId,
        categoriesTable.name,
        categoriesTable.icon
      )
      .orderBy(desc(sql`sum((${transactionsTable.value})::numeric)`))
      .limit(topN);
    return rows;
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
1. A IA/Frontend chama `GET /categories?entityId=...` com `Authorization`.
2. O controller valida query via `listCategoriesQuerySchema`.
3. O use case garante acesso à entidade e lista categorias no `CategoryRepository`.
4. A resposta retorna `{ categories }`.
