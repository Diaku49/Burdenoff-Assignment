import type { Bookmark } from "../../generated/prisma/client.ts";
import type {
  BookmarkQueryOptions,
  UpdateBookmarkData,
} from "../../repositories/repository.types.ts";
import type { GraphQLContext } from "../context.ts";
import {
  notFound,
  parseId,
  requireInput,
  validateTake,
  validateTitle,
  validateUrl,
} from "./helpers.ts";

//------ Arguments
type Bookmarks = {
    folderId?: string | null,
    search?: string | null,
    take?: number | null,
    cursor?: string | null
}

type CreateBookmarkArgs = {
  input: {
    title: string;
    url: string;
    tags: string[];
    folderId: string;
  } | null;
};

type UpdateBookmarkArgs = {
  id: string;
  input: {
    title?: string | null;
    url?: string | null;
    tags?: string[] | null;
  };
};

type BookmarkIdArgs = {
  id: string;
};

type MoveBookmarkArgs = {
  id: string;
  folderId: string;
};

//------ Functions
async function getBookmarkOrThrow(context: GraphQLContext, id: number) {
  const bookmark = await context.repositories.bookmarks.findById(id);

  if (!bookmark) {
    return notFound("Bookmark");
  }

  return bookmark;
}

async function getFolderOrThrow(context: GraphQLContext, id: number) {
  const folder = await context.repositories.folders.findById(id);

  if (!folder) {
    return notFound("Folder");
  }

  return folder;
}

//------ Query
const bookmarks = (
  _parent: unknown,
  args: Bookmarks,
  context: GraphQLContext,
) => {
  let take
  if (args.take !== undefined && args.take !== null) {
    take = validateTake(args.take)
  }

  const options: BookmarkQueryOptions = {
    take: take ?? 15,
  };

  if (args.folderId) {
    options.folderId = parseId(args.folderId, "folderId");
  }

  const search = args.search?.trim();

  if (search) {
    options.search = search;
  }

  if (args.cursor) {
    options.cursor = parseId(args.cursor, "cursor");
  }

  return context.repositories.bookmarks.findMany(options);
};

//------ Mutations
const createBookmark = async (
  _parent: unknown,
  args: CreateBookmarkArgs,
  context: GraphQLContext,
) => {
  const input = requireInput(args.input, "input");
  const folderId = parseId(input.folderId, "folderId");

  await getFolderOrThrow(context, folderId);

  return context.repositories.bookmarks.create({
    title: validateTitle(input.title),
    url: validateUrl(input.url),
    tags: input.tags,
    folderId,
  });
};

const updateBookmark = async (
  _parent: unknown,
  args: UpdateBookmarkArgs,
  context: GraphQLContext,
) => {
  const id = parseId(args.id, "id");
  const data: UpdateBookmarkData = {};

  if (args.input.title !== undefined && args.input.title !== null) {
    data.title = validateTitle(args.input.title);
  }

  if (args.input.url !== undefined && args.input.url !== null) {
    data.url = validateUrl(args.input.url);
  }

  if (args.input.tags !== undefined && args.input.tags !== null) {
    data.tags = args.input.tags;
  }

  if (Object.keys(data).length === 0) {
    return requireInput(undefined, "at least one bookmark field to update");
  }

  await getBookmarkOrThrow(context, id);

  return context.repositories.bookmarks.update(id, data);
};

const deleteBookmark = async (
  _parent: unknown,
  args: BookmarkIdArgs,
  context: GraphQLContext,
) => {
  const id = parseId(args.id, "id");

  await getBookmarkOrThrow(context, id);

  return context.repositories.bookmarks.delete(id);
};

const moveBookmark = async (
  _parent: unknown,
  args: MoveBookmarkArgs,
  context: GraphQLContext,
) => {
  const id = parseId(args.id, "id");
  const folderId = parseId(args.folderId, "folderId");

  await getBookmarkOrThrow(context, id);
  await getFolderOrThrow(context, folderId);

  return context.repositories.bookmarks.move(id, folderId);
};

//Type Operations
const createdAt = (bookmark: Bookmark): string => {
  return bookmark.createdAt.toISOString();
};

export const bookmarkResolvers = {
  Query: {
    bookmarks,
  },
  
  Mutation: {
    createBookmark,
    updateBookmark,
    deleteBookmark,
    moveBookmark,
  },

  Bookmark: {
    createdAt,
  },
};
