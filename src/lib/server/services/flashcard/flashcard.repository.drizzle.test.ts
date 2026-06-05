import { chapter } from '$lib/server/infras/db/schema/chapter';
import { flashcard } from '$lib/server/infras/db/schema/flashcard';
import { studySet } from '$lib/server/infras/db/schema/study-set';
import { eq } from 'drizzle-orm';
import { describe, it } from 'vitest';
import { FlashcardTestEnv } from './flashcard.testing';

describe.concurrent('FlashcardDrizzleRepository', () => {
	describe('insertFlashcards', () => {
		it('persists every row and returns them in input order with timestamps', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			const before = Date.now();
			const rows = [
				{
					id: 'card-1',
					chapterId: null,
					studySetId: env.studySetId,
					front: 'F1',
					back: 'B1',
					hint: 'h1',
					importance: 5,
					ownerId: env.ownerId
				},
				{
					id: 'card-2',
					chapterId: null,
					studySetId: env.studySetId,
					front: 'F2',
					back: 'B2',
					hint: null,
					importance: 0,
					ownerId: env.ownerId
				}
			];
			const inserted = await env.repo.insertFlashcards(rows);
			const after = Date.now();
			expect(inserted).toHaveLength(2);
			expect(inserted.map((r) => r.id)).toEqual(['card-1', 'card-2']);
			for (const row of inserted) {
				expect(row.createdAt.getTime()).toBeGreaterThanOrEqual(before);
				expect(row.createdAt.getTime()).toBeLessThanOrEqual(after);
				expect(row.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
				expect(row.updatedAt.getTime()).toBeLessThanOrEqual(after);
			}
		});

		it('returns an empty array when given no rows', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			expect(await env.repo.insertFlashcards([])).toEqual([]);
		});
	});

	describe('updateFlashcard', () => {
		it('updates fields when id and ownerId match', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			const created = await env.seedFlashcard({ id: 'card-1', ownerId: env.ownerId });
			const updated = await env.repo.updateFlashcard('card-1', env.ownerId, {
				front: 'NEW',
				importance: 10
			});
			expect(updated).not.toBeNull();
			expect(updated).toHaveProperty('front', 'NEW');
			expect(updated).toHaveProperty('importance', 10);
			expect(updated).toHaveProperty('createdAt', created.createdAt);
		});

		it('returns null when the id does not exist', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			expect(await env.repo.updateFlashcard('missing', env.ownerId, { front: 'X' })).toBeNull();
		});

		it('returns null when ownerId does not match', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			await env.seedFlashcard({ id: 'card-1', ownerId: env.ownerId, front: 'Original' });
			const result = await env.repo.updateFlashcard('card-1', env.otherId, { front: 'Hacked' });
			expect(result).toBeNull();
			const [row] = env.db.select().from(flashcard).where(eq(flashcard.id, 'card-1')).all();
			expect(row?.front).toBe('Original');
		});

		it('clears hint when set to null', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			await env.seedFlashcard({ id: 'card-1', ownerId: env.ownerId, hint: 'old' });
			const updated = await env.repo.updateFlashcard('card-1', env.ownerId, { hint: null });
			expect(updated?.hint).toBeNull();
		});
	});

	describe('deleteFlashcards', () => {
		it('deletes every id when all are owned by the caller', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			await env.seedFlashcard({ id: 'a', ownerId: env.ownerId });
			await env.seedFlashcard({ id: 'b', ownerId: env.ownerId });
			const ok = await env.repo.deleteFlashcards(['a', 'b'], env.ownerId);
			expect(ok).toBe(true);
			expect(env.db.select().from(flashcard).all()).toHaveLength(0);
		});

		it('returns false when at least one id is not owned (all-or-nothing)', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			await env.seedOtherStudySet();
			await env.seedFlashcard({ id: 'a', ownerId: env.ownerId });
			await env.seedFlashcard({ id: 'b', ownerId: env.otherId });
			const ok = await env.repo.deleteFlashcards(['a', 'b'], env.ownerId);
			expect(ok).toBe(false);
			expect(env.db.select().from(flashcard).all()).toHaveLength(2);
		});

		it('returns false for an empty id list', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			expect(await env.repo.deleteFlashcards([], env.ownerId)).toBe(false);
		});
	});

	describe('findFlashcardById', () => {
		it('returns the row when it exists', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			await env.seedFlashcard({ id: 'card-1', front: 'F' });
			const result = await env.repo.findFlashcardById('card-1');
			expect(result?.id).toBe('card-1');
			expect(result?.front).toBe('F');
		});

		it('returns null when the id does not exist', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			expect(await env.repo.findFlashcardById('missing')).toBeNull();
		});
	});

	describe('findFlashcardsByIds', () => {
		it('returns the requested rows', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			await env.seedFlashcard({ id: 'a' });
			await env.seedFlashcard({ id: 'b' });
			await env.seedFlashcard({ id: 'c' });
			const result = await env.repo.findFlashcardsByIds(['a', 'c']);
			expect(result.map((r) => r.id).toSorted()).toEqual(['a', 'c']);
		});

		it('returns an empty array for an empty list', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			expect(await env.repo.findFlashcardsByIds([])).toEqual([]);
		});
	});

	describe('findFlashcardsByStudySet', () => {
		it('returns cards in the given study set ordered by createdAt desc', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			const a = await env.seedFlashcard({ id: 'a' });
			await new Promise((r) => setTimeout(r, 5));
			const b = await env.seedFlashcard({ id: 'b' });
			const result = await env.repo.findFlashcardsByStudySet(env.studySetId);
			expect(result.map((r) => r.id)).toEqual([b.id, a.id]);
		});

		it('does not return cards from a different study set', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			await env.seedOtherStudySet();
			await env.seedFlashcard({ id: 'a' });
			await env.seedFlashcard({ id: 'b', studySetId: env.otherStudySetId });
			const result = await env.repo.findFlashcardsByStudySet(env.studySetId);
			expect(result.map((r) => r.id)).toEqual(['a']);
		});

		it('returns an empty array when there are no cards', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			expect(await env.repo.findFlashcardsByStudySet(env.studySetId)).toEqual([]);
		});
	});

	describe('findChapter', () => {
		it('returns a minimal chapter reference when the chapter exists', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			const id = env.seedChapter();
			const result = await env.repo.findChapter(id);
			expect(result).toEqual({ id, studySetId: env.studySetId, ownerId: env.ownerId });
		});

		it('returns null when the chapter does not exist', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			expect(await env.repo.findChapter('missing')).toBeNull();
		});
	});
});

describe.concurrent('FlashcardDrizzleRepository (schema constraints)', () => {
	describe('foreign keys', () => {
		it('rejects inserting a flashcard for a non-existent study set', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			const insertOrphan = async () =>
				env.repo.insertFlashcards([
					{
						id: 'orphan',
						chapterId: null,
						studySetId: 'missing-set',
						front: 'F',
						back: 'B',
						hint: null,
						importance: 0,
						ownerId: env.ownerId
					}
				]);
			await expect(insertOrphan()).rejects.toThrow();
		});

		it('rejects inserting a flashcard for a non-existent owner', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			const insertOrphan = async () =>
				env.repo.insertFlashcards([
					{
						id: 'orphan',
						chapterId: null,
						studySetId: env.studySetId,
						front: 'F',
						back: 'B',
						hint: null,
						importance: 0,
						ownerId: 'missing-user'
					}
				]);
			await expect(insertOrphan()).rejects.toThrow();
		});

		it('rejects inserting a flashcard for a non-existent chapter', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			const insertOrphan = async () =>
				env.repo.insertFlashcards([
					{
						id: 'orphan',
						chapterId: 'missing-chapter',
						studySetId: env.studySetId,
						front: 'F',
						back: 'B',
						hint: null,
						importance: 0,
						ownerId: env.ownerId
					}
				]);
			await expect(insertOrphan()).rejects.toThrow();
		});
	});

	describe('importance default', () => {
		it('persists importance=0 when not provided', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			const [row] = env.db.select().from(flashcard).where(eq(flashcard.id, 'card-1')).all();
			expect(row).toBeUndefined();
			await env.repo.insertFlashcards([
				{
					id: 'card-1',
					chapterId: null,
					studySetId: env.studySetId,
					front: 'F',
					back: 'B',
					hint: null,
					importance: 0,
					ownerId: env.ownerId
				}
			]);
			const [persisted] = env.db.select().from(flashcard).where(eq(flashcard.id, 'card-1')).all();
			expect(persisted?.importance).toBe(0);
		});
	});

	describe('cascade behavior', () => {
		it('cascades deletion when the parent study set is deleted', async ({ expect }) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			await env.seedFlashcard({ id: 'a' });
			await env.seedFlashcard({ id: 'b' });
			expect(env.db.select().from(flashcard).all()).toHaveLength(2);

			env.db.delete(studySet).where(eq(studySet.id, env.studySetId)).run();

			expect(env.db.select().from(flashcard).all()).toHaveLength(0);
		});

		it('sets chapterId to null when the parent chapter is deleted (onDelete: set null)', async ({
			expect
		}) => {
			await using env = new FlashcardTestEnv();
			await env.seedOwnedStudySet();
			const chapterId = env.seedChapter();
			await env.seedFlashcard({ id: 'a', chapterId });
			env.db.delete(chapter).where(eq(chapter.id, chapterId)).run();
			const [row] = env.db.select().from(flashcard).where(eq(flashcard.id, 'a')).all();
			expect(row?.chapterId).toBeNull();
		});
	});
});
