import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema.ts";
import { chapter } from "./chapter.ts";
import { quiz } from "./quiz.ts";
import { studySet } from "./study-set.ts";

export const QUIZ_SESSION_STATUSES = ["ACTIVE", "COMPLETED"] as const;
export type QuizSessionStatus = (typeof QUIZ_SESSION_STATUSES)[number];

export const quizSession = sqliteTable(
  "quiz_session",
  {
    chapterId: text("chapter_id").references(() => chapter.id, {
      onDelete: "set null",
    }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    correctCount: integer("correct_count"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    failingChapterIds: text("failing_chapter_ids", { mode: "json" }).$type<
      string[]
    >(),
    id: text("id").primaryKey(),
    incorrectQuizIds: text("incorrect_quiz_ids", { mode: "json" }).$type<
      string[]
    >(),
    lastAnsweredAt: integer("last_answered_at", { mode: "timestamp_ms" }),
    lastQuestionText: text("last_question_text"),
    quizCount: integer("quiz_count").notNull(),
    score: integer("score"),
    status: text("status", { enum: QUIZ_SESSION_STATUSES }).notNull(),
    studySetId: text("study_set_id")
      .notNull()
      .references(() => studySet.id, { onDelete: "cascade" }),
    totalQuestions: integer("total_questions"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("quiz_session_userId_idx").on(table.userId),
    index("quiz_session_studySetId_idx").on(table.studySetId),
    index("quiz_session_status_idx").on(table.status),
    index("quiz_session_createdAt_idx").on(table.createdAt),
  ]
);

export const quizSessionQuiz = sqliteTable(
  "quiz_session_quiz",
  {
    chapterId: text("chapter_id"),
    id: text("id").primaryKey(),
    originalQuizId: text("original_quiz_id").references(() => quiz.id, {
      onDelete: "set null",
    }),
    position: integer("position").notNull(),
    questionText: text("question_text").notNull(),
    sessionId: text("session_id")
      .notNull()
      .references(() => quizSession.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "FILL_IN_THE_BLANK"],
    }).notNull(),
  },
  (table) => [
    index("quiz_session_quiz_sessionId_idx").on(table.sessionId),
    index("quiz_session_quiz_originalQuizId_idx").on(table.originalQuizId),
  ]
);

export const quizSessionQuizOption = sqliteTable(
  "quiz_session_quiz_option",
  {
    explanation: text("explanation"),
    id: text("id").primaryKey(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    optionText: text("option_text").notNull(),
    position: integer("position").notNull(),
    sessionQuizId: text("session_quiz_id")
      .notNull()
      .references(() => quizSessionQuiz.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("quiz_session_quiz_option_sessionQuizId_idx").on(table.sessionQuizId),
  ]
);

export const quizSessionAnswer = sqliteTable(
  "quiz_session_answer",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text("id").primaryKey(),
    selectedOptionIds: text("selected_option_ids", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    sessionId: text("session_id")
      .notNull()
      .references(() => quizSession.id, { onDelete: "cascade" }),
    sessionQuizId: text("session_quiz_id")
      .notNull()
      .references(() => quizSessionQuiz.id, { onDelete: "cascade" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("quiz_session_answer_sessionId_idx").on(table.sessionId),
    unique("quiz_session_answer_session_sessionQuiz").on(
      table.sessionId,
      table.sessionQuizId
    ),
  ]
);

export type QuizSession = typeof quizSession.$inferSelect;
export type NewQuizSession = typeof quizSession.$inferInsert;
export type QuizSessionQuiz = typeof quizSessionQuiz.$inferSelect;
export type NewQuizSessionQuiz = typeof quizSessionQuiz.$inferInsert;
export type QuizSessionQuizOption = typeof quizSessionQuizOption.$inferSelect;
export type NewQuizSessionQuizOption =
  typeof quizSessionQuizOption.$inferInsert;
export type QuizSessionAnswer = typeof quizSessionAnswer.$inferSelect;
export type NewQuizSessionAnswer = typeof quizSessionAnswer.$inferInsert;
