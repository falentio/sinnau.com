import { and, asc, count, desc, eq, inArray, lt } from "drizzle-orm";

import { db as defaultDb } from "../../infras/db/client.ts";
import type { DB } from "../../infras/db/client.ts";
import {
  quizSession,
  quizSessionAnswer,
  quizSessionQuiz,
  quizSessionQuizOption,
} from "../../infras/db/schema/quiz-session.ts";
import type {
  QuizSession,
  QuizSessionAnswer,
  QuizSessionQuiz,
  QuizSessionQuizOption,
} from "../../infras/db/schema/quiz-session.ts";
import { quiz } from "../../infras/db/schema/quiz.ts";
import type {
  NewQuizSessionAnswerRow,
  NewQuizSessionQuizOptionRow,
  NewQuizSessionQuizRow,
  NewQuizSessionRow,
  QuizSessionRepository,
  QuizSessionUpdatePatch,
  QuizSessionQuizWithOptions,
} from "./quiz-session.repository.ts";

export class QuizSessionDrizzleRepository implements QuizSessionRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): QuizSessionDrizzleRepository {
    return new QuizSessionDrizzleRepository(db);
  }

  async countQuizzesInScope(
    studySetId: string,
    chapterId?: string
  ): Promise<number> {
    const filters = [eq(quiz.studySetId, studySetId)];
    if (chapterId !== undefined) {
      filters.push(eq(quiz.chapterId, chapterId));
    }
    const [row] = await this.dbInstance
      .select({ value: count() })
      .from(quiz)
      .where(and(...filters))
      .limit(1);
    return row?.value ?? 0;
  }

  async deleteExpiredSessions(beforeTimestamp: number): Promise<number> {
    const deleted = await this.dbInstance
      .delete(quizSession)
      .where(lt(quizSession.createdAt, new Date(beforeTimestamp)))
      .returning({ id: quizSession.id });
    return deleted.length;
  }

  async findAnswersBySessionId(
    sessionId: string
  ): Promise<QuizSessionAnswer[]> {
    return await this.dbInstance
      .select()
      .from(quizSessionAnswer)
      .where(eq(quizSessionAnswer.sessionId, sessionId))
      .orderBy(asc(quizSessionAnswer.createdAt));
  }

  async findSessionById(id: string): Promise<QuizSession | null> {
    const [row] = await this.dbInstance
      .select()
      .from(quizSession)
      .where(eq(quizSession.id, id))
      .limit(1);
    return row ?? null;
  }

  async findSessionQuizById(
    sessionQuizId: string
  ): Promise<QuizSessionQuiz | null> {
    const [row] = await this.dbInstance
      .select()
      .from(quizSessionQuiz)
      .where(eq(quizSessionQuiz.id, sessionQuizId))
      .limit(1);
    return row ?? null;
  }

  async findSessionQuizOptionsByIds(
    optionIds: string[]
  ): Promise<QuizSessionQuizOption[]> {
    if (optionIds.length === 0) {
      return [];
    }
    return await this.dbInstance
      .select()
      .from(quizSessionQuizOption)
      .where(inArray(quizSessionQuizOption.id, optionIds))
      .orderBy(asc(quizSessionQuizOption.position));
  }

  async findSessionQuizzesWithOptions(
    sessionId: string
  ): Promise<QuizSessionQuizWithOptions[]> {
    const rows = await this.dbInstance
      .select()
      .from(quizSessionQuiz)
      .leftJoin(
        quizSessionQuizOption,
        eq(quizSessionQuizOption.sessionQuizId, quizSessionQuiz.id)
      )
      .where(eq(quizSessionQuiz.sessionId, sessionId))
      .orderBy(
        asc(quizSessionQuiz.position),
        asc(quizSessionQuizOption.position)
      );

    const byId = new Map<string, QuizSessionQuizWithOptions>();
    for (const row of rows) {
      const q = row.quiz_session_quiz;
      const opt = row.quiz_session_quiz_option;
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
  }

  async findSessionsByStudySet(
    studySetId: string,
    userId: string
  ): Promise<QuizSession[]> {
    return await this.dbInstance
      .select()
      .from(quizSession)
      .where(
        and(
          eq(quizSession.studySetId, studySetId),
          eq(quizSession.userId, userId)
        )
      )
      .orderBy(desc(quizSession.createdAt));
  }

  async insertSessionWithQuizzes(
    session: NewQuizSessionRow,
    quizzes: NewQuizSessionQuizRow[],
    options: NewQuizSessionQuizOptionRow[]
  ): Promise<QuizSession> {
    await Promise.resolve();
    const created = this.dbInstance.transaction((tx) => {
      const [createdSession] = tx
        .insert(quizSession)
        .values(session)
        .returning()
        .all();
      if (!createdSession) {
        throw new Error("Failed to insert quiz session");
      }
      if (quizzes.length > 0) {
        for (const q of quizzes) {
          tx.insert(quizSessionQuiz).values(q).run();
        }
      }
      if (options.length > 0) {
        for (const opt of options) {
          tx.insert(quizSessionQuizOption).values(opt).run();
        }
      }
      return createdSession;
    });
    return created;
  }

  async updateSession(
    id: string,
    userId: string,
    patch: QuizSessionUpdatePatch
  ): Promise<QuizSession | null> {
    const [updated] = await this.dbInstance
      .update(quizSession)
      .set(patch)
      .where(and(eq(quizSession.id, id), eq(quizSession.userId, userId)))
      .returning();
    return updated ?? null;
  }

  async upsertAnswer(row: NewQuizSessionAnswerRow): Promise<QuizSessionAnswer> {
    const [existing] = await this.dbInstance
      .select()
      .from(quizSessionAnswer)
      .where(
        and(
          eq(quizSessionAnswer.sessionId, row.sessionId),
          eq(quizSessionAnswer.sessionQuizId, row.sessionQuizId)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await this.dbInstance
        .update(quizSessionAnswer)
        .set({
          selectedOptionIds: row.selectedOptionIds,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(quizSessionAnswer.sessionId, row.sessionId),
            eq(quizSessionAnswer.sessionQuizId, row.sessionQuizId)
          )
        )
        .returning()
        .limit(1);
      if (!updated) {
        throw new Error("Failed to update quiz session answer");
      }
      return updated;
    }

    const [created] = await this.dbInstance
      .insert(quizSessionAnswer)
      .values(row)
      .returning();
    if (!created) {
      throw new Error("Failed to insert quiz session answer");
    }
    return created;
  }
}
