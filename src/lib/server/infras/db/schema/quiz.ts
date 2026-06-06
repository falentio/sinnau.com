import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema.ts";
import { chapter } from "./chapter.ts";
import { studySet } from "./study-set.ts";

export const QUIZ_TYPES = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_SELECT",
  "FILL_IN_THE_BLANK",
] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

export const quiz = sqliteTable(
  "quiz",
  {
    chapterId: text("chapter_id").references(() => chapter.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questionText: text("question_text").notNull(),
    studySetId: text("study_set_id")
      .notNull()
      .references(() => studySet.id, { onDelete: "cascade" }),
    type: text("type", { enum: QUIZ_TYPES }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("quiz_ownerId_idx").on(table.ownerId),
    index("quiz_studySetId_idx").on(table.studySetId),
    index("quiz_chapterId_idx").on(table.chapterId),
  ]
);

export const quizOption = sqliteTable(
  "quiz_option",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    explanation: text("explanation"),
    id: text("id").primaryKey(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    optionText: text("option_text").notNull(),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quiz.id, { onDelete: "cascade" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("quiz_option_quizId_idx").on(table.quizId)]
);

export type Quiz = typeof quiz.$inferSelect;
export type NewQuiz = typeof quiz.$inferInsert;
export type QuizOption = typeof quizOption.$inferSelect;
export type NewQuizOption = typeof quizOption.$inferInsert;
