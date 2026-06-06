import {
  STUDY_SET_PAGE_LIMIT,
  STUDY_SET_VISIT_ID_PREFIX,
} from "$lib/schemas/study-set.constant";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";

import { db as defaultDb } from "../../infras/db/client.ts";
import type { DB } from "../../infras/db/client.ts";
import { studySet, studySetVisit } from "../../infras/db/schema/study-set.ts";
import type {
  StudySet,
  StudySetVisit,
} from "../../infras/db/schema/study-set.ts";
import { generateId } from "../../utils/nanoid.ts";
import type {
  StudySetListResult,
  StudySetRepository,
  StudySetUpdatePatch,
} from "./study-set.repository.ts";

export class StudySetDrizzleRepository implements StudySetRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): StudySetDrizzleRepository {
    return new StudySetDrizzleRepository(db);
  }

  async insertStudySet(
    row: Omit<StudySet, "createdAt" | "updatedAt">
  ): Promise<StudySet> {
    try {
      const [created] = await this.dbInstance
        .insert(studySet)
        .values(row)
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

  async updateStudySet(
    id: string,
    ownerId: string,
    patch: StudySetUpdatePatch
  ): Promise<StudySet | null> {
    try {
      const [updated] = await this.dbInstance
        .update(studySet)
        .set(patch)
        .where(and(eq(studySet.id, id), eq(studySet.ownerId, ownerId)))
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

  async deleteStudySet(id: string, ownerId: string): Promise<boolean> {
    try {
      const deleted = await this.dbInstance
        .delete(studySet)
        .where(and(eq(studySet.id, id), eq(studySet.ownerId, ownerId)))
        .returning({ id: studySet.id });
      return deleted.length > 0;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findStudySetById(id: string): Promise<StudySet | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(studySet)
        .where(eq(studySet.id, id))
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

  async findStudySetBySlug(slug: string): Promise<StudySet | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(studySet)
        .where(sql`lower(${studySet.slug}) = lower(${slug})`)
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

  async findOwnedStudySets(
    ownerId: string,
    orderBy: "createdAt" | "updatedAt",
    orderDirection: "asc" | "desc",
    page: number
  ): Promise<StudySetListResult> {
    try {
      const direction = orderDirection === "asc" ? asc : desc;
      const orderColumn =
        orderBy === "updatedAt" ? studySet.updatedAt : studySet.createdAt;

      const offset = (page - 1) * STUDY_SET_PAGE_LIMIT;

      const [rows, totalRow] = await Promise.all([
        this.dbInstance
          .select()
          .from(studySet)
          .where(eq(studySet.ownerId, ownerId))
          .orderBy(direction(orderColumn))
          .limit(STUDY_SET_PAGE_LIMIT)
          .offset(offset),
        this.dbInstance
          .select({ count: sql<number>`count(*)` })
          .from(studySet)
          .where(eq(studySet.ownerId, ownerId)),
      ]);

      const total = Number(totalRow[0]?.count ?? 0);
      return {
        data: rows,
        pagination: {
          limit: STUDY_SET_PAGE_LIMIT,
          page,
          total,
          totalPages: Math.max(1, Math.ceil(total / STUDY_SET_PAGE_LIMIT)),
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

  async isSlugTaken(slug: string): Promise<boolean> {
    try {
      const [row] = await this.dbInstance
        .select({ id: studySet.id })
        .from(studySet)
        .where(sql`lower(${studySet.slug}) = lower(${slug})`)
        .limit(1);
      return row !== undefined;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async upsertVisit(
    userId: string,
    studySetId: string,
    visitedAt: number
  ): Promise<StudySetVisit> {
    try {
      const [row] = await this.dbInstance
        .insert(studySetVisit)
        .values({
          id: generateId(STUDY_SET_VISIT_ID_PREFIX),
          studySetId,
          userId,
          visitedAt: new Date(visitedAt),
        })
        .onConflictDoUpdate({
          set: { visitedAt: new Date(visitedAt) },
          target: [studySetVisit.userId, studySetVisit.studySetId],
        })
        .returning();
      if (!row) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Internal server error",
        });
      }
      return row;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async deleteOldVisits(cutoffMs: number): Promise<number> {
    try {
      const deleted = await this.dbInstance
        .delete(studySetVisit)
        .where(lt(studySetVisit.visitedAt, new Date(cutoffMs)))
        .returning({ id: studySetVisit.id });
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

  async findRecentVisits(userId: string, count: number): Promise<StudySet[]> {
    try {
      const rows = await this.dbInstance
        .select({
          createdAt: studySet.createdAt,
          description: studySet.description,
          files: studySet.files,
          id: studySet.id,
          ownerId: studySet.ownerId,
          slug: studySet.slug,
          title: studySet.title,
          updatedAt: studySet.updatedAt,
          visibility: studySet.visibility,
        })
        .from(studySetVisit)
        .innerJoin(studySet, eq(studySetVisit.studySetId, studySet.id))
        .where(
          and(
            eq(studySetVisit.userId, userId),
            sql`(${studySet.visibility} = 'PUBLIC' OR ${studySet.ownerId} = ${userId})`
          )
        )
        .orderBy(desc(studySetVisit.visitedAt))
        .limit(count);
      return rows as StudySet[];
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
