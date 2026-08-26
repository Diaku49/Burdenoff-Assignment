import type {
  Bookmark,
  Prisma,
  PrismaClient,
} from "../generated/prisma/client.ts";
import type {
  BookmarkQueryOptions,
  BookmarkRepository,
  CreateBookmarkData,
  UpdateBookmarkData,
} from "./repository.types.ts";

function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export class PrismaBookmarkRepository implements BookmarkRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  findMany(options: BookmarkQueryOptions): Promise<Bookmark[]> {
    const where: Prisma.BookmarkWhereInput = {};

    if (options.folderId !== undefined) {
      where.folderId = options.folderId;
    }

    if (options.search !== undefined) {
      where.title = {
        contains: escapeLikePattern(options.search),
        mode: "insensitive",
      };
    }

    const query: Prisma.BookmarkFindManyArgs = {
      where,
      orderBy: { id: "asc" },
      take: options.take,
    };

    if (options.cursor !== undefined) {
      query.cursor = { id: options.cursor };
      query.skip = 1;
    }

    return this.prisma.bookmark.findMany(query);
  }

  findById(id: number): Promise<Bookmark | null> {
    return this.prisma.bookmark.findUnique({
      where: { id },
    });
  }

  findByFolderId(folderId: number): Promise<Bookmark[]> {
    return this.prisma.bookmark.findMany({
      where: { folderId },
      orderBy: { id: "asc" },
    });
  }

  create(data: CreateBookmarkData): Promise<Bookmark> {
    return this.prisma.bookmark.create({ data });
  }

  update(id: number, data: UpdateBookmarkData): Promise<Bookmark> {
    return this.prisma.bookmark.update({
      where: { id },
      data,
    });
  }

  delete(id: number): Promise<Bookmark> {
    return this.prisma.bookmark.delete({
      where: { id },
    });
  }

  move(id: number, folderId: number): Promise<Bookmark> {
    return this.prisma.bookmark.update({
      where: { id },
      data: { folderId },
    });
  }
}
