import { createYoga } from "graphql-yoga";
import type { PrismaClient } from "./generated/prisma/client.ts";
import {
  createGraphQLContext,
  type GraphQLContext,
} from "./graphql/context.ts";
import { schema } from "./graphql/schema.ts";
import { PrismaBookmarkRepository } from "./repositories/bookmark.repository.ts";
import { PrismaFolderRepository } from "./repositories/folder.repository.ts";
import type { Repositories } from "./repositories/repository.types.ts";

export function createGraphQLServer(prisma: PrismaClient) {
  const repositories: Repositories = {
    folders: new PrismaFolderRepository(prisma),
    bookmarks: new PrismaBookmarkRepository(prisma),
  };

  return createYoga<{}, GraphQLContext>({
    schema,
    context: () => createGraphQLContext(repositories),
  });
}
