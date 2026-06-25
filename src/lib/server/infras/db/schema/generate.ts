import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema.ts";
import { studySet } from "./study-set.ts";

export const GENERATE_STATUSES = [
  "CREATED",
  "ONGOING",
  "COMPLETED",
  "PARTIAL_COMPLETED",
  "FAILED",
] as const;
export type GenerateStatus = (typeof GENERATE_STATUSES)[number];

export const generate = sqliteTable(
  "generate",
  {
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startedAt: integer("started_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    status: text("status", { enum: GENERATE_STATUSES }).notNull(),
    studySetId: text("study_set_id")
      .notNull()
      .references(() => studySet.id, { onDelete: "cascade" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("generate_ownerId_idx").on(table.ownerId),
    index("generate_studySetId_idx").on(table.studySetId),
    index("generate_status_idx").on(table.status),
  ]
);

export const generateInput = sqliteTable(
  "generate_input",
  {
    generateId: text("generate_id")
      .notNull()
      .references(() => generate.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    input: text("input").notNull(),
    isInputTruncated: integer("is_input_truncated", {
      mode: "boolean",
    }).notNull(),
  },
  (table) => [
    uniqueIndex("generate_input_generateId_unique").on(table.generateId),
  ]
);

export const generateChunkResult = sqliteTable(
  "generate_chunk_result",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    generateId: text("generate_id")
      .notNull()
      .references(() => generate.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    index: integer("index").notNull(),
    kind: text("kind", { enum: ["success", "failure"] as const }).notNull(),
    payload: text("payload").notNull(),
  },
  (table) => [
    index("generate_chunk_result_generateId_idx").on(table.generateId),
    index("generate_chunk_result_generateId_index_idx").on(
      table.generateId,
      table.index
    ),
  ]
);

export type Generate = typeof generate.$inferSelect;
export type NewGenerate = typeof generate.$inferInsert;
export type GenerateInput = typeof generateInput.$inferSelect;
export type NewGenerateInput = typeof generateInput.$inferInsert;
export type GenerateChunkResult = typeof generateChunkResult.$inferSelect;
export type NewGenerateChunkResult = typeof generateChunkResult.$inferInsert;
