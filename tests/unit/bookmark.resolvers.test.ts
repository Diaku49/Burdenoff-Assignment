import { describe, expect, mock, test } from "bun:test";
import { GraphQLError } from "graphql";
import type {
  Bookmark,
  Folder,
} from "../../src/generated/prisma/client.ts";
import { createGraphQLContext } from "../../src/graphql/context.ts";
import { bookmarkResolvers } from "../../src/graphql/resolvers/bookmark.resolvers.ts";
import type {
  BookmarkRepository,
  FolderRepository,
  Repositories,
} from "../../src/repositories/repository.types.ts";

const sourceFolder: Folder = {
  id: 4,
  name: "Development",
  createdAt: new Date("2026-08-26T09:00:00.000Z"),
};

const destinationFolder: Folder = {
  id: 9,
  name: "Reference",
  createdAt: new Date("2026-08-26T09:30:00.000Z"),
};

const bookmarkRecord: Bookmark = {
  id: 21,
  title: "GraphQL Yoga",
  url: "https://the-guild.dev/graphql/yoga-server",
  tags: ["graphql", "bun"],
  folderId: sourceFolder.id,
  createdAt: new Date("2026-08-26T10:00:00.000Z"),
};

function createTestContext() {
  const folders = {
    findAll: mock<FolderRepository["findAll"]>(async () => []),
    findById: mock<FolderRepository["findById"]>(async () => null),
    create: mock<FolderRepository["create"]>(async (name) => ({
      ...sourceFolder,
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

describe("bookmark resolvers", () => {
  test("bookmarks translates GraphQL filters and cursor into repository options", async () => {
    const { context, bookmarks } = createTestContext();
    const repositoryResult = [bookmarkRecord];
    bookmarks.findMany.mockResolvedValue(repositoryResult);

    const result = await bookmarkResolvers.Query.bookmarks(
      undefined,
      {
        folderId: "4",
        search: "  GraphQL  ",
        take: 5,
        cursor: "18",
      },
      context,
    );

    expect(result).toBe(repositoryResult);
    expect(bookmarks.findMany).toHaveBeenCalledWith({
      folderId: 4,
      search: "GraphQL",
      take: 5,
      cursor: 18,
    });
  });

  test("bookmarks applies the default page size and ignores blank search", async () => {
    const { context, bookmarks } = createTestContext();

    await bookmarkResolvers.Query.bookmarks(
      undefined,
      { search: "   " },
      context,
    );

    expect(bookmarks.findMany).toHaveBeenCalledWith({ take: 15 });
  });

  test("createBookmark checks the folder and passes normalized input to the repository", async () => {
    const { context, folders, bookmarks } = createTestContext();
    folders.findById.mockResolvedValue(sourceFolder);

    const result = await bookmarkResolvers.Mutation.createBookmark(
      undefined,
      {
        input: {
          title: "  Bun documentation  ",
          url: "https://bun.com",
          tags: ["bun", "docs"],
          folderId: "4",
        },
      },
      context,
    );

    expect(folders.findById).toHaveBeenCalledWith(4);
    expect(bookmarks.create).toHaveBeenCalledWith({
      title: "Bun documentation",
      url: "https://bun.com/",
      tags: ["bun", "docs"],
      folderId: 4,
    });
    expect(result.title).toBe("Bun documentation");
  });

  test("createBookmark rejects a whitespace-only title without creating a record", async () => {
    const { context, folders, bookmarks } = createTestContext();
    folders.findById.mockResolvedValue(sourceFolder);

    const error = await expectGraphQLError(
      bookmarkResolvers.Mutation.createBookmark(
        undefined,
        {
          input: {
            title: "   ",
            url: "https://example.com",
            tags: [],
            folderId: "4",
          },
        },
        context,
      ),
    );

    expect(error.message).toBe("Bookmark title cannot be empty");
    expect(error.extensions.code).toBe("BAD_USER_INPUT");
    expect(bookmarks.create).not.toHaveBeenCalled();
  });

  test("createBookmark rejects an invalid URL without creating a record", async () => {
    const { context, folders, bookmarks } = createTestContext();
    folders.findById.mockResolvedValue(sourceFolder);

    const error = await expectGraphQLError(
      bookmarkResolvers.Mutation.createBookmark(
        undefined,
        {
          input: {
            title: "Invalid link",
            url: "not-a-url",
            tags: [],
            folderId: "4",
          },
        },
        context,
      ),
    );

    expect(error.extensions.code).toBe("BAD_USER_INPUT");
    expect(bookmarks.create).not.toHaveBeenCalled();
  });

  test("createBookmark refuses to create a bookmark in a missing folder", async () => {
    const { context, folders, bookmarks } = createTestContext();

    const error = await expectGraphQLError(
      bookmarkResolvers.Mutation.createBookmark(
        undefined,
        {
          input: {
            title: "GraphQL",
            url: "https://graphql.org",
            tags: ["graphql"],
            folderId: "404",
          },
        },
        context,
      ),
    );

    expect(error.message).toBe("Folder not found");
    expect(error.extensions.code).toBe("NOT_FOUND");
    expect(folders.findById).toHaveBeenCalledWith(404);
    expect(bookmarks.create).not.toHaveBeenCalled();
  });

  test("updateBookmark changes only the fields provided by the client", async () => {
    const { context, bookmarks } = createTestContext();
    bookmarks.findById.mockResolvedValue(bookmarkRecord);

    const result = await bookmarkResolvers.Mutation.updateBookmark(
      undefined,
      {
        id: "21",
        input: { title: "  Updated title  " },
      },
      context,
    );

    expect(bookmarks.findById).toHaveBeenCalledWith(21);
    expect(bookmarks.update).toHaveBeenCalledWith(21, {
      title: "Updated title",
    });

    expect(result).toBeDefined();

    if (!result) {
      throw new Error("Expected updateBookmark to return the updated bookmark");
    }

    expect(result.title).toBe("Updated title");
    expect(result.url).toBe(bookmarkRecord.url);
  });

  test("updateBookmark rejects an empty update before reading or writing", async () => {
    const { context, bookmarks } = createTestContext();

    const error = await expectGraphQLError(
      bookmarkResolvers.Mutation.updateBookmark(
        undefined,
        { id: "21", input: {} },
        context,
      ),
    );

    expect(error.extensions.code).toBe("BAD_USER_INPUT");
    expect(bookmarks.findById).not.toHaveBeenCalled();
    expect(bookmarks.update).not.toHaveBeenCalled();
  });

  test("deleteBookmark does not issue a delete when the bookmark is missing", async () => {
    const { context, bookmarks } = createTestContext();

    const error = await expectGraphQLError(
      bookmarkResolvers.Mutation.deleteBookmark(
        undefined,
        { id: "404" },
        context,
      ),
    );

    expect(error.message).toBe("Bookmark not found");
    expect(error.extensions.code).toBe("NOT_FOUND");
    expect(bookmarks.findById).toHaveBeenCalledWith(404);
    expect(bookmarks.delete).not.toHaveBeenCalled();
  });

  test("moveBookmark updates the destination only after both records exist", async () => {
    const { context, folders, bookmarks } = createTestContext();
    bookmarks.findById.mockResolvedValue(bookmarkRecord);
    folders.findById.mockResolvedValue(destinationFolder);

    const result = await bookmarkResolvers.Mutation.moveBookmark(
      undefined,
      { id: "21", folderId: "9" },
      context,
    );

    expect(bookmarks.findById).toHaveBeenCalledWith(21);
    expect(folders.findById).toHaveBeenCalledWith(9);
    expect(bookmarks.move).toHaveBeenCalledWith(21, 9);
    expect(result.folderId).toBe(9);
  });

  test("moveBookmark does not move when the destination folder is missing", async () => {
    const { context, folders, bookmarks } = createTestContext();
    bookmarks.findById.mockResolvedValue(bookmarkRecord);

    const error = await expectGraphQLError(
      bookmarkResolvers.Mutation.moveBookmark(
        undefined,
        { id: "21", folderId: "404" },
        context,
      ),
    );

    expect(error.message).toBe("Folder not found");
    expect(folders.findById).toHaveBeenCalledWith(404);
    expect(bookmarks.move).not.toHaveBeenCalled();
  });
});
