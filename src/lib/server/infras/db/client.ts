import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { env } from "../env.ts";
import * as schema from "./schema/index.ts";

export const createDb = (options: { fileName: string }) => {
  const { fileName } = options;
  const sqlite = new Database(fileName);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle({ client: sqlite, schema });
  migrate(db, { migrationsFolder: "./drizzle" });
  return db;
};

export type DB = ReturnType<typeof createDb>;

export const db = createDb({ fileName: env.DB_FILE_NAME });
