import { describe, expect, mock, test } from "bun:test";
import { GraphQLError } from "graphql";
import type {
  Bookmark,
  Folder,
} from "../../src/generated/prisma/client.ts";
import { createGraphQLContext } from "../../src/graphql/context.ts";
import { folderResolvers } from "../../src/graphql/resolvers/folder.resolvers.ts";
import type {
  BookmarkRepository,
  FolderRepository,
  Repositories,
} from "../../src/repositories/repository.types.ts";

const folderRecord: Folder = {
  id: 7,
  name: "Engineering",
  createdAt: new Date("2026-08-26T10:30:00.000Z"),
};

const bookmarkRecord: Bookmark = {
  id: 12,
  title: "Bun testing",
  url: "https://bun.com/docs/test",
  tags: ["bun", "testing"],
  folderId: folderRecord.id,
  createdAt: new Date("2026-08-26T11:00:00.000Z"),
};

function createTestContext() {
  const folders = {
    findAll: mock<FolderRepository["findAll"]>(async () => []),
    findById: mock<FolderRepository["findById"]>(async () => null),
    create: mock<FolderRepository["create"]>(async (name) => ({
      ...folderRecord,
      name,
    })),
  } satisfies FolderRepository;

  const bookmarks = {
    findMany: mock<BookmarkRepository["findMany"]>(async () => []),
    findById: mock<BookmarkRepository["findById"]>(async () => null),
    findByFolderId: mock<BookmarkRepository["findByFolderId"]>(
      async () => [],
    ),
    create: mock<BookmarkRepository["create"]>(async (data) => ({
      ...bookmarkRecord,
      ...data,
    })),
    update: mock<BookmarkRepository["update"]>(async (_id, data) => ({
      ...bookmarkRecord,
      ...data,
    })),
    delete: mock<BookmarkRepository["delete"]>(async () => bookmarkRecord),
    move: mock<BookmarkRepository["move"]>(async (_id, folderId) => ({
      ...bookmarkRecord,
      folderId,
    })),
  } satisfies BookmarkRepository;

  const repositories = {
    folders,
    bookmarks,
  } satisfies Repositories;

  return {
    context: createGraphQLContext(repositories),
    folders,
    bookmarks,
  };
}

async function expectGraphQLError(
  operation: Promise<unknown>,
): Promise<GraphQLError> {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(GraphQLError);

    if (error instanceof GraphQLError) {
      return error;
    }

    throw error;
  }

  throw new Error("Expected the resolver to throw a GraphQLError");
}

describe("folder resolvers", () => {
  test("folders returns the repository result without changing it", async () => {
    const { context, folders } = createTestContext();
    const repositoryResult = [folderRecord];
    folders.findAll.mockResolvedValue(repositoryResult);

    const result = await folderResolvers.Query.folders(
      undefined,
      {},
      context,
    );

    expect(result).toBe(repositoryResult);
    expect(folders.findAll).toHaveBeenCalledTimes(1);
  });

  test("folder converts the GraphQL ID before looking up the folder", async () => {
    const { context, folders } = createTestContext();
    folders.findById.mockResolvedValue(folderRecord);

    const result = await folderResolvers.Query.folder(
      undefined,
      { id: "7" },
      context,
    );

    expect(result).toBe(folderRecord);
    expect(folders.findById).toHaveBeenCalledWith(7);
  });

  test("folder reports NOT_FOUND when the repository has no matching folder", async () => {
    const { context, folders } = createTestContext();

    const error = await expectGraphQLError(
      folderResolvers.Query.folder(undefined, { id: "404" }, context),
    );

    expect(error.message).toBe("Folder not found");
    expect(error.extensions.code).toBe("NOT_FOUND");
    expect(folders.findById).toHaveBeenCalledWith(404);
  });

  test("folder rejects an invalid ID before accessing the repository", async () => {
    const { context, folders } = createTestContext();

    const error = await expectGraphQLError(
      folderResolvers.Query.folder(undefined, { id: "not-an-id" }, context),
    );

    expect(error.extensions.code).toBe("BAD_USER_INPUT");
    expect(folders.findById).not.toHaveBeenCalled();
  });

  test("createFolder passes the input name to the repository", async () => {
    const { context, folders } = createTestContext();

    const result = await folderResolvers.Mutation.createFolder(
      undefined,
      { input: { name: "Reading list" } },
      context,
    );

    expect(result.name).toBe("Reading list");
    expect(folders.create).toHaveBeenCalledWith("Reading list");
    expect(folders.create).toHaveBeenCalledTimes(1);
  });

  test("createFolder rejects missing input without writing to the repository", () => {
    const { context, folders } = createTestContext();

    expect(() =>
      folderResolvers.Mutation.createFolder(
        undefined,
        { input: null },
        context,
      ),
    ).toThrow("input is required");
    expect(folders.create).not.toHaveBeenCalled();
  });

  test("Folder.bookmarks uses the ID of its parent folder", async () => {
    const { context, bookmarks } = createTestContext();
    bookmarks.findByFolderId.mockResolvedValue([bookmarkRecord]);

    const result = await folderResolvers.Folder.bookmarks(
      folderRecord,
      {},
      context,
    );

    expect(result).toEqual([bookmarkRecord]);
    expect(bookmarks.findByFolderId).toHaveBeenCalledWith(folderRecord.id);
  });

  test("Folder.createdAt serializes Prisma's Date as an ISO string", () => {
    const result = folderResolvers.Folder.createdAt(folderRecord);

    expect(result).toBe("2026-08-26T10:30:00.000Z");
  });
});
