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
  return context.repositories.folders.findAll();
};

const folder = async (
  _parent: unknown,
  args: FolderArgs,
  context: GraphQLContext,
) => {
  const id = parseId(args.id, "id");
  const result = await context.repositories.folders.findById(id);

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

  return context.repositories.folders.create(input.name);
};


//------ Type Operations
const bookmarks = (
  folder: Folder,
  _args: EmptyArgs,
  context: GraphQLContext,
) => {
  return context.repositories.bookmarks.findByFolderId(folder.id);
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
