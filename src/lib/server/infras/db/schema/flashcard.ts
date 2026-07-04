import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema.ts";
import { chapter } from "./chapter.ts";
import { studySet } from "./study-set.ts";

export const flashcard = sqliteTable(
  "flashcard",
  {
    back: text("back").notNull(),
    chapterId: text("chapter_id").references(() => chapter.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    front: text("front").notNull(),
    hint: text("hint"),
    id: text("id").primaryKey(),
    isAiGenerated: integer("is_ai_generated", { mode: "boolean" })
      .notNull()
      .default(false),
    importance: integer("importance").notNull().default(0),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    studySetId: text("study_set_id")
      .notNull()
      .references(() => studySet.id, { onDelete: "cascade" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("flashcard_ownerId_idx").on(table.ownerId),
    index("flashcard_studySetId_idx").on(table.studySetId),
    index("flashcard_chapterId_idx").on(table.chapterId),
    index("flashcard_studySetId_createdAt_idx").on(
      table.studySetId,
      table.createdAt
    ),
  ]
);

export type Flashcard = typeof flashcard.$inferSelect;
export type NewFlashcard = typeof flashcard.$inferInsert;
