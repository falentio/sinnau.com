import {
  FLASHCARD_SESSION_RATINGS,
  FLASHCARD_SESSION_STATES,
} from "$lib/schemas/flashcard-session.constant";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema.ts";
import { flashcard } from "./flashcard.ts";
import { studySet } from "./study-set.ts";

export const flashcardSession = sqliteTable(
  "flashcard_session",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text("id").primaryKey(),
    studySetId: text("study_set_id")
      .notNull()
      .references(() => studySet.id, { onDelete: "cascade" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("flashcard_session_user_studySet").on(
      table.userId,
      table.studySetId
    ),
    index("flashcard_session_studySetId_idx").on(table.studySetId),
    index("flashcard_session_updatedAt_idx").on(table.updatedAt),
  ]
);

export const flashcardSessionReview = sqliteTable(
  "flashcard_session_review",
  {
    flashcardId: text("flashcard_id").references(() => flashcard.id, {
      onDelete: "cascade",
    }),
    id: text("id").primaryKey(),
    preDifficulty: real("pre_difficulty").notNull(),
    preDue: integer("pre_due", { mode: "timestamp_ms" }).notNull(),
    preLapses: integer("pre_lapses").notNull(),
    preLastReview: integer("pre_last_review", { mode: "timestamp_ms" }),
    preLearningSteps: integer("pre_learning_steps").notNull(),
    preReps: integer("pre_reps").notNull(),
    preScheduledDays: integer("pre_scheduled_days").notNull(),
    preStability: real("pre_stability").notNull(),
    preState: text("pre_state", { enum: FLASHCARD_SESSION_STATES }).notNull(),
    rating: text("rating", { enum: FLASHCARD_SESSION_RATINGS }).notNull(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }).notNull(),
    sessionId: text("session_id")
      .notNull()
      .references(() => flashcardSession.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("flashcard_session_review_flashcardId_sessionId_idx").on(
      table.flashcardId,
      table.sessionId
    ),
    index("flashcard_session_review_sessionId_reviewedAt_idx").on(
      table.sessionId,
      table.reviewedAt
    ),
  ]
);

export const flashcardState = sqliteTable(
  "flashcard_state",
  {
    difficulty: real("difficulty").notNull(),
    due: integer("due", { mode: "timestamp_ms" }).notNull(),
    elapsedDays: integer("elapsed_days").notNull(),
    flashcardId: text("flashcard_id")
      .notNull()
      .references(() => flashcard.id, { onDelete: "cascade" }),
    introducedAt: integer("introduced_at", { mode: "timestamp_ms" }),
    lapses: integer("lapses").notNull(),
    lastReview: integer("last_review", { mode: "timestamp_ms" }),
    learningSteps: integer("learning_steps").notNull(),
    reps: integer("reps").notNull(),
    scheduledDays: integer("scheduled_days").notNull(),
    stability: real("stability").notNull(),
    state: text("state", { enum: FLASHCARD_SESSION_STATES }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.flashcardId] }),
    index("flashcard_state_userId_introducedAt_idx").on(
      table.userId,
      table.introducedAt
    ),
    index("flashcard_state_userId_flashcardId_introducedAt_idx").on(
      table.userId,
      table.flashcardId,
      table.introducedAt
    ),
  ]
);

export type FlashcardSession = typeof flashcardSession.$inferSelect;
export type NewFlashcardSession = typeof flashcardSession.$inferInsert;
export type FlashcardSessionReview = typeof flashcardSessionReview.$inferSelect;
export type NewFlashcardSessionReview =
  typeof flashcardSessionReview.$inferInsert;
export type FlashcardCardState = typeof flashcardState.$inferSelect;
export type NewFlashcardCardState = typeof flashcardState.$inferInsert;
