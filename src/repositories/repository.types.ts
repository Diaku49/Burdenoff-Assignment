import type {
  Bookmark,
  Folder,
} from "../generated/prisma/client.ts";

export type BookmarkQueryOptions = {
  folderId?: number;
  search?: string;
  take: number;
  cursor?: number;
};

export type CreateBookmarkData = {
  title: string;
  url: string;
  tags: string[];
  folderId: number;
};

export type UpdateBookmarkData = {
  title?: string;
  url?: string;
  tags?: string[];
};

export interface FolderRepository {
  findAll(): Promise<Folder[]>;
  findById(id: number): Promise<Folder | null>;
  create(name: string): Promise<Folder>;
}

export interface BookmarkRepository {
  findMany(options: BookmarkQueryOptions): Promise<Bookmark[]>;
  findById(id: number): Promise<Bookmark | null>;
  findByFolderId(folderId: number): Promise<Bookmark[]>;
  create(data: CreateBookmarkData): Promise<Bookmark>;
  update(id: number, data: UpdateBookmarkData): Promise<Bookmark>;
  delete(id: number): Promise<Bookmark>;
  move(id: number, folderId: number): Promise<Bookmark>;
}

export type Repositories = {
  folders: FolderRepository;
  bookmarks: BookmarkRepository;
};
