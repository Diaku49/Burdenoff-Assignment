import { createYoga } from "graphql-yoga";
import type { PrismaClient } from "./generated/prisma/client.ts";
import {
  createGraphQLContext,
  type GraphQLContext,
} from "./graphql/context.ts";
import { schema } from "./graphql/schema.ts";

export function createGraphQLServer(prisma: PrismaClient) {
  return createYoga<{}, GraphQLContext>({
    schema,
    context: () => createGraphQLContext(prisma),
  });
}
