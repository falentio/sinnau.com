import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema.ts";

export const STUDY_SET_VISIBILITIES = ["PUBLIC", "PRIVATE"] as const;
export type StudySetVisibility = (typeof STUDY_SET_VISIBILITIES)[number];

export const studySet = sqliteTable(
  "study_set",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    description: text("description"),
    files: text("files", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    visibility: text("visibility", { enum: STUDY_SET_VISIBILITIES }).notNull(),
  },
  (table) => [
    uniqueIndex("study_set_slug_unique").on(sql`lower(${table.slug})`),
    index("study_set_ownerId_idx").on(table.ownerId),
    index("study_set_visibility_idx").on(table.visibility),
  ]
);

export const studySetVisit = sqliteTable(
  "study_set_visit",
  {
    id: text("id").primaryKey(),
    studySetId: text("study_set_id")
      .notNull()
      .references(() => studySet.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    visitedAt: integer("visited_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("study_set_visit_user_studySet_unique").on(
      table.userId,
      table.studySetId
    ),
    index("study_set_visit_userId_idx").on(table.userId),
    index("study_set_visit_studySetId_idx").on(table.studySetId),
    index("study_set_visit_visitedAt_idx").on(table.visitedAt),
  ]
);

export type StudySet = typeof studySet.$inferSelect;
export type NewStudySet = typeof studySet.$inferInsert;
export type StudySetVisit = typeof studySetVisit.$inferSelect;
export type NewStudySetVisit = typeof studySetVisit.$inferInsert;
