// Shapes of the JSON that comes back over HTTP from the GraphQL server.

export type GraphQLResponseError = {
  message: string;
  extensions?: { code?: string };
};

export type GraphQLResponse<TData> = {
  data?: TData | null;
  errors?: GraphQLResponseError[];
};

export type BookmarkPayload = {
  id: string;
  title: string;
  url: string;
  tags: string[];
  folderId: string;
  createdAt: string;
};

export type FolderPayload = {
  id: string;
  name: string;
  createdAt: string;
  bookmarks: BookmarkPayload[];
};
