import type { Bookmark } from "../../generated/prisma/client.ts";

// Arguments

// Query

// Mutations

//Type Operations
const createdAt = (bookmark: Bookmark): string => {
  return bookmark.createdAt.toISOString();
};

export const bookmarkResolvers = {
  Bookmark: {
    createdAt,
  },
};
