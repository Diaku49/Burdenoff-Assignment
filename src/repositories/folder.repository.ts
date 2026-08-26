import type {
  Folder,
  PrismaClient,
} from "../generated/prisma/client.ts";
import type { FolderRepository } from "./repository.types.ts";

export class PrismaFolderRepository implements FolderRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  findAll(): Promise<Folder[]> {
    return this.prisma.folder.findMany({
      orderBy: { id: "asc" },
    });
  }

  findById(id: number): Promise<Folder | null> {
    return this.prisma.folder.findUnique({
      where: { id },
    });
  }

  create(name: string): Promise<Folder> {
    return this.prisma.folder.create({
      data: { name },
    });
  }
}
