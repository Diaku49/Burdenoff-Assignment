import { prisma } from "./db/prisma.ts";
import { createGraphQLServer } from "./server.ts";

const yoga = createGraphQLServer(prisma);

const server = Bun.serve({
  port: 4000,
  fetch: yoga,
});

console.info(
  `GraphQL server is running at http://${server.hostname}:${server.port}${yoga.graphqlEndpoint}`,
);
