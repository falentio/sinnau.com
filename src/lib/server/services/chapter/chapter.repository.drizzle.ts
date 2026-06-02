import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db as defaultDb, type DB } from '../../infras/db/client.ts';
import { chapter } from '../../infras/db/schema/chapter.ts';
import { flashcard } from '../../infras/db/schema/flashcard.ts';
import { studySet } from '../../infras/db/schema/study-set.ts';
import type { Chapter } from '../../infras/db/schema/chapter.ts';
import type { ChapterRepository, ChapterUpdatePatch } from './chapter.repository.ts';

export class ChapterDrizzleRepository implements ChapterRepository {
	constructor(private readonly dbInstance: DB = defaultDb) {}

	static withDatabase(db: DB): ChapterDrizzleRepository {
		return new ChapterDrizzleRepository(db);
	}

	async insertChapter(row: Omit<Chapter, 'createdAt' | 'updatedAt'>): Promise<Chapter> {
		const [created] = await this.dbInstance.insert(chapter).values(row).returning();
		if (!created) throw new Error('Failed to insert chapter');
		return created;
	}

	async updateChapter(
		id: string,
		ownerId: string,
		patch: ChapterUpdatePatch
	): Promise<Chapter | null> {
		const [updated] = await this.dbInstance
			.update(chapter)
			.set(patch)
			.where(and(eq(chapter.id, id), eq(chapter.ownerId, ownerId)))
			.returning();
		return updated ?? null;
	}

	async deleteChapter(id: string, ownerId: string): Promise<boolean> {
		const deleted = await this.dbInstance
			.delete(chapter)
			.where(and(eq(chapter.id, id), eq(chapter.ownerId, ownerId)))
			.returning({ id: chapter.id });
		return deleted.length > 0;
	}

	async findChapterById(id: string): Promise<Chapter | null> {
		const [row] = await this.dbInstance.select().from(chapter).where(eq(chapter.id, id)).limit(1);
		return row ?? null;
	}

	async findChaptersVisibleTo(userId: string): Promise<Chapter[]> {
		return this.dbInstance
			.select({
				id: chapter.id,
				slug: chapter.slug,
				title: chapter.title,
				description: chapter.description,
				studySetId: chapter.studySetId,
				ownerId: chapter.ownerId,
				createdAt: chapter.createdAt,
				updatedAt: chapter.updatedAt
			})
			.from(chapter)
			.innerJoin(studySet, eq(chapter.studySetId, studySet.id))
			.where(or(eq(studySet.ownerId, userId), eq(studySet.visibility, 'PUBLIC')))
			.orderBy(desc(chapter.createdAt));
	}

	async isSlugTakenInStudySet(studySetId: string, slug: string): Promise<boolean> {
		const [row] = await this.dbInstance
			.select({ id: chapter.id })
			.from(chapter)
			.where(and(sql`lower(${chapter.slug}) = lower(${slug})`, eq(chapter.studySetId, studySetId)))
			.limit(1);
		return row !== undefined;
	}

	async countChildren(chapterId: string): Promise<number> {
		const [row] = await this.dbInstance
			.select({ count: sql<number>`count(*)` })
			.from(flashcard)
			.where(eq(flashcard.chapterId, chapterId));
		return Number(row?.count ?? 0);
	}
}
