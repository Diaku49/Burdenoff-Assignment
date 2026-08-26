import type { Repositories } from "../repositories/repository.types.ts";

export type GraphQLContext = {
  repositories: Repositories;
};

export function createGraphQLContext(
  repositories: Repositories,
): GraphQLContext {
  return { repositories };
}
