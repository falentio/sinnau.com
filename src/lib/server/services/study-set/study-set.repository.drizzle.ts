import { and, asc, desc, eq, lt, sql } from 'drizzle-orm';
import { db as defaultDb, type DB } from '../../infras/db/client.ts';
import { studySet, studySetVisit } from '../../infras/db/schema/study-set.ts';
import type { StudySet, StudySetVisit } from '../../infras/db/schema/study-set.ts';
import { STUDY_SET_PAGE_LIMIT } from './study-set.constant.ts';
import type {
	StudySetListResult,
	StudySetRepository,
	StudySetUpdatePatch
} from './study-set.repository.ts';

export class StudySetDrizzleRepository implements StudySetRepository {
	constructor(private readonly dbInstance: DB = defaultDb) {}

	static withDatabase(db: DB): StudySetDrizzleRepository {
		return new StudySetDrizzleRepository(db);
	}

	async insertStudySet(row: Omit<StudySet, 'createdAt' | 'updatedAt'>): Promise<StudySet> {
		const [created] = await this.dbInstance.insert(studySet).values(row).returning();
		if (!created) throw new Error('Failed to insert study set');
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

	async deleteStudySet(id: string, ownerId: string): Promise<boolean> {
		const deleted = await this.dbInstance
			.delete(studySet)
			.where(and(eq(studySet.id, id), eq(studySet.ownerId, ownerId)))
			.returning({ id: studySet.id });
		return deleted.length > 0;
	}

	async findStudySetById(id: string): Promise<StudySet | null> {
		const [row] = await this.dbInstance.select().from(studySet).where(eq(studySet.id, id)).limit(1);
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
		orderBy: 'createdAt' | 'updatedAt',
		orderDirection: 'asc' | 'desc',
		page: number
	): Promise<StudySetListResult> {
		const direction = orderDirection === 'asc' ? asc : desc;
		const orderColumn = orderBy === 'updatedAt' ? studySet.updatedAt : studySet.createdAt;

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
				.where(eq(studySet.ownerId, ownerId))
		]);

		const total = Number(totalRow[0]?.count ?? 0);
		return {
			data: rows,
			pagination: {
				page,
				limit: STUDY_SET_PAGE_LIMIT,
				total,
				totalPages: Math.max(1, Math.ceil(total / STUDY_SET_PAGE_LIMIT))
			}
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

	async upsertVisit(userId: string, studySetId: string, visitedAt: number): Promise<StudySetVisit> {
		const [row] = await this.dbInstance
			.insert(studySetVisit)
			.values({
				id: crypto.randomUUID(),
				userId,
				studySetId,
				visitedAt: new Date(visitedAt)
			})
			.onConflictDoUpdate({
				target: [studySetVisit.userId, studySetVisit.studySetId],
				set: { visitedAt: new Date(visitedAt) }
			})
			.returning();
		if (!row) throw new Error('Failed to upsert study set visit');
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
				id: studySet.id,
				slug: studySet.slug,
				title: studySet.title,
				description: studySet.description,
				visibility: studySet.visibility,
				ownerId: studySet.ownerId,
				files: studySet.files,
				createdAt: studySet.createdAt,
				updatedAt: studySet.updatedAt
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
	}
}
