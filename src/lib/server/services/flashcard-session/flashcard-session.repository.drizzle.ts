import { FLASHCARD_SESSION_REVIEW_ID_PREFIX } from "$lib/schemas/flashcard-session.constant";
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
import { generateId } from "../../utils/nanoid.ts";
import type {
  DueIn7DaysItem,
  FlashcardSessionRepository,
  QueueFlashcardWithState,
} from "./flashcard-session.repository.ts";

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

  async listSessionsForUser(userId: string): Promise<FlashcardSession[]> {
    try {
      return this.dbInstance
        .select()
        .from(flashcardSession)
        .where(eq(flashcardSession.userId, userId))
        .orderBy(desc(flashcardSession.updatedAt))
        .all();
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async listSessionsForAdmin(params: {
    userId?: string;
    studySetId?: string;
  }): Promise<FlashcardSession[]> {
    try {
      const filters = [];
      if (params.userId !== undefined) {
        filters.push(eq(flashcardSession.userId, params.userId));
      }
      if (params.studySetId !== undefined) {
        filters.push(eq(flashcardSession.studySetId, params.studySetId));
      }
      return this.dbInstance
        .select()
        .from(flashcardSession)
        .where(and(...filters))
        .orderBy(desc(flashcardSession.updatedAt))
        .all();
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
    id: string;
    studySetId: string;
    userId: string;
  }): Promise<FlashcardSession> {
    try {
      const [inserted] = await this.dbInstance
        .insert(flashcardSession)
        .values(row)
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

  async deleteExpiredSessions(beforeTimestamp: number): Promise<number> {
    try {
      const expired = this.dbInstance
        .select({
          studySetId: flashcardSession.studySetId,
          userId: flashcardSession.userId,
        })
        .from(flashcardSession)
        .where(lt(flashcardSession.updatedAt, new Date(beforeTimestamp)))
        .all();
      if (expired.length === 0) {
        return 0;
      }
      const studySetIds = Array.from(new Set(expired.map((r) => r.studySetId)));
      const userIds = Array.from(new Set(expired.map((r) => r.userId)));
      this.dbInstance
        .delete(flashcardState)
        .where(
          and(
            inArray(flashcardState.userId, userIds),
            inArray(
              flashcardState.flashcardId,
              this.dbInstance
                .select({ id: flashcard.id })
                .from(flashcard)
                .where(inArray(flashcard.studySetId, studySetIds))
            )
          )
        )
        .run();
      const deleted = this.dbInstance
        .delete(flashcardSession)
        .where(lt(flashcardSession.updatedAt, new Date(beforeTimestamp)))
        .returning({ id: flashcardSession.id })
        .all();
      return deleted.length;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findFlashcardsForQueue(params: {
    userId: string;
    studySetId: string;
    now: number;
    horizonMs: number;
    dueIn7DaysMs: number;
  }): Promise<{
    overdue: QueueFlashcardWithState[];
    dueToday: QueueFlashcardWithState[];
    new: QueueFlashcardWithState[];
    dueIn7Days: DueIn7DaysItem[];
  }> {
    try {
      const joined = await this.dbInstance
        .select({
          back: flashcard.back,
          createdAt: flashcard.createdAt,
          flashcardId: flashcard.id,
          front: flashcard.front,
          hint: flashcard.hint,
          state: flashcardState,
        })
        .from(flashcard)
        .leftJoin(
          flashcardState,
          and(
            eq(flashcardState.flashcardId, flashcard.id),
            eq(flashcardState.userId, params.userId)
          )
        )
        .where(eq(flashcard.studySetId, params.studySetId))
        .orderBy(asc(flashcardState.due), asc(flashcard.createdAt));

      const overdue: QueueFlashcardWithState[] = [];
      const dueToday: QueueFlashcardWithState[] = [];
      const newCards: QueueFlashcardWithState[] = [];
      const dueIn7DaysMap = new Map<string, number>();
      const horizonCutoff = params.now + params.horizonMs;
      const dueIn7DaysCutoff = params.now + params.dueIn7DaysMs;

      for (const row of joined) {
        const st = row.state;
        const item: QueueFlashcardWithState = {
          back: row.back ?? "",
          createdAt: row.createdAt,
          flashcardId: row.flashcardId,
          front: row.front ?? "",
          hint: row.hint,
          state: st,
        };
        if (!st || st.state === "New") {
          newCards.push(item);
          continue;
        }
        const dueMs = st.due.getTime();
        if (dueMs < params.now) {
          overdue.push(item);
        } else if (dueMs <= horizonCutoff) {
          dueToday.push(item);
        } else if (dueMs <= dueIn7DaysCutoff) {
          const dateStr = st.due.toISOString().slice(0, 10);
          dueIn7DaysMap.set(dateStr, (dueIn7DaysMap.get(dateStr) ?? 0) + 1);
        }
      }

      const dueIn7DaysResult: DueIn7DaysItem[] = [];
      const nowUtc = new Date(params.now);
      for (let i = 1; i <= 7; i += 1) {
        const d = new Date(
          Date.UTC(
            nowUtc.getUTCFullYear(),
            nowUtc.getUTCMonth(),
            nowUtc.getUTCDate() + i
          )
        );
        const dateStr = d.toISOString().slice(0, 10);
        dueIn7DaysResult.push({
          count: dueIn7DaysMap.get(dateStr) ?? 0,
          date: dateStr,
        });
      }

      return {
        dueIn7Days: dueIn7DaysResult,
        dueToday,
        new: newCards,
        overdue,
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
      const countExpr = sql<number>`cast(count(*) as integer)`;
      const [result] = await this.dbInstance
        .select({ count: countExpr })
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

  async upsertState(row: FlashcardCardState): Promise<FlashcardCardState> {
    try {
      const [created] = await this.dbInstance
        .insert(flashcardState)
        .values(row)
        .onConflictDoUpdate({
          set: {
            difficulty: row.difficulty,
            due: row.due,
            elapsedDays: row.elapsedDays,
            introducedAt: sql`COALESCE(introduced_at, excluded.introduced_at)`,
            lapses: row.lapses,
            lastReview: row.lastReview,
            learningSteps: row.learningSteps,
            reps: row.reps,
            scheduledDays: row.scheduledDays,
            stability: row.stability,
            state: row.state,
          },
          target: [flashcardState.userId, flashcardState.flashcardId],
        })
        .returning();
      if (!created) {
        throw new Error("Failed to upsert flashcard state");
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

  async listReviewsByStudySet(params: {
    studySetId: string;
    userId: string;
    limit: number;
  }): Promise<FlashcardSessionReview[]> {
    try {
      const rows = await this.dbInstance
        .select({
          flashcardId: flashcardSessionReview.flashcardId,
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
          flashcardSession,
          eq(flashcardSessionReview.sessionId, flashcardSession.id)
        )
        .where(
          and(
            eq(flashcardSession.studySetId, params.studySetId),
            eq(flashcardSession.userId, params.userId)
          )
        )
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
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }
}
