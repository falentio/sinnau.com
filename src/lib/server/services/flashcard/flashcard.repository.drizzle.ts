import { ORPCError } from '@orpc/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db as defaultDb, type DB } from '../../infras/db/client.ts';
import { chapter } from '../../infras/db/schema/chapter.ts';
import { flashcard } from '../../infras/db/schema/flashcard.ts';
import type { Flashcard } from '../../infras/db/schema/flashcard.ts';
import type {
	FlashcardChapterRef,
	FlashcardRepository,
	FlashcardUpdatePatch
} from './flashcard.repository.ts';

export class FlashcardDrizzleRepository implements FlashcardRepository {
	constructor(private readonly dbInstance: DB = defaultDb) {}

	static withDatabase(db: DB): FlashcardDrizzleRepository {
		return new FlashcardDrizzleRepository(db);
	}

	async insertFlashcards(rows: Omit<Flashcard, 'createdAt' | 'updatedAt'>[]): Promise<Flashcard[]> {
		try {
			if (rows.length === 0) return [];
			return await this.dbInstance.insert(flashcard).values(rows).returning();
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	async updateFlashcard(
		id: string,
		ownerId: string,
		patch: FlashcardUpdatePatch
	): Promise<Flashcard | null> {
		try {
			const [updated] = await this.dbInstance
				.update(flashcard)
				.set(patch)
				.where(and(eq(flashcard.id, id), eq(flashcard.ownerId, ownerId)))
				.returning();
			return updated ?? null;
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	async deleteFlashcards(ids: string[], ownerId: string): Promise<boolean> {
		if (ids.length === 0) return Promise.resolve(false);
		try {
			this.dbInstance.transaction((tx) => {
				const deleted = tx
					.delete(flashcard)
					.where(and(inArray(flashcard.id, ids), eq(flashcard.ownerId, ownerId)))
					.returning({ id: flashcard.id })
					.all();
				if (deleted.length !== ids.length) {
					throw new Error('FLASHCARD_DELETE_PARTIAL_FORBIDDEN');
				}
			});
			return true;
		} catch (err) {
			if (err instanceof Error && err.message === 'FLASHCARD_DELETE_PARTIAL_FORBIDDEN') {
				return Promise.resolve(false);
			}
			if (err instanceof ORPCError) return Promise.reject(err);
			return Promise.reject(
				new ORPCError('INTERNAL_SERVER_ERROR', {
					message: 'Internal server error'
				})
			);
		}
	}

	async findFlashcardById(id: string): Promise<Flashcard | null> {
		try {
			const [row] = await this.dbInstance
				.select()
				.from(flashcard)
				.where(eq(flashcard.id, id))
				.limit(1);
			return row ?? null;
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	async findFlashcardsByIds(ids: string[]): Promise<Flashcard[]> {
		try {
			if (ids.length === 0) return [];
			return await this.dbInstance.select().from(flashcard).where(inArray(flashcard.id, ids));
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	async findFlashcardsByStudySet(studySetId: string): Promise<Flashcard[]> {
		try {
			return await this.dbInstance
				.select()
				.from(flashcard)
				.where(eq(flashcard.studySetId, studySetId))
				.orderBy(desc(flashcard.createdAt));
		} catch (err) {
			if (err instanceof ORPCError) throw err;
			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: 'Internal server error'
			});
		}
	}

	async findChapter(chapterId: string): Promise<FlashcardChapterRef | null> {
		try {
			const [row] = await this.dbInstance
				.select({
					id: chapter.id,
					studySetId: chapter.studySetId,
					ownerId: chapter.ownerId
				})
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
}
