import { defineConfig } from "drizzle-kit";

const url = process.env.DB_FILE_NAME ?? ".data/data.db";

export default defineConfig({
  dbCredentials: { url },
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/lib/server/infras/db/schema/index.ts",
});
