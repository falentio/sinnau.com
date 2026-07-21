import {
  STUDY_SET_PAGE_LIMIT,
  STUDY_SET_VISIT_ID_PREFIX,
} from "$lib/schemas/study-set.constant";
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
    row: Omit<
      StudySet,
      "createdAt" | "updatedAt" | "deletedAt" | "isAiGenerated"
    >
  ): Promise<StudySet> {
    const [created] = await this.dbInstance
      .insert(studySet)
      .values(row)
      .returning();
    if (!created) {
      throw new Error("Failed to insert study set");
    }
    return created;
  }

  async updateStudySet(
    id: string,
    ownerId: string,
    patch: StudySetUpdatePatch
  ): Promise<StudySet | null> {
    const [updated] = await this.dbInstance
      .update(studySet)
      .set(patch)
      .where(and(eq(studySet.id, id), eq(studySet.ownerId, ownerId)))
      .returning();
    return updated ?? null;
  }

  async deleteStudySet(id: string, ownerId: string): Promise<StudySet | null> {
    const [updated] = await this.dbInstance
      .update(studySet)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(studySet.id, id),
          eq(studySet.ownerId, ownerId),
          sql`${studySet.deletedAt} IS NULL`
        )
      )
      .returning();
    return updated ?? null;
  }

  async restoreStudySet(id: string, ownerId: string): Promise<StudySet | null> {
    const [updated] = await this.dbInstance
      .update(studySet)
      .set({ deletedAt: null })
      .where(
        and(
          eq(studySet.id, id),
          eq(studySet.ownerId, ownerId),
          sql`${studySet.deletedAt} IS NOT NULL`
        )
      )
      .returning();
    return updated ?? null;
  }

  async hasUserVisitedStudySet(
    userId: string,
    studySetId: string
  ): Promise<boolean> {
    const [row] = await this.dbInstance
      .select({ id: studySetVisit.id })
      .from(studySetVisit)
      .where(
        and(
          eq(studySetVisit.userId, userId),
          eq(studySetVisit.studySetId, studySetId)
        )
      )
      .limit(1);
    return row !== undefined;
  }

  async findStudySetById(id: string): Promise<StudySet | null> {
    const [row] = await this.dbInstance
      .select()
      .from(studySet)
      .where(eq(studySet.id, id))
      .limit(1);
    return row ?? null;
  }

  async findStudySetBySlug(slug: string): Promise<StudySet | null> {
    const [row] = await this.dbInstance
      .select()
      .from(studySet)
      .where(sql`lower(${studySet.slug}) = lower(${slug})`)
      .limit(1);
    return row ?? null;
  }

  async findOwnedStudySets(
    ownerId: string,
    orderBy: "createdAt" | "updatedAt",
    orderDirection: "asc" | "desc",
    page: number
  ): Promise<StudySetListResult> {
    const direction = orderDirection === "asc" ? asc : desc;
    const orderColumn =
      orderBy === "updatedAt" ? studySet.updatedAt : studySet.createdAt;

    const offset = (page - 1) * STUDY_SET_PAGE_LIMIT;

    const [rows, totalRow] = await Promise.all([
      this.dbInstance
        .select()
        .from(studySet)
        .where(
          and(eq(studySet.ownerId, ownerId), sql`${studySet.deletedAt} IS NULL`)
        )
        .orderBy(direction(orderColumn))
        .limit(STUDY_SET_PAGE_LIMIT)
        .offset(offset),
      this.dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(studySet)
        .where(
          and(eq(studySet.ownerId, ownerId), sql`${studySet.deletedAt} IS NULL`)
        ),
    ]);

    const total = totalRow[0]?.count ?? 0;
    return {
      data: rows,
      pagination: {
        limit: STUDY_SET_PAGE_LIMIT,
        page,
        total,
        totalPages: Math.max(1, Math.ceil(total / STUDY_SET_PAGE_LIMIT)),
      },
    };
  }

  async findOwnedStudySetsByVisit(
    userId: string,
    orderDirection: "asc" | "desc",
    page: number
  ): Promise<StudySetListResult> {
    const direction = orderDirection === "asc" ? asc : desc;
    const offset = (page - 1) * STUDY_SET_PAGE_LIMIT;

    const baseConditions = and(
      eq(studySet.ownerId, userId),
      sql`${studySet.deletedAt} IS NULL`,
      eq(studySetVisit.userId, userId)
    );

    const columns = {
      createdAt: studySet.createdAt,
      deletedAt: studySet.deletedAt,
      description: studySet.description,
      files: studySet.files,
      id: studySet.id,
      isAiGenerated: studySet.isAiGenerated,
      ownerId: studySet.ownerId,
      slug: studySet.slug,
      title: studySet.title,
      updatedAt: studySet.updatedAt,
      visibility: studySet.visibility,
    };

    const [rows, totalRow] = await Promise.all([
      this.dbInstance
        .select(columns)
        .from(studySet)
        .innerJoin(studySetVisit, eq(studySetVisit.studySetId, studySet.id))
        .where(baseConditions)
        .orderBy(direction(studySetVisit.visitedAt))
        .limit(STUDY_SET_PAGE_LIMIT)
        .offset(offset),
      this.dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(studySet)
        .innerJoin(studySetVisit, eq(studySetVisit.studySetId, studySet.id))
        .where(baseConditions),
    ]);

    const total = totalRow[0]?.count ?? 0;
    return {
      data: rows,
      pagination: {
        limit: STUDY_SET_PAGE_LIMIT,
        page,
        total,
        totalPages: Math.max(1, Math.ceil(total / STUDY_SET_PAGE_LIMIT)),
      },
    };
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    const [row] = await this.dbInstance
      .select({ id: studySet.id })
      .from(studySet)
      .where(sql`lower(${studySet.slug}) = lower(${slug})`)
      .limit(1);
    return row !== undefined;
  }

  async upsertVisit(
    userId: string,
    studySetId: string,
    visitedAt: number
  ): Promise<StudySetVisit> {
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
      throw new Error("Failed to upsert study set visit");
    }
    return row;
  }

  async deleteOldVisits(cutoffMs: number): Promise<number> {
    const deleted = await this.dbInstance
      .delete(studySetVisit)
      .where(lt(studySetVisit.visitedAt, new Date(cutoffMs)))
      .returning({ id: studySetVisit.id });
    return deleted.length;
  }

  async findRecentVisits(userId: string, count: number): Promise<StudySet[]> {
    const rows = await this.dbInstance
      .select({
        createdAt: studySet.createdAt,
        deletedAt: studySet.deletedAt,
        description: studySet.description,
        files: studySet.files,
        id: studySet.id,
        isAiGenerated: studySet.isAiGenerated,
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
          sql`(
            (${studySet.deletedAt} IS NULL AND (${studySet.visibility} = 'PUBLIC' OR ${studySet.ownerId} = ${userId}))
            OR ${studySet.deletedAt} IS NOT NULL
          )`
        )
      )
      .orderBy(desc(studySetVisit.visitedAt))
      .limit(count);
    return rows;
  }
}
