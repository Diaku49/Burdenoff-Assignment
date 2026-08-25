import { createSchema } from "graphql-yoga";
import type { GraphQLContext } from "./context.ts";
import { resolvers } from "./resolvers/index.ts";

const typeDefs = await Bun.file(
  new URL("./schema.graphql", import.meta.url),
).text();

export const schema = createSchema<GraphQLContext>({
  typeDefs,
  resolvers,
});
  