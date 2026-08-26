import type { Folder } from "../../generated/prisma/client.ts";
import type { GraphQLContext } from "../context.ts";
import type { EmptyArgs } from "../resolvers/index.ts";
import { notFound, parseId, requireInput } from "./helpers.ts";

//------ Arguments
type FolderArgs = {
  id: string;
};

type CreateFolderArgs = {
  input: {
    name: string;
  } | null;
};

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

const folder = async (
  _parent: unknown,
  args: FolderArgs,
  context: GraphQLContext,
) => {
  const id = parseId(args.id, "id");
  const result = await context.prisma.folder.findUnique({
    where: { id },
  });

  if (!result) {
    return notFound("Folder");
  }

  return result;
};

//------ Mutations
const createFolder = (
  _parent: unknown,
  args: CreateFolderArgs,
  context: GraphQLContext,
) => {
  const input = requireInput(args.input, "input");

  return context.prisma.folder.create({
    data: {
      name: input.name,
    },
  });
};


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

  Mutation: {
    createFolder,
  },

  Folder: {
    bookmarks,
    createdAt,
  },
};
