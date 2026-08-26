import { describe, expect, test } from "bun:test";
import { execute, expectData, setupIntegrationSuite } from "./support/harness.ts";
import { BOOKMARKS } from "./support/operations.ts";
import type { BookmarkPayload } from "./support/types.ts";

const suite = setupIntegrationSuite();

describe("bookmark filtering and search", () => {
  test("folderId returns only the bookmarks in that folder", async () => {
    const engineeringId = await suite.createFolder(
      suite.uniqueName("Filter source"),
    );
    const readingId = await suite.createFolder(
      suite.uniqueName("Filter target"),
    );

    await suite.createBookmark(
      engineeringId,
      "GraphQL spec",
      "https://spec.graphql.org/",
    );
    await suite.createBookmark(
      engineeringId,
      "Prisma docs",
      "https://prisma.io/docs",
    );
    await suite.createBookmark(
      readingId,
      "GraphQL weekly",
      "https://graphqlweekly.com/",
    );

    const inEngineering = expectData(
      await execute<{ bookmarks: BookmarkPayload[] }>(BOOKMARKS, {
        folderId: engineeringId,
      }),
    ).bookmarks;
    expect(inEngineering.map((bookmark) => bookmark.title)).toEqual([
      "GraphQL spec",
      "Prisma docs",
    ]);

    const inReading = expectData(
      await execute<{ bookmarks: BookmarkPayload[] }>(BOOKMARKS, {
        folderId: readingId,
      }),
    ).bookmarks;
    expect(inReading.map((bookmark) => bookmark.title)).toEqual([
      "GraphQL weekly",
    ]);
  });

  test("search matches a case-insensitive substring of the title", async () => {
    const folderId = await suite.createFolder(suite.uniqueName("Search"));

    await suite.createBookmark(
      folderId,
      "GraphQL spec",
      "https://spec.graphql.org/",
    );
    await suite.createBookmark(
      folderId,
      "Prisma docs",
      "https://prisma.io/docs",
    );

    const lowercase = expectData(
      await execute<{ bookmarks: BookmarkPayload[] }>(BOOKMARKS, {
        folderId,
        search: "graphql",
      }),
    ).bookmarks;
    expect(lowercase.map((bookmark) => bookmark.title)).toEqual([
      "GraphQL spec",
    ]);

    const substring = expectData(
      await execute<{ bookmarks: BookmarkPayload[] }>(BOOKMARKS, {
        folderId,
        search: "isma do",
      }),
    ).bookmarks;
    expect(substring.map((bookmark) => bookmark.title)).toEqual([
      "Prisma docs",
    ]);

    // Search is title-only, so a URL fragment must not match.
    const urlFragment = expectData(
      await execute<{ bookmarks: BookmarkPayload[] }>(BOOKMARKS, {
        folderId,
        search: "prisma.io",
      }),
    ).bookmarks;
    expect(urlFragment).toEqual([]);
  });
});
