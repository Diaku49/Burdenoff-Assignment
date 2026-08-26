import { describe, expect, test } from "bun:test";
import { execute, expectData, setupIntegrationSuite } from "./support/harness.ts";
import { BOOKMARKS } from "./support/operations.ts";
import type { BookmarkPayload } from "./support/types.ts";

const suite = setupIntegrationSuite();

describe("cursor pagination", () => {
  test("walks every bookmark exactly once across requests", async () => {
    const folderId = await suite.createFolder(suite.uniqueName("Pagination"));
    const seededIds: string[] = [];

    for (const index of [1, 2, 3, 4, 5]) {
      const bookmark = await suite.createBookmark(
        folderId,
        `Paginated bookmark ${index}`,
        `https://example.com/paginated/${index}`,
      );
      seededIds.push(bookmark.id);
    }

    const pageSizes: number[] = [];
    const seenIds: string[] = [];
    let cursor: string | null = null;

    // Bounded so a broken cursor cannot loop forever.
    for (let request = 0; request < 5; request += 1) {
      // Annotated: `cursor` is assigned from `page`, so inference is circular.
      const page: BookmarkPayload[] = expectData(
        await execute<{ bookmarks: BookmarkPayload[] }>(BOOKMARKS, {
          folderId,
          take: 2,
          cursor,
        }),
      ).bookmarks;

      pageSizes.push(page.length);

      if (page.length === 0) {
        break;
      }

      seenIds.push(...page.map((bookmark) => bookmark.id));
      cursor = page.at(-1)?.id ?? null;
    }

    expect(pageSizes).toEqual([2, 2, 1, 0]);
    expect(seenIds).toEqual(seededIds);
    expect(new Set(seenIds).size).toBe(seededIds.length);
  });
});
