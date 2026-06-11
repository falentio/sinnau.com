import { totalmem } from "node:os";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { env } from "../env.ts";
import * as schema from "./schema/index.ts";

const MMAP_CAP = 512 * 1024 * 1024;

export const createDb = (options: { fileName: string }) => {
  const { fileName } = options;
  const sqlite = new Database(fileName);

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("cache_size = -64000");
  sqlite.pragma(
    `mmap_size = ${Math.floor(Math.min(totalmem() * 0.5, MMAP_CAP))}`
  );

  const db = drizzle({ client: sqlite, schema });
  migrate(db, { migrationsFolder: "./drizzle" });

  sqlite.pragma("optimize=0x10002");

  return db;

  // Future optimizations to investigate (safe to add in this block):
  //   wal_autocheckpoint = 10000
  //     Raises auto-checkpoint threshold from 1000 pages (~4 MiB) to ~40 MiB.
  //     Useful for write-heavy workloads to reduce checkpoint I/O spikes.
  //
  //   Read-replica connection pool
  //     WAL mode allows infinite concurrent readers behind a single writer.
  //     If concurrency becomes a bottleneck, split into one write connection
  //     and multiple read-only connections per worker/thread.
  //
  //   PRAGMA optimize on a timer
  //     Long-running process: run PRAGMA optimize every few hours to refresh
  //     query-plan statistics beyond the initial optimize=0x10002.
  //
  //   WAL checkpoint monitoring
  //     If the -wal file grows unbounded (checkpoint starvation), periodically
  //     check its size and conditionally run wal_checkpoint(RESTART) or
  //     wal_checkpoint(TRUNCATE).
  //
  //   page_size = 4096
  //     Already the SQLite default (≥3.12.0). Only worth changing
  //     if creating a fresh DB for a different block size (e.g. 8192).
  //
  //   cache_size tuning
  //     Current 64 MiB (-64000) is a conservative starting point.
  //     Monitor hit rates and increase if the working set exceeds this.
};

export type DB = ReturnType<typeof createDb>;

export const db = createDb({ fileName: env.DB_FILE_NAME });
