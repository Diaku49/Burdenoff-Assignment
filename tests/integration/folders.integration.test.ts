import { describe, expect, test } from "bun:test";
import { execute, expectData, setupIntegrationSuite } from "./support/harness.ts";
import { FOLDER, FOLDERS } from "./support/operations.ts";
import type { FolderPayload } from "./support/types.ts";

const suite = setupIntegrationSuite();

describe("folders and nested bookmarks", () => {
  test("persists a folder with bookmarks and reads them back nested", async () => {
    const folderName = suite.uniqueName("Engineering");
    const folderId = await suite.createFolder(folderName);

    const created = await suite.createBookmark(
      folderId,
      "Bun documentation",
      "https://bun.com/docs",
      ["bun", "runtime"],
    );
    await suite.createBookmark(
      folderId,
      "GraphQL Yoga",
      "https://the-guild.dev/",
    );

    expect(created.folderId).toBe(folderId);
    expect(created.tags).toEqual(["bun", "runtime"]);

    const listed = expectData(
      await execute<{ folders: FolderPayload[] }>(FOLDERS),
    ).folders;
    expect(listed.map((folder) => folder.name)).toContain(folderName);

    const folder = expectData(
      await execute<{ folder: FolderPayload }>(FOLDER, { id: folderId }),
    ).folder;

    expect(folder.id).toBe(folderId);
    expect(folder.name).toBe(folderName);
    expect(new Date(folder.createdAt).toISOString()).toBe(folder.createdAt);

    expect(folder.bookmarks.map((bookmark) => bookmark.title)).toEqual([
      "Bun documentation",
      "GraphQL Yoga",
    ]);
    expect(folder.bookmarks.map((bookmark) => bookmark.url)).toEqual([
      "https://bun.com/docs",
      "https://the-guild.dev/",
    ]);
    expect(
      folder.bookmarks.every((bookmark) => bookmark.folderId === folderId),
    ).toBe(true);
  });
});
