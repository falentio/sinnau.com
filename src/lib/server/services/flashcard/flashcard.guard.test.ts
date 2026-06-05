import { ORPCError } from '@orpc/server';
import { describe, it } from 'vitest';
import type { StudySetGuard } from '../study-set/study-set.guard.ts';
import { createStudySetFixture } from '../study-set/study-set.testing.ts';
import { FlashcardGuard } from './flashcard.guard.ts';
import {
	createFlashcardFixture,
	createMockRepository,
	createMockStudySetGuard,
	type MockedFlashcardRepository,
	type MockedStudySetGuard
} from './flashcard.testing.ts';

type PartialForbiddenError = ORPCError<'PARTIAL_FORBIDDEN', { ids: string[] }>;

function setupGuard(repo?: MockedFlashcardRepository, studySetGuard?: MockedStudySetGuard) {
	const flashcardRepo = repo ?? createMockRepository();
	const studySet = studySetGuard ?? createMockStudySetGuard();
	const guard = new FlashcardGuard(flashcardRepo, studySet as unknown as StudySetGuard);
	return { repo: flashcardRepo, studySet, guard };
}

describe.concurrent('FlashcardGuard', () => {
	describe('assertStudySetOwnerOrForbidden', () => {
		it('returns the study set when the caller owns it', async ({ expect }) => {
			const set = createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' });
			const { studySet, guard } = setupGuard();
			studySet.assertStudySetOwnerOrForbidden.mockResolvedValue(set);
			const result = await guard.assertStudySetOwnerOrForbidden('set-1', 'owner-1');
			expect(result).toBe(set);
			expect(studySet.assertStudySetOwnerOrForbidden).toHaveBeenCalledWith('set-1', 'owner-1');
		});

		it('throws FORBIDDEN with the flashcard message when caller is not the owner', async ({
			expect
		}) => {
			const { studySet, guard } = setupGuard();
			studySet.assertStudySetOwnerOrForbidden.mockRejectedValue(
				new ORPCError('FORBIDDEN', { message: 'Cannot modify a study set you do not own' })
			);
			const err = await guard
				.assertStudySetOwnerOrForbidden('set-1', 'other')
				.catch((e: unknown) => e);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({
				code: 'FORBIDDEN',
				message: 'Cannot modify flashcards in a study set you do not own'
			});
		});

		it('throws FORBIDDEN with the flashcard message when the study set is missing', async ({
			expect
		}) => {
			const { studySet, guard } = setupGuard();
			studySet.assertStudySetOwnerOrForbidden.mockRejectedValue(
				new ORPCError('FORBIDDEN', { message: 'Cannot modify a study set you do not own' })
			);
			const err = await guard
				.assertStudySetOwnerOrForbidden('missing', 'owner-1')
				.catch((e: unknown) => e);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});
	});

	describe('assertStudySetVisibleOrNotFound', () => {
		it('returns the study set to the owner even when PRIVATE', async ({ expect }) => {
			const set = createStudySetFixture({
				id: 'set-1',
				ownerId: 'owner-1',
				visibility: 'PRIVATE'
			});
			const { studySet, guard } = setupGuard();
			studySet.assertStudySetVisibleByIdOrNotFound.mockResolvedValue(set);
			const result = await guard.assertStudySetVisibleOrNotFound('set-1', 'owner-1');
			expect(result).toBe(set);
			expect(studySet.assertStudySetVisibleByIdOrNotFound).toHaveBeenCalledWith('set-1', 'owner-1');
		});

		it('returns a PUBLIC study set to a non-owner', async ({ expect }) => {
			const set = createStudySetFixture({
				id: 'set-1',
				ownerId: 'owner-1',
				visibility: 'PUBLIC'
			});
			const { studySet, guard } = setupGuard();
			studySet.assertStudySetVisibleByIdOrNotFound.mockResolvedValue(set);
			const result = await guard.assertStudySetVisibleOrNotFound('set-1', 'other');
			expect(result).toBe(set);
		});

		it('throws NOT_FOUND for a private set viewed by a non-owner', async ({ expect }) => {
			const { studySet, guard } = setupGuard();
			studySet.assertStudySetVisibleByIdOrNotFound.mockRejectedValue(
				new ORPCError('NOT_FOUND', { message: 'Study set not found' })
			);
			const err = await guard
				.assertStudySetVisibleOrNotFound('set-1', 'other')
				.catch((e: unknown) => e);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('throws NOT_FOUND when the study set is missing', async ({ expect }) => {
			const { studySet, guard } = setupGuard();
			studySet.assertStudySetVisibleByIdOrNotFound.mockRejectedValue(
				new ORPCError('NOT_FOUND', { message: 'Study set not found' })
			);
			const err = await guard
				.assertStudySetVisibleOrNotFound('missing', 'owner-1')
				.catch((e: unknown) => e);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('assertChapterOwnerInStudySetOrForbidden', () => {
		it('returns when the chapter belongs to the study set and is owned', async ({ expect }) => {
			const { repo, guard } = setupGuard();
			repo.findChapter.mockResolvedValue({ id: 'ch-1', studySetId: 'set-1', ownerId: 'owner-1' });
			await expect(
				guard.assertChapterOwnerInStudySetOrForbidden('ch-1', 'owner-1', 'set-1')
			).resolves.toBeUndefined();
			expect(repo.findChapter).toHaveBeenCalledWith('ch-1');
		});

		it('throws NOT_FOUND when the chapter does not exist', async ({ expect }) => {
			const { repo, guard } = setupGuard();
			repo.findChapter.mockResolvedValue(null);
			await expect(
				guard.assertChapterOwnerInStudySetOrForbidden('ch-1', 'owner-1', 'set-1')
			).rejects.toMatchObject({ code: 'NOT_FOUND' });
		});

		it('throws VALIDATION_FAILED when the chapter belongs to a different study set', async ({
			expect
		}) => {
			const { repo, guard } = setupGuard();
			repo.findChapter.mockResolvedValue({
				id: 'ch-1',
				studySetId: 'other-set',
				ownerId: 'owner-1'
			});
			await expect(
				guard.assertChapterOwnerInStudySetOrForbidden('ch-1', 'owner-1', 'set-1')
			).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
		});

		it('throws FORBIDDEN when the chapter is owned by a different user', async ({ expect }) => {
			const { repo, guard } = setupGuard();
			repo.findChapter.mockResolvedValue({
				id: 'ch-1',
				studySetId: 'set-1',
				ownerId: 'someone-else'
			});
			await expect(
				guard.assertChapterOwnerInStudySetOrForbidden('ch-1', 'owner-1', 'set-1')
			).rejects.toMatchObject({ code: 'FORBIDDEN' });
		});
	});

	describe('assertFlashcardOwnerOrForbidden', () => {
		it('returns the card when the caller is the owner', async ({ expect }) => {
			const card = createFlashcardFixture({ id: 'card-1', ownerId: 'owner-1' });
			const { repo, guard } = setupGuard();
			repo.findFlashcardById.mockResolvedValue(card);
			const result = await guard.assertFlashcardOwnerOrForbidden('card-1', 'owner-1');
			expect(result).toBe(card);
		});

		it('throws FORBIDDEN when caller is not the owner', async ({ expect }) => {
			const { repo, guard } = setupGuard();
			repo.findFlashcardById.mockResolvedValue(
				createFlashcardFixture({ id: 'card-1', ownerId: 'owner-1' })
			);
			await expect(guard.assertFlashcardOwnerOrForbidden('card-1', 'other')).rejects.toMatchObject({
				code: 'FORBIDDEN'
			});
		});

		it('throws FORBIDDEN when the card is missing', async ({ expect }) => {
			const { repo, guard } = setupGuard();
			repo.findFlashcardById.mockResolvedValue(null);
			await expect(
				guard.assertFlashcardOwnerOrForbidden('card-1', 'owner-1')
			).rejects.toMatchObject({
				code: 'FORBIDDEN'
			});
		});
	});

	describe('assertFlashcardVisibleOrNotFound', () => {
		it('returns the card to the owner even when the study set is PRIVATE', async ({ expect }) => {
			const card = createFlashcardFixture({
				id: 'card-1',
				ownerId: 'owner-1',
				studySetId: 'set-1'
			});
			const { repo, studySet, guard } = setupGuard();
			repo.findFlashcardById.mockResolvedValue(card);
			studySet.assertStudySetVisibleByIdOrNotFound.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PRIVATE' })
			);
			const result = await guard.assertFlashcardVisibleOrNotFound('card-1', 'owner-1');
			expect(result).toBe(card);
			expect(studySet.assertStudySetVisibleByIdOrNotFound).toHaveBeenCalledWith('set-1', 'owner-1');
		});

		it('returns the card to a non-owner when the study set is PUBLIC', async ({ expect }) => {
			const card = createFlashcardFixture({
				id: 'card-1',
				ownerId: 'owner-1',
				studySetId: 'set-1'
			});
			const { repo, studySet, guard } = setupGuard();
			repo.findFlashcardById.mockResolvedValue(card);
			studySet.assertStudySetVisibleByIdOrNotFound.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PUBLIC' })
			);
			const result = await guard.assertFlashcardVisibleOrNotFound('card-1', 'other');
			expect(result).toBe(card);
		});

		it('throws NOT_FOUND for a non-owner viewing a card in a PRIVATE set', async ({ expect }) => {
			const card = createFlashcardFixture({
				id: 'card-1',
				ownerId: 'owner-1',
				studySetId: 'set-1'
			});
			const { repo, studySet, guard } = setupGuard();
			repo.findFlashcardById.mockResolvedValue(card);
			studySet.assertStudySetVisibleByIdOrNotFound.mockRejectedValue(
				new ORPCError('NOT_FOUND', { message: 'Study set not found' })
			);
			const err = await guard
				.assertFlashcardVisibleOrNotFound('card-1', 'other')
				.catch((e: unknown) => e);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND', message: 'Flashcard not found' });
		});

		it('throws NOT_FOUND when the card is missing', async ({ expect }) => {
			const { repo, guard } = setupGuard();
			repo.findFlashcardById.mockResolvedValue(null);
			await expect(
				guard.assertFlashcardVisibleOrNotFound('card-1', 'user-1')
			).rejects.toMatchObject({
				code: 'NOT_FOUND'
			});
		});

		it('throws NOT_FOUND when the parent study set is missing', async ({ expect }) => {
			const card = createFlashcardFixture({
				id: 'card-1',
				ownerId: 'owner-1',
				studySetId: 'set-1'
			});
			const { repo, studySet, guard } = setupGuard();
			repo.findFlashcardById.mockResolvedValue(card);
			studySet.assertStudySetVisibleByIdOrNotFound.mockRejectedValue(
				new ORPCError('NOT_FOUND', { message: 'Study set not found' })
			);
			const err = await guard
				.assertFlashcardVisibleOrNotFound('card-1', 'user-1')
				.catch((e: unknown) => e);
			expect(err).toMatchObject({ code: 'NOT_FOUND', message: 'Flashcard not found' });
		});
	});

	describe('assertFlashcardsAllOwnedOrThrow', () => {
		it('returns silently when every id is owned', async ({ expect }) => {
			const { repo, guard } = setupGuard();
			repo.findFlashcardsByIds.mockResolvedValue([
				createFlashcardFixture({ id: 'a', ownerId: 'owner-1' }),
				createFlashcardFixture({ id: 'b', ownerId: 'owner-1' })
			]);
			await expect(
				guard.assertFlashcardsAllOwnedOrThrow(['a', 'b'], 'owner-1')
			).resolves.toBeUndefined();
		});

		it('throws PARTIAL_FORBIDDEN listing all unowned ids', async ({ expect }) => {
			const { repo, guard } = setupGuard();
			repo.findFlashcardsByIds.mockResolvedValue([
				createFlashcardFixture({ id: 'a', ownerId: 'owner-1' })
			]);
			const err = (await guard
				.assertFlashcardsAllOwnedOrThrow(['a', 'b', 'c'], 'owner-1')
				.catch((e: unknown) => e)) as PartialForbiddenError;
			expect(err).toBeInstanceOf(ORPCError);
			expect(err.code).toBe('PARTIAL_FORBIDDEN');
			expect(err.data).toEqual({ ids: ['b', 'c'] });
		});

		it('includes ids owned by a different user in the blocked list', async ({ expect }) => {
			const { repo, guard } = setupGuard();
			repo.findFlashcardsByIds.mockResolvedValue([
				createFlashcardFixture({ id: 'a', ownerId: 'owner-1' }),
				createFlashcardFixture({ id: 'b', ownerId: 'other' })
			]);
			const err = (await guard
				.assertFlashcardsAllOwnedOrThrow(['a', 'b'], 'owner-1')
				.catch((e: unknown) => e)) as PartialForbiddenError;
			expect(err.code).toBe('PARTIAL_FORBIDDEN');
			expect(err.data).toEqual({ ids: ['b'] });
		});

		it('throws PARTIAL_FORBIDDEN for every id when none are returned', async ({ expect }) => {
			const { repo, guard } = setupGuard();
			repo.findFlashcardsByIds.mockResolvedValue([]);
			const err = (await guard
				.assertFlashcardsAllOwnedOrThrow(['a', 'b'], 'owner-1')
				.catch((e: unknown) => e)) as PartialForbiddenError;
			expect(err.data).toEqual({ ids: ['a', 'b'] });
		});
	});
});
