import { describe, expect, test } from "bun:test";
import {
  execute,
  expectError,
  MISSING_ID,
  prisma,
  setupIntegrationSuite,
} from "./support/harness.ts";
import {
  CREATE_BOOKMARK,
  MOVE_BOOKMARK,
  UPDATE_BOOKMARK,
} from "./support/operations.ts";
import type { BookmarkPayload } from "./support/types.ts";

const suite = setupIntegrationSuite();

describe("error handling against the database", () => {
  test("a missing bookmark is reported as NOT_FOUND", async () => {
    const error = expectError(
      await execute<{ updateBookmark: BookmarkPayload }>(UPDATE_BOOKMARK, {
        id: MISSING_ID,
        input: { title: "Should not persist" },
      }),
    );

    expect(error.message).toBe("Bookmark not found");
    expect(error.extensions?.code).toBe("NOT_FOUND");
  });

  test("moving to a missing folder leaves the bookmark where it was", async () => {
    const folderId = await suite.createFolder(suite.uniqueName("Move guard"));
    const bookmark = await suite.createBookmark(
      folderId,
      "Stable bookmark",
      "https://example.com/stable",
    );

    const error = expectError(
      await execute<{ moveBookmark: BookmarkPayload }>(MOVE_BOOKMARK, {
        id: bookmark.id,
        folderId: MISSING_ID,
      }),
    );
    expect(error.message).toBe("Folder not found");
    expect(error.extensions?.code).toBe("NOT_FOUND");

    // The rejected move must not have relocated the row.
    const stored = await prisma.bookmark.findUnique({
      where: { id: Number(bookmark.id) },
    });
    expect(stored?.folderId).toBe(Number(folderId));
    expect(stored?.title).toBe("Stable bookmark");
  });

  test("invalid bookmark input is rejected and inserts nothing", async () => {
    const folderId = await suite.createFolder(suite.uniqueName("Validation"));
    const where = { folderId: Number(folderId) };

    expect(await prisma.bookmark.count({ where })).toBe(0);

    const badUrl = expectError(
      await execute<{ createBookmark: BookmarkPayload }>(CREATE_BOOKMARK, {
        input: {
          title: "Malformed link",
          url: "not-a-url",
          tags: [],
          folderId,
        },
      }),
    );
    expect(badUrl.extensions?.code).toBe("BAD_USER_INPUT");

    const blankTitle = expectError(
      await execute<{ createBookmark: BookmarkPayload }>(CREATE_BOOKMARK, {
        input: {
          title: "   ",
          url: "https://example.com/blank",
          tags: [],
          folderId,
        },
      }),
    );
    expect(blankTitle.message).toBe("Bookmark title cannot be empty");
    expect(blankTitle.extensions?.code).toBe("BAD_USER_INPUT");

    expect(await prisma.bookmark.count({ where })).toBe(0);
  });
});
