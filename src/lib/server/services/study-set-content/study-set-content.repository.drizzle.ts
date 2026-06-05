import { ORPCError } from '@orpc/server';
import { and, eq, inArray } from 'drizzle-orm';
import { db as defaultDb, type DB } from '../../infras/db/client.ts';
import { chapter } from '../../infras/db/schema/chapter.ts';
import {
	studySetContent,
	studySetContentToChapter
} from '../../infras/db/schema/study-set-content.ts';
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
		try {
			const [created] = await this.dbInstance.insert(studySetContent).values(row).returning();
			if (!created)
				throw new ORPCError('INTERNAL_SERVER_ERROR', {
					message: 'Internal server error'
				});
			return created;
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	async updateContent(
		id: string,
		studySetId: string,
		patch: StudySetContentUpdatePatch
	): Promise<StudySetContent | null> {
		try {
			const [updated] = await this.dbInstance
				.update(studySetContent)
				.set(patch)
				.where(and(eq(studySetContent.id, id), eq(studySetContent.studySetId, studySetId)))
				.returning();
			return updated ?? null;
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	async deleteContent(id: string, studySetId: string): Promise<boolean> {
		try {
			const deleted = await this.dbInstance
				.delete(studySetContent)
				.where(and(eq(studySetContent.id, id), eq(studySetContent.studySetId, studySetId)))
				.returning({ id: studySetContent.id });
			return deleted.length > 0;
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	async findContentById(id: string): Promise<StudySetContent | null> {
		try {
			const [row] = await this.dbInstance
				.select()
				.from(studySetContent)
				.where(eq(studySetContent.id, id))
				.limit(1);
			return row ?? null;
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	async findContentByIdWithChapters(id: string): Promise<StudySetContentWithChapters | null> {
		try {
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
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	async findContentsByStudySet(studySetId: string): Promise<StudySetContentWithChapters[]> {
		try {
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
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	async findContentsByChapter(chapterId: string): Promise<StudySetContentWithChapters[]> {
		try {
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
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
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
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			return null;
		}
	}

	async unlinkChapter(contentId: string, chapterId: string): Promise<boolean> {
		try {
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
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	setChapters(contentId: string, chapterIds: string[]): Promise<void> {
		try {
			this.dbInstance.transaction((tx) => {
				tx.delete(studySetContentToChapter)
					.where(eq(studySetContentToChapter.contentId, contentId))
					.run();

				if (chapterIds.length > 0) {
					tx.insert(studySetContentToChapter)
						.values(chapterIds.map((chapterId) => ({ contentId, chapterId })))
						.run();
				}
			});
			return Promise.resolve();
		} catch (err) {
			if (err instanceof ORPCError) return Promise.reject(err);
			return Promise.reject(
				new ORPCError('INTERNAL_SERVER_ERROR', {
					message: 'Internal server error'
				})
			);
		}
	}

	async findChapterById(chapterId: string): Promise<{ id: string; studySetId: string } | null> {
		try {
			const [row] = await this.dbInstance
				.select({ id: chapter.id, studySetId: chapter.studySetId })
				.from(chapter)
				.where(eq(chapter.id, chapterId))
				.limit(1);
			return row ?? null;
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
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
