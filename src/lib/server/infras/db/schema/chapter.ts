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

export const chapter = sqliteTable(
  "chapter",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    description: text("description"),
    id: text("id").primaryKey(),
    isAiGenerated: integer("is_ai_generated", { mode: "boolean" })
      .notNull()
      .default(false),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    studySetId: text("study_set_id")
      .notNull()
      .references(() => studySet.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("chapter_studySetId_slug_unique").on(
      sql`lower(${table.slug})`,
      table.studySetId
    ),
    index("chapter_studySetId_idx").on(table.studySetId),
    index("chapter_ownerId_idx").on(table.ownerId),
  ]
);

export type Chapter = typeof chapter.$inferSelect;
export type NewChapter = typeof chapter.$inferInsert;
