import type { Folder } from "../../generated/prisma/client.ts";
import type { GraphQLContext } from "../context.ts";

//------ Arguments
type EmptyArgs = Record<string, never>;
type FolderArgs = {
    id: string;
}

//------ Query
const folders = (
  _parent: unknown,
  _args: EmptyArgs,
  context: GraphQLContext,
) => {
  return context.prisma.folder.findMany({
    orderBy: { id: "asc" },
  });
};

// need to check this out
const folder = (
    _parent: unknown,
    _args: FolderArgs,
    context: GraphQLContext,
) => {
    const id = Number(_args.id);

    return context.prisma.folder.findUnique({
        where:{id: id},
    })
}

//------ Mutations

//------ Type Operations
const bookmarks = (
  folder: Folder,
  _args: EmptyArgs,
  context: GraphQLContext,
) => {
  return context.prisma.bookmark.findMany({
    where: { folderId: folder.id },
    orderBy: { id: "asc" },
  });
};

const createdAt = (folder: Folder): string => {
  return folder.createdAt.toISOString();
};

export const folderResolvers = {
  Query: {
    folders,
    folder,
  },

  Folder: {
    bookmarks,
    createdAt,
  },
};
