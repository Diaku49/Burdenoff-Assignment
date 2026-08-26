export const CREATE_FOLDER = /* GraphQL */ `
  mutation CreateFolder($input: CreateFolderInput!) {
    createFolder(input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const CREATE_BOOKMARK = /* GraphQL */ `
  mutation CreateBookmark($input: CreateBookmarkInput!) {
    createBookmark(input: $input) {
      id
      title
      url
      tags
      folderId
      createdAt
    }
  }
`;

export const UPDATE_BOOKMARK = /* GraphQL */ `
  mutation UpdateBookmark($id: ID!, $input: UpdateBookmarkInput!) {
    updateBookmark(id: $id, input: $input) {
      id
      title
      url
      tags
      folderId
    }
  }
`;

export const MOVE_BOOKMARK = /* GraphQL */ `
  mutation MoveBookmark($id: ID!, $folderId: ID!) {
    moveBookmark(id: $id, folderId: $folderId) {
      id
      folderId
    }
  }
`;

export const DELETE_BOOKMARK = /* GraphQL */ `
  mutation DeleteBookmark($id: ID!) {
    deleteBookmark(id: $id) {
      id
      title
    }
  }
`;

export const FOLDERS = /* GraphQL */ `
  query Folders {
    folders {
      id
      name
    }
  }
`;

export const FOLDER = /* GraphQL */ `
  query Folder($id: ID!) {
    folder(id: $id) {
      id
      name
      createdAt
      bookmarks {
        id
        title
        url
        tags
        folderId
        createdAt
      }
    }
  }
`;

export const BOOKMARKS = /* GraphQL */ `
  query Bookmarks($folderId: ID, $search: String, $take: Int, $cursor: ID) {
    bookmarks(
      folderId: $folderId
      search: $search
      take: $take
      cursor: $cursor
    ) {
      id
      title
      folderId
    }
  }
`;
