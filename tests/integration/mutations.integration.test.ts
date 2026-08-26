import { describe, expect, test } from "bun:test";
import {
  execute,
  expectData,
  prisma,
  setupIntegrationSuite,
} from "./support/harness.ts";
import {
  BOOKMARKS,
  DELETE_BOOKMARK,
  FOLDER,
  MOVE_BOOKMARK,
  UPDATE_BOOKMARK,
} from "./support/operations.ts";
import type { BookmarkPayload, FolderPayload } from "./support/types.ts";

const suite = setupIntegrationSuite();

describe("bookmark mutations", () => {
  test("updateBookmark changes only the supplied fields", async () => {
    const folderId = await suite.createFolder(suite.uniqueName("Update"));
    const bookmark = await suite.createBookmark(
      folderId,
      "Original title",
      "https://example.com/original",
      ["draft"],
    );

    const updated = expectData(
      await execute<{ updateBookmark: BookmarkPayload }>(UPDATE_BOOKMARK, {
        id: bookmark.id,
        input: { title: "  Renamed bookmark  ", tags: ["reviewed"] },
      }),
    ).updateBookmark;

    expect(updated.title).toBe("Renamed bookmark");
    expect(updated.tags).toEqual(["reviewed"]);
    expect(updated.url).toBe("https://example.com/original");

    // Read back directly, so a resolver echoing its input cannot pass.
    const stored = await prisma.bookmark.findUnique({
      where: { id: Number(bookmark.id) },
    });
    expect(stored?.title).toBe("Renamed bookmark");
    expect(stored?.tags).toEqual(["reviewed"]);
    expect(stored?.url).toBe("https://example.com/original");
  });

  test("moveBookmark reassigns the row to the destination folder", async () => {
    const sourceId = await suite.createFolder(suite.uniqueName("Move source"));
    const targetId = await suite.createFolder(suite.uniqueName("Move target"));
    const bookmark = await suite.createBookmark(
      sourceId,
      "Portable bookmark",
      "https://example.com/portable",
    );

    const moved = expectData(
      await execute<{ moveBookmark: BookmarkPayload }>(MOVE_BOOKMARK, {
        id: bookmark.id,
        folderId: targetId,
      }),
    ).moveBookmark;
    expect(moved.folderId).toBe(targetId);

    const source = expectData(
      await execute<{ folder: FolderPayload }>(FOLDER, { id: sourceId }),
    ).folder;
    const target = expectData(
      await execute<{ folder: FolderPayload }>(FOLDER, { id: targetId }),
    ).folder;

    expect(source.bookmarks).toEqual([]);
    expect(target.bookmarks.map((entry) => entry.id)).toEqual([bookmark.id]);
    expect(target.bookmarks.map((entry) => entry.title)).toEqual([
      "Portable bookmark",
    ]);
  });

  test("deleteBookmark removes the row from PostgreSQL", async () => {
    const folderId = await suite.createFolder(suite.uniqueName("Delete"));
    const bookmark = await suite.createBookmark(
      folderId,
      "Temporary bookmark",
      "https://example.com/temporary",
    );

    const deleted = expectData(
      await execute<{ deleteBookmark: BookmarkPayload }>(DELETE_BOOKMARK, {
        id: bookmark.id,
      }),
    ).deleteBookmark;

    expect(deleted.id).toBe(bookmark.id);
    expect(deleted.title).toBe("Temporary bookmark");

    const remaining = expectData(
      await execute<{ bookmarks: BookmarkPayload[] }>(BOOKMARKS, { folderId }),
    ).bookmarks;
    expect(remaining).toEqual([]);

    expect(
      await prisma.bookmark.findUnique({ where: { id: Number(bookmark.id) } }),
    ).toBeNull();
  });
});
