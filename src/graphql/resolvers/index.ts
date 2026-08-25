
import { bookmarkResolvers } from "./bookmark.resolvers.ts";
import { folderResolvers } from "./folder.resolvers.ts";

export const resolvers = {
  Query: {
    ...folderResolvers.Query,
  },
  Folder: {
    ...folderResolvers.Folder,
  },
  Bookmark: {
    ...bookmarkResolvers.Bookmark,
  },
};
