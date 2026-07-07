import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db as defaultDb } from "../../infras/db/client.ts";
import type { DB } from "../../infras/db/client.ts";
import { chapter } from "../../infras/db/schema/chapter.ts";
import type { Chapter } from "../../infras/db/schema/chapter.ts";
import { quiz, quizOption } from "../../infras/db/schema/quiz.ts";
import type { Quiz, QuizOption } from "../../infras/db/schema/quiz.ts";
import type {
  NewQuizOptionRow,
  NewQuizRow,
  QuizOptionUpdatePatch,
  QuizRepository,
  QuizUpdatePatch,
  QuizWithOptions,
} from "./quiz.repository.ts";

export class QuizDrizzleRepository implements QuizRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): QuizDrizzleRepository {
    return new QuizDrizzleRepository(db);
  }

  async insertQuiz(
    row: NewQuizRow,
    options: NewQuizOptionRow[]
  ): Promise<Quiz> {
    try {
      await Promise.resolve();
      const inserted = this.dbInstance.transaction((tx) => {
        const rowsReturned = tx.insert(quiz).values(row).returning().all();
        const [created] = rowsReturned;
        if (!created) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Internal server error",
          });
        }
        if (options.length > 0) {
          tx.insert(quizOption).values(options).run();
        }
        return created;
      });
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

  async updateQuiz(
    id: string,
    ownerId: string,
    patch: QuizUpdatePatch
  ): Promise<Quiz | null> {
    try {
      const [updated] = await this.dbInstance
        .update(quiz)
        .set(patch)
        .where(and(eq(quiz.id, id), eq(quiz.ownerId, ownerId)))
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

  async deleteQuizzes(ids: string[], ownerId: string): Promise<boolean> {
    if (ids.length === 0) {
      return false;
    }
    try {
      await Promise.resolve();
      this.dbInstance.transaction((tx) => {
        const deleted = tx
          .delete(quiz)
          .where(and(inArray(quiz.id, ids), eq(quiz.ownerId, ownerId)))
          .returning({ id: quiz.id })
          .all();
        if (deleted.length !== ids.length) {
          throw new Error("QUIZ_DELETE_PARTIAL_FORBIDDEN");
        }
      });
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "QUIZ_DELETE_PARTIAL_FORBIDDEN"
      ) {
        return false;
      }
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findQuizById(id: string): Promise<Quiz | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(quiz)
        .where(eq(quiz.id, id))
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

  async findQuizzesByStudySetId(
    studySetId: string
  ): Promise<QuizWithOptions[]> {
    try {
      const rows = await this.dbInstance
        .select()
        .from(quiz)
        .leftJoin(quizOption, eq(quiz.id, quizOption.quizId))
        .where(eq(quiz.studySetId, studySetId))
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

  async findQuizzesByIds(ids: string[]): Promise<Quiz[]> {
    try {
      if (ids.length === 0) {
        return [];
      }
      const rows = await this.dbInstance
        .select()
        .from(quiz)
        .where(inArray(quiz.id, ids))
        .orderBy(desc(quiz.createdAt), asc(quiz.id));
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

  async findOptionsByQuizIds(quizIds: string[]): Promise<QuizOption[]> {
    try {
      if (quizIds.length === 0) {
        return [];
      }
      const rows = await this.dbInstance
        .select()
        .from(quizOption)
        .where(inArray(quizOption.quizId, quizIds))
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

  async findOptionsByIdsForOwner(
    ids: string[],
    ownerId: string
  ): Promise<QuizOption[]> {
    try {
      if (ids.length === 0) {
        return [];
      }
      const rows = await this.dbInstance
        .select({
          createdAt: quizOption.createdAt,
          explanation: quizOption.explanation,
          id: quizOption.id,
          isCorrect: quizOption.isCorrect,
          optionText: quizOption.optionText,
          quizId: quizOption.quizId,
          updatedAt: quizOption.updatedAt,
        })
        .from(quizOption)
        .innerJoin(quiz, eq(quizOption.quizId, quiz.id))
        .where(and(inArray(quizOption.id, ids), eq(quiz.ownerId, ownerId)))
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

  async findOptionByIdForOwner(
    id: string,
    ownerId: string
  ): Promise<QuizOption | null> {
    try {
      const [row] = await this.dbInstance
        .select({
          createdAt: quizOption.createdAt,
          explanation: quizOption.explanation,
          id: quizOption.id,
          isCorrect: quizOption.isCorrect,
          optionText: quizOption.optionText,
          quizId: quizOption.quizId,
          updatedAt: quizOption.updatedAt,
        })
        .from(quizOption)
        .innerJoin(quiz, eq(quizOption.quizId, quiz.id))
        .where(and(eq(quizOption.id, id), eq(quiz.ownerId, ownerId)))
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

  async insertQuizOptions(rows: NewQuizOptionRow[]): Promise<QuizOption[]> {
    try {
      if (rows.length === 0) {
        return [];
      }
      const inserted = await this.dbInstance
        .insert(quizOption)
        .values(rows)
        .returning();
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

  async updateQuizOption(
    id: string,
    ownerId: string,
    patch: QuizOptionUpdatePatch
  ): Promise<QuizOption | null> {
    try {
      const target = await this.findOptionByIdForOwner(id, ownerId);
      if (!target) {
        return null;
      }
      const [updated] = await this.dbInstance
        .update(quizOption)
        .set(patch)
        .where(eq(quizOption.id, id))
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

  async deleteQuizOptions(ids: string[], ownerId: string): Promise<boolean> {
    try {
      if (ids.length === 0) {
        return false;
      }
      const owned = await this.findOptionsByIdsForOwner(ids, ownerId);
      if (owned.length !== ids.length) {
        return false;
      }
      const deleted = await this.dbInstance
        .delete(quizOption)
        .where(inArray(quizOption.id, ids))
        .returning({ id: quizOption.id });
      return deleted.length === ids.length;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findOptionsByIds(ids: string[]): Promise<QuizOption[]> {
    try {
      if (ids.length === 0) {
        return [];
      }
      const rows = await this.dbInstance
        .select()
        .from(quizOption)
        .where(inArray(quizOption.id, ids))
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

  async updateQuizWithOptions(
    quizId: string,
    ownerId: string,
    quizPatch: QuizUpdatePatch,
    optionsToDelete: string[],
    optionsToUpdate: { id: string; patch: QuizOptionUpdatePatch }[],
    optionsToCreate: NewQuizOptionRow[]
  ): Promise<QuizWithOptions | null> {
    try {
      await Promise.resolve();
      const result = this.dbInstance.transaction((tx) => {
        const hasQuizPatch = Object.keys(quizPatch).length > 0;
        let updatedQuiz: Quiz | null = null;

        if (hasQuizPatch) {
          const [row] = tx
            .update(quiz)
            .set(quizPatch)
            .where(and(eq(quiz.id, quizId), eq(quiz.ownerId, ownerId)))
            .returning()
            .all();
          updatedQuiz = row ?? null;
        } else {
          const [row] = tx
            .select()
            .from(quiz)
            .where(and(eq(quiz.id, quizId), eq(quiz.ownerId, ownerId)))
            .all();
          updatedQuiz = row ?? null;
        }

        if (!updatedQuiz) {
          return null;
        }

        if (optionsToDelete.length > 0) {
          tx.delete(quizOption)
            .where(inArray(quizOption.id, optionsToDelete))
            .run();
        }

        for (const { id, patch } of optionsToUpdate) {
          tx.update(quizOption).set(patch).where(eq(quizOption.id, id)).run();
        }

        if (optionsToCreate.length > 0) {
          tx.insert(quizOption).values(optionsToCreate).run();
        }

        return updatedQuiz;
      });

      if (!result) {
        return null;
      }

      const allOptions = await this.findOptionsByQuizIds([quizId]);

      return {
        ...result,
        options: allOptions,
      };
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
