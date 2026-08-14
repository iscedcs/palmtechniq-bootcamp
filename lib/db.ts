import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

neonConfig.webSocketConstructor = globalThis.WebSocket;

/**
 * Prisma 7 no longer takes a connection URL from the schema — the runtime
 * client connects through a driver adapter. Matching palmtechniq-v2 on
 * `@prisma/adapter-neon`.
 *
 * A side effect worth knowing: the Neon serverless driver pools connections
 * itself, so the `pgbouncer=true&connection_limit=1` tuning the PRD calls for
 * in §5.4 is no longer the mechanism protecting us from Neon's connection
 * limit. Keep the pooled URL anyway — it costs nothing and still routes
 * through the pooler endpoint.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  // Next.js evaluates modules during `next build`, where DATABASE_URL may be
  // absent. Fail on first use rather than at import, so a build that never
  // touches the database still succeeds.
  if (!connectionString) {
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error(
          "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
        );
      },
    });
  }

  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
