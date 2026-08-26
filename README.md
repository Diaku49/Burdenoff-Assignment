# Bookmark Manager GraphQL API

A GraphQL API for organizing bookmarks into folders. Built with Bun, TypeScript in strict mode, GraphQL Yoga (schema-first), Prisma, and PostgreSQL in Docker.

```
src/graphql/schema.graphql    the SDL
src/graphql/resolvers/        resolvers, separate from the schema
src/repositories/             Prisma data access behind interfaces, injected via the GraphQL context
src/db/prisma.ts              Prisma client, using the pg driver adapter
tests/unit/                   resolver tests with in-memory repositories, no database
tests/integration/            tests against the real PostgreSQL container
```

## Setup

You need [Bun](https://bun.com) 1.4+ and Docker. Docker has to be running before you start.

```bash
git clone <repo-url> bookmark-manager
cd bookmark-manager

cp .env.example .env      # connection string for the Compose database
bun install
docker compose up -d      # PostgreSQL on host port 5433
bun run gendb             # generate the Prisma client
bun run db:migrate        # apply migrations
bun run dev               # start the API with hot reload
```

The server prints its address on boot:

```
GraphQL server is running at http://localhost:4000/graphql
```

Open that URL in a browser for GraphiQL, or POST GraphQL documents to it.

Other commands:

| Command | What it does |
| --- | --- |
| `bun run dev` | Server with file watching |
| `bun run start` | Server without file watching |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | Full test suite |
| `docker compose down` | Stop the database, keep the data |
| `docker compose down -v` | Stop it and delete the volume (rerun `bun run db:migrate` after) |

## Environment Variables

One variable, and `.env.example` already has a working value for the Compose database.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Read by the Prisma client in `src/db/prisma.ts` and by the Prisma CLI through `prisma.config.ts`. |

```
DATABASE_URL="postgresql://bookmark_manager:bookmark_manager@localhost:5433/bookmark_manager?schema=public"
```

Bun loads `.env` on startup, so the application code has no `dotenv` call. If `DATABASE_URL` is missing the server exits immediately with a message instead of failing on the first query.

### Why port 5433

The container publishes `5433:5432`. Plenty of machines already run PostgreSQL natively on 5432, and when they do, a connection to `localhost:5432` goes to that server rather than the container. Migrations then appear to succeed against the wrong database. Using 5433 on the host avoids that, so the setup above works whether or not you already have PostgreSQL installed. Inside the container PostgreSQL still listens on 5432.

## Database

### PostgreSQL via Docker Compose

`compose.yaml` defines one `postgres:17-alpine` service. User, password, and database are all `bookmark_manager`. Data lives in a named volume so it survives restarts, and there is a `pg_isready` healthcheck. Use `docker compose up -d --wait` if you want the command to block until the database is healthy, which is useful in scripts and CI.

### Schema

`prisma/schema.prisma` has two models. The datasource has no `url` in it; `prisma.config.ts` supplies it from `DATABASE_URL` so the connection string is defined in one place only.

```prisma
model Folder {
  id        Int      @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())

  bookmarks Bookmark[]
}

model Bookmark {
  id        Int      @id @default(autoincrement())
  title     String
  url       String
  tags      String[]
  folderId  Int
  createdAt DateTime @default(now())

  folder Folder @relation(fields: [folderId], references: [id])

  @@index([folderId])
}
```

A few notes on the choices:

- `Int` autoincrement primary keys give an indexed, always-increasing column to order and paginate by. GraphQL exposes them as `ID`, so they travel as strings and are stored as integers.
- `@@index([folderId])` because every bookmark read is scoped by folder, both `bookmarks(folderId:)` and the nested `Folder.bookmarks` field.
- The folder relation is required, so Prisma generates `ON DELETE RESTRICT`. A folder with bookmarks in it cannot be deleted.
- `tags` is a native PostgreSQL text array. Nothing in the spec filters or queries by tag, so a join table would add work with nothing to show for it.

### Migrations

Migrations are generated with Prisma's tooling, not written by hand:

```bash
bunx --bun prisma migrate dev --name <description>   # after editing schema.prisma
```

Applying existing migrations is a different command, and it is the one in the setup flow:

```bash
bun run db:migrate    # bunx --bun prisma migrate deploy
```

`migrate deploy` applies pending migrations without prompting and never resets data, which is what a fresh clone and CI both want. `migrate dev` is for authoring new ones.

The Prisma client is generated into `src/generated/prisma`, which is gitignored. Run `bun run gendb` before typechecking or testing a fresh clone.

## Running Tests

```bash
bun test                   # 31 tests
bun run test:unit          # resolver tests, no database needed
bun run test:integration   # tests against PostgreSQL
```

The integration tests need the database up and migrated:

```bash
docker compose up -d --wait
bun run db:migrate
bun run test:integration
```

If the database is unreachable they fail with those two commands in the error message rather than a raw connection error.

The unit tests in `tests/unit/` run the resolvers against in-memory implementations of the repository interfaces. They cover the success paths and the failure paths: whitespace-only titles, malformed URLs, malformed IDs, empty updates, and missing bookmarks and folders. Where a mutation is rejected, the test also asserts the repository was never called.

The integration tests in `tests/integration/` send real GraphQL documents through Yoga to PostgreSQL, then read the rows back with Prisma so a resolver that only echoes its input cannot pass.

| File | Covers |
| --- | --- |
| `folders.integration.test.ts` | Saving a folder with bookmarks and reading them back nested |
| `pagination.integration.test.ts` | Walking every row once across four cursor requests |
| `filtering.integration.test.ts` | `folderId` scoping, case-insensitive title search, literal `%` and `_` |
| `mutations.integration.test.ts` | `updateBookmark` partial updates, `moveBookmark`, `deleteBookmark` |
| `errors.integration.test.ts` | Not-found and validation failures, checking nothing was written |

Shared setup lives in `tests/integration/support/`. `execute()` posts a document and asserts HTTP 200, so a validation failure returning a 500 fails the test. Each file tracks the folders it creates and deletes only those in teardown, so the suite can run against a database you already have data in. Folder names get a per-run suffix so repeated runs don't collide.

## API

The full schema is in [`src/graphql/schema.graphql`](src/graphql/schema.graphql).

```graphql
type Folder {
  id: ID!
  name: String!
  createdAt: String!
  bookmarks: [Bookmark!]!
}

type Bookmark {
  id: ID!
  title: String!
  url: String!
  tags: [String!]!
  folderId: ID!
  createdAt: String!
}
```

`createdAt` is an ISO 8601 string, e.g. `2026-08-26T17:12:51.386Z`.

### Queries

| Query | Description |
| --- | --- |
| `folders: [Folder!]!` | All folders, ordered by `id`. |
| `folder(id: ID!): Folder!` | One folder with its bookmarks nested. `NOT_FOUND` if it doesn't exist. |
| `bookmarks(folderId: ID, search: String, take: Int, cursor: ID): [Bookmark!]!` | Bookmarks ordered by `id`. All four arguments are optional and can be combined. |

Arguments to `bookmarks`:

- `folderId` restricts results to one folder.
- `search` is a case-insensitive substring match on `title` only. A URL fragment won't match. Whitespace-only values are ignored. `%` and `_` are searched for literally rather than acting as SQL wildcards.
- `take` is the page size, 1 to 100, default 15. Anything outside that range is a `BAD_USER_INPUT` error.
- `cursor` is the `id` of the last bookmark from the previous page. The next page starts after it.

```graphql
query BookmarksInFolder($folderId: ID!) {
  bookmarks(folderId: $folderId, search: "graphql", take: 10) {
    id
    title
    url
    tags
  }
}
```

### Pagination

Pagination is cursor-based (keyset), not offset-based.

1. Every `bookmarks` query orders by `id` ascending. Since `id` is an autoincrement primary key the ordering is total and stable: no two rows tie, and a row's position doesn't shift because something before it was inserted or deleted.
2. A request with no `cursor` returns the first `take` rows.
3. The client passes the `id` of the last bookmark in that page as `cursor` on the next request. Prisma seeks to that row and `skip: 1` steps past it, so the next page starts at the row after. That becomes `WHERE id > cursor ... LIMIT take` against the primary key index, with no rows scanned and thrown away.
4. A short page or an empty array means you've reached the end.

`cursor` works together with `folderId` and `search`. The filters go into the same `WHERE` clause, so paging through a filtered set only walks matching rows.

```graphql
# page 1
query { bookmarks(take: 2) { id title } }
# → ids 1, 2

# page 2, cursor is the last id from page 1
query { bookmarks(take: 2, cursor: "2") { id title } }
# → id 3
```

Offset pagination was the other option. `OFFSET n` makes PostgreSQL scan and discard `n` rows, and an insert or delete during a walk shifts every later page, which duplicates or skips rows. `pagination.integration.test.ts` walks a five-bookmark folder in pages of two and asserts the page sizes are exactly `[2, 2, 1, 0]` and that the IDs seen match the IDs seeded with no duplicates.

### Mutations

| Mutation | Description |
| --- | --- |
| `createFolder(input: CreateFolderInput!): Folder!` | Creates a folder. Name is trimmed and can't be blank. |
| `createBookmark(input: CreateBookmarkInput!): Bookmark!` | Creates a bookmark in an existing folder. Title is trimmed, URL is validated and normalized. |
| `updateBookmark(id: ID!, input: UpdateBookmarkInput!): Bookmark!` | Updates `title`, `url`, and/or `tags`. Fields you leave out are untouched. At least one is required. |
| `moveBookmark(id: ID!, folderId: ID!): Bookmark!` | Moves a bookmark to another folder. Both the bookmark and the destination folder must exist. |
| `deleteBookmark(id: ID!): Bookmark!` | Deletes a bookmark and returns the deleted row. |

```graphql
mutation CreateBookmark($folderId: ID!) {
  createBookmark(
    input: {
      title: "Bun documentation"
      url: "https://bun.com/docs"
      tags: ["bun", "runtime"]
      folderId: $folderId
    }
  ) {
    id
    title
    folderId
    createdAt
  }
}
```

### Validation and errors

Failures come back as GraphQL errors with an `extensions.code`, under HTTP 200. Bad input never turns into an unhandled 500.

| Code | Message | Cause |
| --- | --- | --- |
| `BAD_USER_INPUT` | `Bookmark title cannot be empty` | Empty or whitespace-only title |
| `BAD_USER_INPUT` | `Bookmark URL must be a valid HTTP or HTTPS URL` | Unparseable URL, or a scheme other than http/https |
| `BAD_USER_INPUT` | `Invalid folder name` | Empty or whitespace-only folder name |
| `BAD_USER_INPUT` | `Take must be a valid number` | `take` below 1 or above 100 |
| `BAD_USER_INPUT` | `<arg> must be a positive integer ID` | Malformed `id`, `folderId`, or `cursor` |
| `BAD_USER_INPUT` | `at least one bookmark field to update is required` | `updateBookmark` with an empty input |
| `NOT_FOUND` | `Bookmark not found` | Unknown bookmark on update, delete, or move |
| `NOT_FOUND` | `Folder not found` | Unknown folder on lookup, create, or as a move destination |

Records are checked for existence before any write, so a rejected mutation leaves the database untouched. `errors.integration.test.ts` asserts that for a failed move and for rejected inserts.

```json
{
  "errors": [
    {
      "message": "Bookmark URL must be a valid HTTP or HTTPS URL",
      "path": ["createBookmark"],
      "extensions": { "code": "BAD_USER_INPUT" }
    }
  ],
  "data": null
}
```

## How I'd Extend This

This is a small project, so none of the following is in the code. It's what I'd reach for as it grew.(This part i just go with my own thinking, i wish you guys would give me an actuall system design problem though)

### OAuth for authentication

I'd add OAuth 2.0 with an external provider (Google, GitHub) rather than storing passwords. The flow is the standard authorization code grant with PKCE: the client is redirected to the provider, comes back with a code, and the server exchanges that code for tokens. On first login I'd create a local `User` row keyed by the provider's subject ID, so the account is ours even though the credentials aren't.

After that, `Folder` gets an owner relation to `User`, and Yoga's `context` factory verifies the access token on every request and puts the user on the GraphQL context. That part is cheap here because the resolvers already read their repositories off the context instead of importing Prisma directly, so scoping reads and writes to the caller is a change in the repository layer rather than in every resolver. Token verification also stays in one place, which matters when refresh and revocation get added.

### Redis for the user in the auth middleware

Once that middleware exists, every single request needs the user record, and doing a `SELECT` for it on every request is wasteful when the row barely ever changes. I'd cache the user details in Redis keyed by session or token, with a TTL. The middleware reads from Redis, and only falls through to PostgreSQL on a miss. On login it writes the entry, and on profile update or logout it deletes the key so nothing stale survives.

This is worth doing specifically because the read is on the hot path for *every* request. I'd keep the cached payload small, just what authorization actually needs (ID, email, roles), rather than turning it into a general-purpose object cache.

### Read replicas when reads get heavy

For a project this size a single PostgreSQL instance is more than enough, i mean its just assignment. But bookmark managers are read-dominated: people list and search far more often than they create. If read traffic became the bottleneck I'd set up streaming replication and send queries to replicas while writes keep going to the primary.

The repository layer is the natural place for that split. `findMany`/`findById` take a replica connection, the create/update/delete methods take the primary, and no resolver has to know. The thing to watch is replication lag, since a read straight after a write can hit a replica that hasn't caught up yet. The usual fix is to route reads to the primary for a short window after a user's own write.

### Sharding when writes get heavy

Replicas only help reads. If writes outgrew one primary, I'd shard, and the shard key would be the user ID.

That works cleanly here because of the data model: bookmarks belong to folders, folders belong to a user, and users have nothing to do with each other. There are no queries that span users and no foreign keys crossing between them. So a user's entire graph lives on one shard, every query is single-shard, and there are no cross-shard joins or distributed transactions to deal with. Routing is just a lookup from user ID to shard, either a hash or a directory table if rebalancing needs to be possible.

I'd hold off until the numbers actually demand it. Sharding makes backups, schema migrations, and any future cross-user feature considerably harder, and vertical scaling plus replicas covers a lot of ground first.

### Elasticsearch for real search

The current `search` is `contains` with `mode: "insensitive"`, which compiles to `ILIKE '%term%'`. It's fine for the substring match the spec asks for, but it can't use an index and it degrades linearly with table size. It also can't do much: no typo tolerance, no relevance ranking, no searching across tags and URL at the same time.

The step in between is PostgreSQL's own full-text search, a `tsvector` column with a GIN index, plus `pg_trgm` for fuzzy matching. That's often enough and it avoids running another service.

If search became a real feature I'd move to Elasticsearch: index bookmarks on write (asynchronously, so a slow index doesn't slow the mutation), and let it handle relevance scoring, fuzzy matching, multi-field queries across title/tags/URL, highlighting, and faceting by tag. PostgreSQL stays the source of truth and the index is treated as disposable, rebuildable from the tables at any time.
