import type { FlashcardSessionReviewWithFront } from "$lib/schemas/flashcard-session";
import {
  FLASHCARD_SESSION_ID_PREFIX,
  FLASHCARD_SESSION_PAGE_LIMIT_MAX,
  FLASHCARD_SESSION_QUEUE_BUCKET_LIMIT,
  FLASHCARD_SESSION_REVIEW_ID_PREFIX,
} from "$lib/schemas/flashcard-session.constant";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { db as defaultDb } from "../../infras/db/client.ts";
import type { DB } from "../../infras/db/client.ts";
import {
  flashcardSession,
  flashcardSessionReview,
  flashcardState,
} from "../../infras/db/schema/flashcard-session.ts";
import type {
  FlashcardCardState,
  FlashcardSession,
  FlashcardSessionReview,
} from "../../infras/db/schema/flashcard-session.ts";
import { flashcard } from "../../infras/db/schema/flashcard.ts";
import { studySet } from "../../infras/db/schema/study-set.ts";
import { generateId } from "../../utils/nanoid.ts";
import type {
  DueIn7DaysItem,
  FlashcardSessionListResult,
  FlashcardSessionRepository,
  QueueFlashcardWithState,
} from "./flashcard-session.repository.ts";

const fillDueIn7Days = (
  now: number,
  grouped: { count: number; day: string }[]
): DueIn7DaysItem[] => {
  const map = new Map(grouped.map((row) => [row.day, row.count]));
  const nowUtc = new Date(now);
  const result: DueIn7DaysItem[] = [];
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(
      Date.UTC(
        nowUtc.getUTCFullYear(),
        nowUtc.getUTCMonth(),
        nowUtc.getUTCDate() + i
      )
    );
    const dateStr = d.toISOString().slice(0, 10);
    result.push({ count: map.get(dateStr) ?? 0, date: dateStr });
  }
  return result;
};

const isForeignKeyError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const { code } = error as { code?: unknown };
  return code === "SQLITE_CONSTRAINT_FOREIGNKEY";
};

export class FlashcardSessionDrizzleRepository implements FlashcardSessionRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): FlashcardSessionDrizzleRepository {
    return new FlashcardSessionDrizzleRepository(db);
  }

  async findSessionById(id: string): Promise<FlashcardSession | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(flashcardSession)
        .where(eq(flashcardSession.id, id))
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

  async findSessionByUserAndStudySet(
    userId: string,
    studySetId: string
  ): Promise<FlashcardSession | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(flashcardSession)
        .where(
          and(
            eq(flashcardSession.userId, userId),
            eq(flashcardSession.studySetId, studySetId)
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

  // oxlint-disable-next-line require-await
  async listSessionsForUser(
    userId: string,
    page: number,
    limit: number
  ): Promise<FlashcardSessionListResult> {
    try {
      const effectiveLimit = Math.min(limit, FLASHCARD_SESSION_PAGE_LIMIT_MAX);
      const offset = (page - 1) * effectiveLimit;

      const [rows, totalRow] = [
        this.dbInstance
          .select()
          .from(flashcardSession)
          .innerJoin(
            studySet,
            and(
              eq(studySet.id, flashcardSession.studySetId),
              sql`${studySet.deletedAt} IS NULL`
            )
          )
          .where(eq(flashcardSession.userId, userId))
          .orderBy(desc(flashcardSession.updatedAt))
          .limit(effectiveLimit)
          .offset(offset)
          .all()
          .map((r) => r.flashcard_session),
        this.dbInstance
          .select({ count: sql<number>`count(*)` })
          .from(flashcardSession)
          .innerJoin(
            studySet,
            and(
              eq(studySet.id, flashcardSession.studySetId),
              sql`${studySet.deletedAt} IS NULL`
            )
          )
          .where(eq(flashcardSession.userId, userId))
          .all(),
      ];
      const total = totalRow[0]?.count ?? 0;
      return {
        data: rows,
        pagination: {
          limit: effectiveLimit,
          page,
          total,
          totalPages: Math.max(1, Math.ceil(total / effectiveLimit)),
        },
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

  // oxlint-disable-next-line require-await
  async listSessionsForAdmin(params: {
    userId?: string;
    studySetId?: string;
    page: number;
    limit: number;
  }): Promise<FlashcardSessionListResult> {
    try {
      const filters = [sql`${studySet.deletedAt} IS NULL`];
      if (params.userId !== undefined) {
        filters.push(eq(flashcardSession.userId, params.userId));
      }
      if (params.studySetId !== undefined) {
        filters.push(eq(flashcardSession.studySetId, params.studySetId));
      }
      const effectiveLimit = Math.min(
        params.limit,
        FLASHCARD_SESSION_PAGE_LIMIT_MAX
      );
      const offset = (params.page - 1) * effectiveLimit;
      const whereClause = and(...filters);

      const [rows, totalRow] = [
        this.dbInstance
          .select({ session: flashcardSession })
          .from(flashcardSession)
          .innerJoin(studySet, eq(studySet.id, flashcardSession.studySetId))
          .where(whereClause)
          .orderBy(desc(flashcardSession.updatedAt))
          .limit(effectiveLimit)
          .offset(offset)
          .all()
          .map((r) => r.session),
        this.dbInstance
          .select({ count: sql<number>`count(*)` })
          .from(flashcardSession)
          .innerJoin(studySet, eq(studySet.id, flashcardSession.studySetId))
          .where(whereClause)
          .all(),
      ];
      const total = totalRow[0]?.count ?? 0;
      return {
        data: rows,
        pagination: {
          limit: effectiveLimit,
          page: params.page,
          total,
          totalPages: Math.max(1, Math.ceil(total / effectiveLimit)),
        },
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

  async getOrCreateSession(row: {
    studySetId: string;
    userId: string;
  }): Promise<FlashcardSession> {
    try {
      const [inserted] = await this.dbInstance
        .insert(flashcardSession)
        .values({
          id: generateId(FLASHCARD_SESSION_ID_PREFIX),
          ...row,
        })
        .onConflictDoNothing({
          target: [flashcardSession.userId, flashcardSession.studySetId],
        })
        .returning();
      if (inserted) {
        return inserted;
      }
      const existing = await this.findSessionByUserAndStudySet(
        row.userId,
        row.studySetId
      );
      if (!existing) {
        throw new Error(
          "Failed to insert or fetch flashcard session after conflict"
        );
      }
      return existing;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async updateSessionTouch(
    id: string,
    userId: string
  ): Promise<FlashcardSession | null> {
    try {
      const [updated] = await this.dbInstance
        .update(flashcardSession)
        .set({ updatedAt: new Date() })
        .where(
          and(eq(flashcardSession.id, id), eq(flashcardSession.userId, userId))
        )
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

  // oxlint-disable-next-line require-await
  async deleteExpiredSessions(beforeTimestamp: number): Promise<number> {
    try {
      const cutoff = new Date(beforeTimestamp);
      const cutoffMs = cutoff.getTime();
      return this.dbInstance.transaction((tx) => {
        tx.delete(flashcardState)
          .where(
            sql`(${flashcardState.userId}, ${flashcardState.flashcardId}) IN (
              SELECT fs.user_id, f.id
              FROM ${flashcardSession} fs
              JOIN ${flashcard} f ON f.study_set_id = fs.study_set_id
              WHERE fs.updated_at < ${cutoffMs}
            )`
          )
          .run();
        const deleted = tx
          .delete(flashcardSession)
          .where(lt(flashcardSession.updatedAt, cutoff))
          .returning({ id: flashcardSession.id })
          .all();
        return deleted.length;
      });
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  // oxlint-disable-next-line require-await
  async findFlashcardsForQueue(params: {
    userId: string;
    studySetId: string;
    now: number;
    horizonMs: number;
    dueIn7DaysMs: number;
    newLimit: number;
  }): Promise<{
    overdue: QueueFlashcardWithState[];
    dueToday: QueueFlashcardWithState[];
    new: QueueFlashcardWithState[];
    newLimitReached: boolean;
    dueIn7Days: DueIn7DaysItem[];
  }> {
    try {
      const nowDate = new Date(params.now);
      const horizonCutoff = new Date(params.now + params.horizonMs);
      const dueIn7DaysCutoff = new Date(params.now + params.dueIn7DaysMs);
      const stateJoin = and(
        eq(flashcardState.flashcardId, flashcard.id),
        eq(flashcardState.userId, params.userId)
      );
      const flashcardCols = {
        back: flashcard.back,
        createdAt: flashcard.createdAt,
        flashcardId: flashcard.id,
        front: flashcard.front,
        hint: flashcard.hint,
      };

      const overdue = this.dbInstance
        .select({
          ...flashcardCols,
          state: flashcardState,
        })
        .from(flashcard)
        .innerJoin(flashcardState, stateJoin)
        .where(
          and(
            eq(flashcard.studySetId, params.studySetId),
            sql`${flashcardState.state} != 'New'`,
            lt(flashcardState.due, nowDate)
          )
        )
        .orderBy(asc(flashcardState.due))
        .limit(FLASHCARD_SESSION_QUEUE_BUCKET_LIMIT)
        .all();

      const dueToday = this.dbInstance
        .select({
          ...flashcardCols,
          state: flashcardState,
        })
        .from(flashcard)
        .innerJoin(flashcardState, stateJoin)
        .where(
          and(
            eq(flashcard.studySetId, params.studySetId),
            sql`${flashcardState.state} != 'New'`,
            gte(flashcardState.due, nowDate),
            lt(flashcardState.due, horizonCutoff)
          )
        )
        .orderBy(asc(flashcardState.due))
        .limit(FLASHCARD_SESSION_QUEUE_BUCKET_LIMIT)
        .all();

      const newRows = this.dbInstance
        .select({
          ...flashcardCols,
          state: flashcardState,
        })
        .from(flashcard)
        .leftJoin(flashcardState, stateJoin)
        .where(
          and(
            eq(flashcard.studySetId, params.studySetId),
            sql`(${flashcardState.userId} IS NULL OR ${flashcardState.state} = 'New')`
          )
        )
        .orderBy(asc(flashcard.createdAt))
        .limit(params.newLimit)
        .all();

      const newCountRow = this.dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(flashcard)
        .leftJoin(flashcardState, stateJoin)
        .where(
          and(
            eq(flashcard.studySetId, params.studySetId),
            sql`(${flashcardState.userId} IS NULL OR ${flashcardState.state} = 'New')`
          )
        )
        .all();
      const newLimitReached = (newCountRow[0]?.count ?? 0) > params.newLimit;

      const dueIn7DaysDayExpr = sql<string>`strftime('%Y-%m-%d', ${flashcardState.due} / 1000, 'unixepoch')`;
      const dueIn7DaysGrouped = this.dbInstance
        .select({
          count: sql<number>`count(*)`,
          day: dueIn7DaysDayExpr,
        })
        .from(flashcard)
        .innerJoin(flashcardState, stateJoin)
        .where(
          and(
            eq(flashcard.studySetId, params.studySetId),
            sql`${flashcardState.state} != 'New'`,
            gte(flashcardState.due, horizonCutoff),
            lt(flashcardState.due, dueIn7DaysCutoff)
          )
        )
        .groupBy(dueIn7DaysDayExpr)
        .orderBy(dueIn7DaysDayExpr)
        .limit(7)
        .all();

      const dueIn7Days = fillDueIn7Days(params.now, dueIn7DaysGrouped);

      return {
        dueIn7Days,
        dueToday: dueToday,
        new: newRows,
        newLimitReached,
        overdue: overdue,
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

  async countIntroducedToday(
    userId: string,
    studySetId: string,
    since: Date
  ): Promise<number> {
    try {
      const [result] = await this.dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(flashcardState)
        .innerJoin(flashcard, eq(flashcardState.flashcardId, flashcard.id))
        .where(
          and(
            eq(flashcardState.userId, userId),
            eq(flashcard.studySetId, studySetId),
            gte(flashcardState.introducedAt, since)
          )
        );
      return result?.count ?? 0;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findStateByKey(
    userId: string,
    flashcardId: string
  ): Promise<FlashcardCardState | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(flashcardState)
        .where(
          and(
            eq(flashcardState.userId, userId),
            eq(flashcardState.flashcardId, flashcardId)
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

  async listReviewsByStudySet(params: {
    studySetId: string;
    userId: string;
    limit: number;
  }): Promise<FlashcardSessionReviewWithFront[]> {
    try {
      const sessionIds = this.dbInstance
        .select({ id: flashcardSession.id })
        .from(flashcardSession)
        .where(
          and(
            eq(flashcardSession.studySetId, params.studySetId),
            eq(flashcardSession.userId, params.userId)
          )
        );

      const rows = await this.dbInstance
        .select({
          flashcardId: flashcardSessionReview.flashcardId,
          front: flashcard.front,
          id: flashcardSessionReview.id,
          preDifficulty: flashcardSessionReview.preDifficulty,
          preDue: flashcardSessionReview.preDue,
          preLapses: flashcardSessionReview.preLapses,
          preLastReview: flashcardSessionReview.preLastReview,
          preLearningSteps: flashcardSessionReview.preLearningSteps,
          preReps: flashcardSessionReview.preReps,
          preScheduledDays: flashcardSessionReview.preScheduledDays,
          preStability: flashcardSessionReview.preStability,
          preState: flashcardSessionReview.preState,
          rating: flashcardSessionReview.rating,
          reviewedAt: flashcardSessionReview.reviewedAt,
          sessionId: flashcardSessionReview.sessionId,
        })
        .from(flashcardSessionReview)
        .innerJoin(
          flashcard,
          eq(flashcardSessionReview.flashcardId, flashcard.id)
        )
        .where(inArray(flashcardSessionReview.sessionId, sessionIds))
        .orderBy(desc(flashcardSessionReview.reviewedAt))
        .limit(params.limit);
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

  // oxlint-disable-next-line require-await
  async insertReviewWithState(params: {
    review: Omit<FlashcardSessionReview, "id">;
    state: FlashcardCardState;
  }): Promise<{
    review: FlashcardSessionReview;
    state: FlashcardCardState;
  }> {
    try {
      return this.dbInstance.transaction((tx) => {
        const [insertedReview] = tx
          .insert(flashcardSessionReview)
          .values({
            id: generateId(FLASHCARD_SESSION_REVIEW_ID_PREFIX),
            ...params.review,
          })
          .returning()
          .all();
        if (!insertedReview) {
          throw new Error("Failed to insert flashcard session review");
        }
        const [insertedState] = tx
          .insert(flashcardState)
          .values(params.state)
          .onConflictDoUpdate({
            set: {
              difficulty: params.state.difficulty,
              due: params.state.due,
              elapsedDays: params.state.elapsedDays,
              introducedAt: sql`COALESCE(introduced_at, excluded.introduced_at)`,
              lapses: params.state.lapses,
              lastReview: params.state.lastReview,
              learningSteps: params.state.learningSteps,
              reps: params.state.reps,
              scheduledDays: params.state.scheduledDays,
              stability: params.state.stability,
              state: params.state.state,
              updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
            },
            target: [flashcardState.userId, flashcardState.flashcardId],
          })
          .returning()
          .all();
        if (!insertedState) {
          throw new Error("Failed to upsert flashcard state");
        }
        return { review: insertedReview, state: insertedState };
      });
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      if (isForeignKeyError(error)) {
        throw new ORPCError("NOT_FOUND", {
          message: "Referenced flashcard or session no longer exists",
        });
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }
}
