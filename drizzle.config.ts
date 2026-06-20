/// <reference types="@types/node" />
import { defineConfig } from "drizzle-kit";

const url = process.env.DB_FILE_NAME ?? ".data/data.db";

export default defineConfig({
  dbCredentials: { url },
  dialect: "sqlite",
  migrations: {
    prefix: "timestamp",
  },
  out: "./drizzle",
  schema: "./src/lib/server/infras/db/schema/index.ts",
});
