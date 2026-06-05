import { STUDY_SET_ID_PREFIX } from '$lib/schemas/study-set';
import { chapter } from '$lib/server/infras/db/schema/chapter';
import { flashcard } from '$lib/server/infras/db/schema/flashcard';
import { studySet } from '$lib/server/infras/db/schema/study-set';
import { generateId } from '$lib/server/utils/nanoid';
import { eq } from 'drizzle-orm';
import { describe, it } from 'vitest';
import { ChapterTestEnv } from './chapter.testing';

describe.concurrent('ChapterDrizzleRepository', () => {
	describe('insertChapter', () => {
		it('persists the row and returns it with timestamps', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const before = Date.now();
			const created = await env.repo.insertChapter({
				id: 'ch-1',
				slug: 'chapter-slug-abc123',
				title: 'My Chapter',
				description: 'A description',
				studySetId: env.studySetId,
				ownerId: env.ownerId
			});
			const after = Date.now();

			expect(created.id).toBe('ch-1');
			expect(created.slug).toBe('chapter-slug-abc123');
			expect(created.title).toBe('My Chapter');
			expect(created.description).toBe('A description');
			expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before);
			expect(created.createdAt.getTime()).toBeLessThanOrEqual(after);
			expect(created.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
			expect(created.updatedAt.getTime()).toBeLessThanOrEqual(after);

			const rows = env.db.select().from(chapter).where(eq(chapter.id, 'ch-1')).all();
			expect(rows).toHaveLength(1);
		});
	});

	describe('updateChapter', () => {
		it('updates fields when id and ownerId match', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const created = await env.seedChapter({
				id: 'ch-1',
				ownerId: env.ownerId,
				title: 'Original'
			});
			const updated = await env.repo.updateChapter('ch-1', env.ownerId, {
				title: 'Renamed',
				description: 'New description'
			});
			expect(updated).not.toBeNull();
			expect(updated).toHaveProperty('title', 'Renamed');
			expect(updated).toHaveProperty('description', 'New description');
			expect(updated).toHaveProperty('createdAt', created.createdAt);
		});

		it('returns null when the id does not exist', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			expect(await env.repo.updateChapter('missing', env.ownerId, { title: 'X' })).toBeNull();
		});

		it('returns null when ownerId does not match', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			await env.seedChapter({ id: 'ch-1', ownerId: env.ownerId, title: 'Original' });
			const result = await env.repo.updateChapter('ch-1', env.otherId, { title: 'Hacked' });
			expect(result).toBeNull();
			const [row] = env.db.select().from(chapter).where(eq(chapter.id, 'ch-1')).all();
			expect(row?.title).toBe('Original');
		});
	});

	describe('deleteChapter', () => {
		it('returns true and removes the row when id and ownerId match', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			await env.seedChapter({ id: 'ch-1', ownerId: env.ownerId });
			const ok = await env.repo.deleteChapter('ch-1', env.ownerId);
			expect(ok).toBe(true);
			expect(env.db.select().from(chapter).where(eq(chapter.id, 'ch-1')).all()).toHaveLength(0);
		});

		it('returns false when the id does not exist', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			expect(await env.repo.deleteChapter('missing', env.ownerId)).toBe(false);
		});

		it('returns false when ownerId does not match', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			await env.seedChapter({ id: 'ch-1', ownerId: env.ownerId });
			expect(await env.repo.deleteChapter('ch-1', env.otherId)).toBe(false);
			expect(env.db.select().from(chapter).where(eq(chapter.id, 'ch-1')).all()).toHaveLength(1);
		});

		it('cascades to flashcards in the chapter', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const created = await env.seedChapter({ id: 'ch-1', ownerId: env.ownerId });
			env.seedFlashcardInChapter(created.id);

			await env.repo.deleteChapter('ch-1', env.ownerId);

			const rows = env.db.select().from(flashcard).where(eq(flashcard.chapterId, created.id)).all();
			expect(rows).toHaveLength(0);
		});
	});

	describe('findChapterById', () => {
		it('returns the row when it exists', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			await env.seedChapter({ id: 'ch-1', ownerId: env.ownerId, title: 'Found' });
			const result = await env.repo.findChapterById('ch-1');
			expect(result?.id).toBe('ch-1');
			expect(result?.title).toBe('Found');
		});

		it('returns null when the id does not exist', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			expect(await env.repo.findChapterById('missing')).toBeNull();
		});
	});

	describe('findChaptersByStudySet', () => {
		it('returns chapters in the given study set that the user owns (private or public)', async ({
			expect
		}) => {
			await using env = new ChapterTestEnv();
			await env.seedChapter({ id: 'public-ch', ownerId: env.ownerId });
			const privateSet = await env.seedStudySet({
				id: env.studySetId + '-private',
				slug: 'private-set',
				ownerId: env.ownerId,
				visibility: 'PRIVATE'
			});
			await env.seedChapter({
				id: 'private-ch',
				ownerId: env.ownerId,
				studySetId: privateSet.id
			});

			const result = await env.repo.findChaptersByStudySet(env.ownerId, env.studySetId);
			const ids = result.map((c) => c.id);
			expect(ids).toEqual(['public-ch']);
			expect(ids).not.toContain('private-ch');
		});

		it('returns chapters from public study sets owned by other users', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const otherSet = await env.seedStudySet({
				id: env.otherStudySetId,
				slug: 'other-public-set',
				ownerId: env.otherId,
				visibility: 'PUBLIC'
			});
			await env.seedChapter({
				id: 'other-public-ch',
				ownerId: env.otherId,
				studySetId: otherSet.id
			});

			const result = await env.repo.findChaptersByStudySet(env.ownerId, otherSet.id);
			expect(result.map((c) => c.id)).toContain('other-public-ch');
		});

		it('excludes chapters from private study sets owned by other users', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const otherSet = await env.seedStudySet({
				id: env.otherStudySetId,
				slug: 'other-private-set',
				ownerId: env.otherId,
				visibility: 'PRIVATE'
			});
			await env.seedChapter({
				id: 'other-private-ch',
				ownerId: env.otherId,
				studySetId: otherSet.id
			});

			const result = await env.repo.findChaptersByStudySet(env.ownerId, otherSet.id);
			expect(result.map((c) => c.id)).not.toContain('other-private-ch');
		});

		it('returns only chapters from the specified study set', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const otherSet = await env.seedStudySet({
				id: generateId(STUDY_SET_ID_PREFIX),
				slug: 'other-set',
				ownerId: env.ownerId,
				visibility: 'PUBLIC'
			});
			await env.seedChapter({
				id: 'ch-in-first',
				ownerId: env.ownerId,
				studySetId: env.studySetId
			});
			await env.seedChapter({ id: 'ch-in-second', ownerId: env.ownerId, studySetId: otherSet.id });

			const result = await env.repo.findChaptersByStudySet(env.ownerId, env.studySetId);
			const ids = result.map((c) => c.id);
			expect(ids).toContain('ch-in-first');
			expect(ids).not.toContain('ch-in-second');
		});

		it('orders by createdAt desc', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const first = await env.seedChapter({ id: 'first', ownerId: env.ownerId });
			await new Promise((r) => setTimeout(r, 5));
			const second = await env.seedChapter({ id: 'second', ownerId: env.ownerId });

			const result = await env.repo.findChaptersByStudySet(env.ownerId, env.studySetId);
			const idxFirst = result.findIndex((c) => c.id === first.id);
			const idxSecond = result.findIndex((c) => c.id === second.id);
			expect(idxFirst).toBeGreaterThan(idxSecond);
		});
	});

	describe('isSlugTakenInStudySet', () => {
		it('returns true on exact match', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			await env.seedChapter({
				id: 'ch-1',
				ownerId: env.ownerId,
				slug: 'my-slug-abc123'
			});
			expect(await env.repo.isSlugTakenInStudySet(env.studySetId, 'my-slug-abc123')).toBe(true);
		});

		it('matches case-insensitively', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			await env.seedChapter({ id: 'ch-1', ownerId: env.ownerId, slug: 'my-slug-abc123' });
			expect(await env.repo.isSlugTakenInStudySet(env.studySetId, 'MY-SLUG-ABC123')).toBe(true);
			expect(await env.repo.isSlugTakenInStudySet(env.studySetId, 'My-Slug-Abc123')).toBe(true);
		});

		it('returns false when the slug exists in a different study set', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const otherSet = await env.seedStudySet({
				id: env.otherStudySetId,
				slug: 'other-set',
				ownerId: env.ownerId
			});
			await env.seedChapter({
				id: 'ch-1',
				ownerId: env.ownerId,
				slug: 'shared-slug',
				studySetId: otherSet.id
			});
			expect(await env.repo.isSlugTakenInStudySet(env.studySetId, 'shared-slug')).toBe(false);
		});

		it('returns false when the slug does not exist', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			await env.seedChapter({ id: 'ch-1', ownerId: env.ownerId, slug: 'existing-slug' });
			expect(await env.repo.isSlugTakenInStudySet(env.studySetId, 'other-slug')).toBe(false);
		});

		it('returns false when no chapters exist', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			expect(await env.repo.isSlugTakenInStudySet(env.studySetId, 'anything')).toBe(false);
		});
	});

	describe('countChildren', () => {
		it('returns the number of flashcards assigned to the chapter', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const created = await env.seedChapter({ id: 'ch-1', ownerId: env.ownerId });
			env.seedFlashcardInChapter(created.id);
			env.seedFlashcardInChapter(created.id);
			expect(await env.repo.countChildren(created.id)).toBe(2);
		});

		it('returns 0 for a chapter with no flashcards', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const created = await env.seedChapter({ id: 'ch-1', ownerId: env.ownerId });
			expect(await env.repo.countChildren(created.id)).toBe(0);
		});

		it('does not count flashcards assigned to a different chapter', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const a = await env.seedChapter({ id: 'a', ownerId: env.ownerId });
			const b = await env.seedChapter({ id: 'b', ownerId: env.ownerId });
			env.seedFlashcardInChapter(a.id);
			env.seedFlashcardInChapter(a.id);
			env.seedFlashcardInChapter(b.id);
			expect(await env.repo.countChildren(a.id)).toBe(2);
			expect(await env.repo.countChildren(b.id)).toBe(1);
		});
	});
});

describe.concurrent('ChapterDrizzleRepository (schema constraints)', () => {
	describe('slug uniqueness', () => {
		it('rejects inserting a second chapter with the same slug in the same study set', async ({
			expect
		}) => {
			await using env = new ChapterTestEnv();
			await env.seedChapter({
				id: 'first',
				ownerId: env.ownerId,
				slug: 'same-slug'
			});
			const insertDuplicate = async () =>
				env.repo.insertChapter({
					id: 'second',
					slug: 'SAME-SLUG',
					title: 'Second',
					description: null,
					studySetId: env.studySetId,
					ownerId: env.ownerId
				});
			await expect(insertDuplicate()).rejects.toThrow();
		});

		it('allows the same slug across different study sets', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			await env.seedChapter({
				id: 'first',
				ownerId: env.ownerId,
				slug: 'shared-slug'
			});
			const otherSet = await env.seedStudySet({
				id: env.otherStudySetId,
				slug: 'other-set',
				ownerId: env.ownerId
			});
			const result = await env.repo.insertChapter({
				id: 'second',
				slug: 'shared-slug',
				title: 'Second',
				description: null,
				studySetId: otherSet.id,
				ownerId: env.ownerId
			});
			expect(result.id).toBe('second');
		});
	});

	describe('foreign keys', () => {
		it('rejects inserting a chapter for a non-existent study set', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const insertOrphan = async () =>
				env.repo.insertChapter({
					id: 'orphan',
					slug: 'orphan-slug',
					title: 'Orphan',
					description: null,
					studySetId: 'does-not-exist',
					ownerId: env.ownerId
				});
			await expect(insertOrphan()).rejects.toThrow();
		});

		it('rejects inserting a chapter for a non-existent owner', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			const insertOrphan = async () =>
				env.repo.insertChapter({
					id: 'orphan',
					slug: 'orphan-slug',
					title: 'Orphan',
					description: null,
					studySetId: env.studySetId,
					ownerId: 'does-not-exist'
				});
			await expect(insertOrphan()).rejects.toThrow();
		});
	});

	describe('cascade from study set deletion', () => {
		it('removes chapters when the parent study set is deleted', async ({ expect }) => {
			await using env = new ChapterTestEnv();
			await env.seedChapter({ id: 'ch-1', ownerId: env.ownerId });
			expect(env.db.select().from(chapter).where(eq(chapter.id, 'ch-1')).all()).toHaveLength(1);

			env.db.delete(studySet).where(eq(studySet.id, env.studySetId)).run();

			expect(env.db.select().from(chapter).where(eq(chapter.id, 'ch-1')).all()).toHaveLength(0);
		});
	});
});
