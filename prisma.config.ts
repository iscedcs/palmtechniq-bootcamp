import path from "node:path";
import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.join(__dirname, ".env") });

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations cannot run through pgbouncer, so the CLI uses the direct
    // connection while the runtime client uses the pooled DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
