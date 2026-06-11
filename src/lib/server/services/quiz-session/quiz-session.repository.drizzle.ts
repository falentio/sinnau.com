import {
  QUIZ_SESSION_ANSWER_ID_PREFIX,
  QUIZ_SESSION_ID_PREFIX,
} from "$lib/schemas/quiz-session.constant";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";

import { db as defaultDb } from "../../infras/db/client.ts";
import type { DB } from "../../infras/db/client.ts";
import { chapter } from "../../infras/db/schema/chapter.ts";
import type { Chapter } from "../../infras/db/schema/chapter.ts";
import {
  quizSession,
  quizSessionAnswer,
} from "../../infras/db/schema/quiz-session.ts";
import type {
  QuizSession,
  QuizSessionAnswer,
} from "../../infras/db/schema/quiz-session.ts";
import { quiz, quizOption } from "../../infras/db/schema/quiz.ts";
import type { QuizOption } from "../../infras/db/schema/quiz.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { QuizWithOptions } from "../quiz/quiz.repository.ts";
import type {
  QuizSessionRepository,
  QuizSessionUpdatePatch,
} from "./quiz-session.repository.ts";

export class QuizSessionDrizzleRepository implements QuizSessionRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): QuizSessionDrizzleRepository {
    return new QuizSessionDrizzleRepository(db);
  }

  async insertSession(
    row: Omit<QuizSession, "createdAt" | "updatedAt">
  ): Promise<QuizSession> {
    try {
      const [created] = await this.dbInstance
        .insert(quizSession)
        .values({
          ...row,
          id: generateId(QUIZ_SESSION_ID_PREFIX),
        })
        .returning();
      if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Internal server error",
        });
      }
      return created;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async updateSession(
    id: string,
    userId: string,
    patch: QuizSessionUpdatePatch
  ): Promise<QuizSession | null> {
    try {
      const [updated] = await this.dbInstance
        .update(quizSession)
        .set(patch)
        .where(and(eq(quizSession.id, id), eq(quizSession.userId, userId)))
        .returning();
      return updated ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findSessionById(id: string): Promise<QuizSession | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(quizSession)
        .where(eq(quizSession.id, id))
        .limit(1);
      return row ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findSessionsByStudySetAndUser(
    studySetId: string,
    userId: string
  ): Promise<QuizSession[]> {
    try {
      const rows = await this.dbInstance
        .select()
        .from(quizSession)
        .where(
          and(
            eq(quizSession.studySetId, studySetId),
            eq(quizSession.userId, userId)
          )
        )
        .orderBy(desc(quizSession.createdAt));
      return rows;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async countQuizzesInScope(
    studySetId: string,
    chapterId: string | null
  ): Promise<number> {
    try {
      const chapterCondition =
        chapterId === null
          ? sql`${quiz.chapterId} IS NULL`
          : eq(quiz.chapterId, chapterId);

      const [row] = await this.dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(quiz)
        .where(and(eq(quiz.studySetId, studySetId), chapterCondition));
      return row?.count ?? 0;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findQuizzesWithOptionsInScope(
    studySetId: string,
    chapterId: string | null
  ): Promise<QuizWithOptions[]> {
    try {
      const chapterCondition =
        chapterId === null
          ? sql`${quiz.chapterId} IS NULL`
          : eq(quiz.chapterId, chapterId);

      const rows = await this.dbInstance
        .select()
        .from(quiz)
        .leftJoin(quizOption, eq(quiz.id, quizOption.quizId))
        .where(and(eq(quiz.studySetId, studySetId), chapterCondition))
        .orderBy(
          desc(quiz.createdAt),
          asc(quiz.id),
          asc(quizOption.createdAt),
          asc(quizOption.id)
        );

      const byId = new Map<string, QuizWithOptions>();
      for (const row of rows) {
        const q = row.quiz;
        const opt = row.quiz_option;
        let entry = byId.get(q.id);
        if (!entry) {
          entry = { ...q, options: [] };
          byId.set(q.id, entry);
        }
        if (opt) {
          entry.options.push(opt);
        }
      }
      return [...byId.values()];
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findQuizById(quizId: string): Promise<QuizWithOptions | null> {
    try {
      const rows = await this.dbInstance
        .select()
        .from(quiz)
        .leftJoin(quizOption, eq(quiz.id, quizOption.quizId))
        .where(eq(quiz.id, quizId))
        .orderBy(asc(quizOption.createdAt), asc(quizOption.id));

      if (rows.length === 0) {
        return null;
      }

      const [first] = rows;
      if (!first) {
        return null;
      }
      const entry: QuizWithOptions = { ...first.quiz, options: [] };
      for (const row of rows) {
        if (row.quiz_option) {
          entry.options.push(row.quiz_option);
        }
      }
      return entry;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findQuizByIdInScope(
    quizId: string,
    studySetId: string,
    chapterId: string | null
  ): Promise<QuizWithOptions | null> {
    try {
      const chapterCondition =
        chapterId === null
          ? sql`${quiz.chapterId} IS NULL`
          : eq(quiz.chapterId, chapterId);

      const rows = await this.dbInstance
        .select()
        .from(quiz)
        .leftJoin(quizOption, eq(quiz.id, quizOption.quizId))
        .where(
          and(
            eq(quiz.id, quizId),
            eq(quiz.studySetId, studySetId),
            chapterCondition
          )
        )
        .orderBy(asc(quizOption.createdAt), asc(quizOption.id));

      if (rows.length === 0) {
        return null;
      }

      const [first] = rows;
      if (!first) {
        return null;
      }
      const entry: QuizWithOptions = { ...first.quiz, options: [] };
      for (const row of rows) {
        if (row.quiz_option) {
          entry.options.push(row.quiz_option);
        }
      }
      return entry;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findQuizOptionsByQuizId(quizId: string): Promise<QuizOption[]> {
    try {
      const rows = await this.dbInstance
        .select()
        .from(quizOption)
        .where(eq(quizOption.quizId, quizId))
        .orderBy(asc(quizOption.createdAt), asc(quizOption.id));
      return rows;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findChapterById(id: string): Promise<Chapter | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(chapter)
        .where(eq(chapter.id, id))
        .limit(1);
      return row ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async upsertAnswer(
    row: Omit<QuizSessionAnswer, "createdAt" | "updatedAt">
  ): Promise<QuizSessionAnswer> {
    try {
      const [inserted] = await this.dbInstance
        .insert(quizSessionAnswer)
        .values({
          ...row,
          id: generateId(QUIZ_SESSION_ANSWER_ID_PREFIX),
        })
        .onConflictDoUpdate({
          set: {
            selectedOptionIds: row.selectedOptionIds,
            updatedAt: new Date(),
          },
          target: [quizSessionAnswer.sessionId, quizSessionAnswer.quizId],
        })
        .returning();
      if (!inserted) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Internal server error",
        });
      }
      return inserted;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findAnswersBySession(sessionId: string): Promise<QuizSessionAnswer[]> {
    try {
      const rows = await this.dbInstance
        .select()
        .from(quizSessionAnswer)
        .where(eq(quizSessionAnswer.sessionId, sessionId))
        .orderBy(asc(quizSessionAnswer.createdAt));
      return rows;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findAnswerBySessionAndQuiz(
    sessionId: string,
    quizId: string
  ): Promise<QuizSessionAnswer | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(quizSessionAnswer)
        .where(
          and(
            eq(quizSessionAnswer.sessionId, sessionId),
            eq(quizSessionAnswer.quizId, quizId)
          )
        )
        .limit(1);
      return row ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async deleteExpiredSessionsAndOrphans(cutoffMs: number): Promise<number> {
    try {
      await Promise.resolve();
      const result = this.dbInstance.transaction((tx) => {
        const deletedSessions = tx
          .delete(quizSession)
          .where(lt(quizSession.updatedAt, new Date(cutoffMs)))
          .returning({ id: quizSession.id })
          .all();

        const deletedOrphans = tx
          .delete(quizSessionAnswer)
          .where(sql`${quizSessionAnswer.quizId} IS NULL`)
          .returning({ id: quizSessionAnswer.id })
          .all();

        return deletedSessions.length + deletedOrphans.length;
      });
      return result;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }
}
