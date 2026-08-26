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

  test("search treats LIKE wildcards as literal characters", async () => {
    const folderId = await suite.createFolder(suite.uniqueName("Wildcards"));

    await suite.createBookmark(
      folderId,
      "100% coverage",
      "https://example.com/coverage",
    );
    await suite.createBookmark(
      folderId,
      "snake_case naming",
      "https://example.com/naming",
    );
    await suite.createBookmark(
      folderId,
      "Plain title",
      "https://example.com/plain",
    );

    const percent = expectData(
      await execute<{ bookmarks: BookmarkPayload[] }>(BOOKMARKS, {
        folderId,
        search: "%",
      }),
    ).bookmarks;
    expect(percent.map((bookmark) => bookmark.title)).toEqual([
      "100% coverage",
    ]);

    const underscoreLiteral = expectData(
      await execute<{ bookmarks: BookmarkPayload[] }>(BOOKMARKS, {
        folderId,
        search: "snake_case",
      }),
    ).bookmarks;
    expect(underscoreLiteral.map((bookmark) => bookmark.title)).toEqual([
      "snake_case naming",
    ]);

    // "Pla_n" only matches "Plain" if _ is treated as a wildcard.
    const underscoreWildcard = expectData(
      await execute<{ bookmarks: BookmarkPayload[] }>(BOOKMARKS, {
        folderId,
        search: "Pla_n",
      }),
    ).bookmarks;
    expect(underscoreWildcard).toEqual([]);
  });
});
