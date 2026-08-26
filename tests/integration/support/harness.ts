import { afterAll, beforeAll, expect } from "bun:test";
import { prisma } from "../../../src/db/prisma.ts";
import { createGraphQLServer } from "../../../src/server.ts";
import { CREATE_BOOKMARK, CREATE_FOLDER } from "./operations.ts";
import type {
  BookmarkPayload,
  FolderPayload,
  GraphQLResponse,
  GraphQLResponseError,
} from "./types.ts";

const yoga = createGraphQLServer(prisma);
const endpoint = `http://integration.test${yoga.graphqlEndpoint}`;

// A valid int4 that matches no row.
export const MISSING_ID = "2147483647";

export { prisma };

export async function execute<TData>(
  document: string,
  variables: Record<string, unknown> = {},
): Promise<GraphQLResponse<TData>> {
  const response = await yoga.fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: document, variables }),
  });

  // Failures must surface as GraphQL errors, never as a 500.
  expect(response.status).toBe(200);

  return (await response.json()) as GraphQLResponse<TData>;
}

export function expectData<TData>(body: GraphQLResponse<TData>): TData {
  if (body.errors && body.errors.length > 0) {
    throw new Error(
      `Expected no GraphQL errors, received: ${JSON.stringify(body.errors)}`,
    );
  }

  if (!body.data) {
    throw new Error("Expected the GraphQL response to contain data");
  }

  return body.data;
}

export function expectError<TData>(
  body: GraphQLResponse<TData>,
): GraphQLResponseError {
  const [error] = body.errors ?? [];

  if (!error) {
    throw new Error(
      `Expected a GraphQL error, received: ${JSON.stringify(body.data)}`,
    );
  }

  return error;
}

export type IntegrationSuite = {
  uniqueName(label: string): string;
  createFolder(name: string): Promise<string>;
  createBookmark(
    folderId: string,
    title: string,
    url: string,
    tags?: string[],
  ): Promise<BookmarkPayload>;
};

export function setupIntegrationSuite(): IntegrationSuite {
  // Scoped per file so teardown only removes rows that file created.
  const createdFolderIds = new Set<number>();
  const runId = crypto.randomUUID().slice(0, 8);

  beforeAll(async () => {
    try {
      await prisma.folder.findFirst();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);

      throw new Error(
        "Could not query PostgreSQL. Start the database and apply migrations " +
          "before running the integration tests:\n" +
          "  docker compose up -d\n" +
          "  bun run db:migrate\n" +
          `Original error: ${detail}`,
      );
    }
  });

  afterAll(async () => {
    const folderIds = [...createdFolderIds];

    if (folderIds.length === 0) {
      return;
    }

    // Bookmarks first: the folder FK is ON DELETE RESTRICT.
    await prisma.bookmark.deleteMany({
      where: { folderId: { in: folderIds } },
    });
    await prisma.folder.deleteMany({ where: { id: { in: folderIds } } });
  });

  async function createFolder(name: string): Promise<string> {
    const folder = expectData(
      await execute<{ createFolder: FolderPayload }>(CREATE_FOLDER, {
        input: { name },
      }),
    ).createFolder;

    createdFolderIds.add(Number(folder.id));

    return folder.id;
  }

  async function createBookmark(
    folderId: string,
    title: string,
    url: string,
    tags: string[] = [],
  ): Promise<BookmarkPayload> {
    return expectData(
      await execute<{ createBookmark: BookmarkPayload }>(CREATE_BOOKMARK, {
        input: { title, url, tags, folderId },
      }),
    ).createBookmark;
  }

  return {
    uniqueName: (label: string): string => `${label} ${runId}`,
    createFolder,
    createBookmark,
  };
}
