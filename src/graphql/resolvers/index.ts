import { bookmarkResolvers } from "./bookmark.resolvers.ts";
import { folderResolvers } from "./folder.resolvers.ts";

// shared types
export type EmptyArgs = Record<string, never>;

export const resolvers = {
  Query: {
    ...folderResolvers.Query,
    ...bookmarkResolvers.Query
  },
  Mutation: {
    ...folderResolvers.Mutation,
    ...bookmarkResolvers.Mutation,
  },
  Folder: {
    ...folderResolvers.Folder,
  },
  Bookmark: {
    ...bookmarkResolvers.Bookmark,
  },
};
