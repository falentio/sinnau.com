import { and, eq, inArray } from 'drizzle-orm';
import { db as defaultDb, type DB } from '../../infras/db/client.ts';
import {
	studySetContent,
	studySetContentToChapter
} from '../../infras/db/schema/study-set-content.ts';
import { chapter } from '../../infras/db/schema/chapter.ts';
import type {
	StudySetContent,
	StudySetContentWithChapters
} from '../../infras/db/schema/study-set-content.ts';
import type {
	StudySetContentRepository,
	StudySetContentUpdatePatch
} from './study-set-content.repository.ts';

export class StudySetContentDrizzleRepository implements StudySetContentRepository {
	constructor(private readonly dbInstance: DB = defaultDb) {}

	static withDatabase(db: DB): StudySetContentDrizzleRepository {
		return new StudySetContentDrizzleRepository(db);
	}

	async insertContent(
		row: Omit<StudySetContent, 'createdAt' | 'updatedAt'>
	): Promise<StudySetContent> {
		const [created] = await this.dbInstance.insert(studySetContent).values(row).returning();
		if (!created) throw new Error('Failed to insert study set content');
		return created;
	}

	async updateContent(
		id: string,
		studySetId: string,
		patch: StudySetContentUpdatePatch
	): Promise<StudySetContent | null> {
		const [updated] = await this.dbInstance
			.update(studySetContent)
			.set(patch)
			.where(and(eq(studySetContent.id, id), eq(studySetContent.studySetId, studySetId)))
			.returning();
		return updated ?? null;
	}

	async deleteContent(id: string, studySetId: string): Promise<boolean> {
		const deleted = await this.dbInstance
			.delete(studySetContent)
			.where(and(eq(studySetContent.id, id), eq(studySetContent.studySetId, studySetId)))
			.returning({ id: studySetContent.id });
		return deleted.length > 0;
	}

	async findContentById(id: string): Promise<StudySetContent | null> {
		const [row] = await this.dbInstance
			.select()
			.from(studySetContent)
			.where(eq(studySetContent.id, id))
			.limit(1);
		return row ?? null;
	}

	async findContentByIdWithChapters(id: string): Promise<StudySetContentWithChapters | null> {
		const rows = await this.dbInstance
			.select({
				id: studySetContent.id,
				studySetId: studySetContent.studySetId,
				content: studySetContent.content,
				createdAt: studySetContent.createdAt,
				updatedAt: studySetContent.updatedAt,
				chapterId: studySetContentToChapter.chapterId
			})
			.from(studySetContent)
			.leftJoin(
				studySetContentToChapter,
				eq(studySetContent.id, studySetContentToChapter.contentId)
			)
			.where(eq(studySetContent.id, id));
		if (rows.length === 0) return null;
		return this.buildWithChapters(rows)[0] ?? null;
	}

	async findContentsByStudySet(studySetId: string): Promise<StudySetContentWithChapters[]> {
		const rows = await this.dbInstance
			.select({
				id: studySetContent.id,
				studySetId: studySetContent.studySetId,
				content: studySetContent.content,
				createdAt: studySetContent.createdAt,
				updatedAt: studySetContent.updatedAt,
				chapterId: studySetContentToChapter.chapterId
			})
			.from(studySetContent)
			.leftJoin(
				studySetContentToChapter,
				eq(studySetContent.id, studySetContentToChapter.contentId)
			)
			.where(eq(studySetContent.studySetId, studySetId));
		return this.buildWithChapters(rows);
	}

	async findContentsByChapter(chapterId: string): Promise<StudySetContentWithChapters[]> {
		const junctionRows = await this.dbInstance
			.select({ contentId: studySetContentToChapter.contentId })
			.from(studySetContentToChapter)
			.where(eq(studySetContentToChapter.chapterId, chapterId));

		const contentIds = junctionRows.map((r) => r.contentId);
		if (contentIds.length === 0) return [];

		const rows = await this.dbInstance
			.select({
				id: studySetContent.id,
				studySetId: studySetContent.studySetId,
				content: studySetContent.content,
				createdAt: studySetContent.createdAt,
				updatedAt: studySetContent.updatedAt,
				chapterId: studySetContentToChapter.chapterId
			})
			.from(studySetContent)
			.leftJoin(
				studySetContentToChapter,
				eq(studySetContent.id, studySetContentToChapter.contentId)
			)
			.where(inArray(studySetContent.id, contentIds));

		return this.buildWithChapters(rows);
	}

	async linkChapter(
		contentId: string,
		chapterId: string
	): Promise<{ contentId: string; chapterId: string } | null> {
		try {
			const [linked] = await this.dbInstance
				.insert(studySetContentToChapter)
				.values({ contentId, chapterId })
				.returning();
			return linked ?? null;
		} catch {
			return null;
		}
	}

	async unlinkChapter(contentId: string, chapterId: string): Promise<boolean> {
		const deleted = await this.dbInstance
			.delete(studySetContentToChapter)
			.where(
				and(
					eq(studySetContentToChapter.contentId, contentId),
					eq(studySetContentToChapter.chapterId, chapterId)
				)
			)
			.returning({ contentId: studySetContentToChapter.contentId });
		return deleted.length > 0;
	}

	async setChapters(contentId: string, chapterIds: string[]): Promise<void> {
		await this.dbInstance.transaction(async (tx) => {
			await tx
				.delete(studySetContentToChapter)
				.where(eq(studySetContentToChapter.contentId, contentId));

			if (chapterIds.length > 0) {
				await tx
					.insert(studySetContentToChapter)
					.values(chapterIds.map((chapterId) => ({ contentId, chapterId })));
			}
		});
	}

	async findChapterById(chapterId: string): Promise<{ id: string; studySetId: string } | null> {
		const [row] = await this.dbInstance
			.select({ id: chapter.id, studySetId: chapter.studySetId })
			.from(chapter)
			.where(eq(chapter.id, chapterId))
			.limit(1);
		return row ?? null;
	}

	private buildWithChapters(
		rows: Array<{
			id: string;
			studySetId: string;
			content: string;
			createdAt: Date;
			updatedAt: Date;
			chapterId: string | null;
		}>
	): StudySetContentWithChapters[] {
		const map = new Map<string, StudySetContentWithChapters>();
		for (const row of rows) {
			let entry = map.get(row.id);
			if (!entry) {
				entry = {
					id: row.id,
					studySetId: row.studySetId,
					content: row.content,
					chapterIds: [],
					createdAt: row.createdAt,
					updatedAt: row.updatedAt
				};
				map.set(row.id, entry);
			}
			if (row.chapterId) {
				entry.chapterIds.push(row.chapterId);
			}
		}
		return [...map.values()];
	}
}
