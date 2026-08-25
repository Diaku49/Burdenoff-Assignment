import type { PrismaClient } from "../generated/prisma/client.ts";

export type GraphQLContext = {
  prisma: PrismaClient;
};

export function createGraphQLContext(
  prisma: PrismaClient,
): GraphQLContext {
  return { prisma };
}
