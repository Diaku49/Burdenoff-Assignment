import { GraphQLError } from "graphql";

export function parseId(value: string, argumentName: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new GraphQLError(`${argumentName} must be a positive integer ID`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id)) {
    throw new GraphQLError(`${argumentName} must be a valid integer ID`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  return id;
}

export function requireInput<T>(input: T | null | undefined, name: string): T {
  if (!input) {
    throw new GraphQLError(`${name} is required`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  return input;
}

export function validateTitle(title: string): string {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new GraphQLError("Bookmark title cannot be empty", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  return trimmedTitle;
}

export function validateUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }

    return parsedUrl.toString();
  } catch {
    throw new GraphQLError("Bookmark URL must be a valid HTTP or HTTPS URL", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}

export function notFound(resource: "Bookmark" | "Folder"): never {
  throw new GraphQLError(`${resource} not found`, {
    extensions: { code: "NOT_FOUND" },
  });
}
