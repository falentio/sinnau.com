import { totalmem } from "node:os";
import { hrtime } from "node:process";

import { dev } from "$app/env";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { env } from "../env.ts";
import * as schema from "./schema/index.ts";

const MMAP_CAP = 512 * 1024 * 1024;

const proxyDatabase = (sqlite: Database.Database): Database.Database => {
  const exec = sqlite.exec.bind(sqlite);
  const REPORT_SLOW_QUERIES_MS = 5;
  sqlite.exec = (sql) => {
    const start = hrtime.bigint();
    try {
      console.log("Executing SQL:", sql);
      return exec(sql);
    } finally {
      const durationMs = Number(hrtime.bigint() - start) / 1_000_000;
      if (durationMs > REPORT_SLOW_QUERIES_MS) {
        console.log(`Execution completed in ${durationMs.toFixed(2)} ms`, {
          sql,
        });
      }
    }
  };

  const transaction = sqlite.transaction.bind(sqlite);
  type TransactionFn = typeof transaction;
  sqlite.transaction = ((fn) => {
    const wrappedFn = (...args: Parameters<typeof fn>) => {
      const start = hrtime.bigint();
      try {
        return fn(...args);
      } finally {
        const durationMs = Number(hrtime.bigint() - start) / 1_000_000;
        if (durationMs > REPORT_SLOW_QUERIES_MS) {
          console.log(`Transaction completed in ${durationMs.toFixed(2)} ms`);
        }
      }
    };
    return transaction(wrappedFn);
  }) as TransactionFn;

  const prepare = sqlite.prepare.bind(sqlite);
  type PrepareFn = typeof prepare;
  sqlite.prepare = ((sql) => {
    const start = hrtime.bigint();
    try {
      const prepared = prepare(sql);
      const originalRun = prepared.run.bind(prepared);
      prepared.run = (...argsRun: Parameters<typeof originalRun>) => {
        const preparedStart = hrtime.bigint();
        try {
          return originalRun(...argsRun);
        } finally {
          const durationMs =
            Number(hrtime.bigint() - preparedStart) / 1_000_000;
          if (durationMs > REPORT_SLOW_QUERIES_MS) {
            console.log(
              `Prepared statement run in ${durationMs.toFixed(2)} ms`,
              {
                sql,
              }
            );
          }
        }
      };

      const originalRaw = prepared.raw.bind(prepared);
      prepared.raw = (...argsRaw: Parameters<typeof originalRaw>) => {
        const preparedStart = hrtime.bigint();
        try {
          return originalRaw(...argsRaw);
        } finally {
          const durationMs =
            Number(hrtime.bigint() - preparedStart) / 1_000_000;
          if (durationMs > REPORT_SLOW_QUERIES_MS) {
            console.log(
              `Prepared statement raw in ${durationMs.toFixed(2)} ms`,
              {
                sql,
              }
            );
          }
        }
      };

      return prepared;
    } finally {
      const durationMs = Number(hrtime.bigint() - start) / 1_000_000;
      if (durationMs > REPORT_SLOW_QUERIES_MS) {
        console.log(`Prepared statement in ${durationMs.toFixed(2)} ms`, {
          sql,
        });
      }
    }
  }) as PrepareFn;

  return sqlite;
};

export const createDb = (options: { fileName: string }) => {
  if (process.env.VITEST) {
    options.fileName = ":memory:";
  }
  const { fileName } = options;
  let sqlite = new Database(fileName);
  sqlite = proxyDatabase(sqlite);

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
