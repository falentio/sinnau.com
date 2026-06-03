import { ORPCError } from '@orpc/server';
import { describe, it } from 'vitest';
import type { StudySet } from '../../infras/db/schema/study-set.ts';
import { FLASHCARD_IMPORTANCE_DEFAULT } from './flashcard.constant.ts';
import type { FlashcardGuard } from './flashcard.guard.ts';
import { FlashcardService } from './flashcard.service.ts';
import {
	captureError,
	createFlashcardFixture,
	createMockGuard,
	createMockRepository,
	EMPTY_FLASHCARD_LIST
} from './flashcard.testing.ts';

function setupService() {
	const repo = createMockRepository();
	const guard = createMockGuard();

	const ownedStudySet: StudySet = {
		id: 'set-1',
		slug: 'set-slug',
		title: 'Owned',
		description: null,
		visibility: 'PRIVATE',
		ownerId: 'owner-1',
		files: [],
		createdAt: new Date(),
		updatedAt: new Date()
	};

	repo.insertFlashcards.mockImplementation(async (rows) =>
		rows.map((r) => createFlashcardFixture(r))
	);
	repo.updateFlashcard.mockResolvedValue(null);
	repo.deleteFlashcards.mockResolvedValue(true);
	repo.findFlashcardById.mockResolvedValue(null);
	repo.findFlashcardsByIds.mockResolvedValue([]);
	repo.findFlashcardsByStudySet.mockResolvedValue(EMPTY_FLASHCARD_LIST);
	repo.findChapter.mockResolvedValue(null);

	guard.assertStudySetOwnerOrForbidden.mockResolvedValue(ownedStudySet);
	guard.assertStudySetVisibleOrNotFound.mockResolvedValue(ownedStudySet);
	guard.assertChapterOwnerInStudySetOrForbidden.mockResolvedValue(undefined);
	guard.assertFlashcardOwnerOrForbidden.mockResolvedValue(
		createFlashcardFixture({ id: 'card-1', ownerId: 'owner-1' })
	);
	guard.assertFlashcardVisibleOrNotFound.mockResolvedValue(
		createFlashcardFixture({ id: 'card-1', ownerId: 'owner-1' })
	);
	guard.assertFlashcardsAllOwnedOrThrow.mockResolvedValue(undefined);

	const service = new FlashcardService(repo, guard as unknown as FlashcardGuard);
	return { repo, guard, service };
}

function throwForbidden(): never {
	throw new ORPCError('FORBIDDEN', { message: 'Cannot modify a flashcard you do not own' });
}
function throwNotFound(): never {
	throw new ORPCError('NOT_FOUND', { message: 'Flashcard not found' });
}
function throwValidationFailed(): never {
	throw new ORPCError('VALIDATION_FAILED', { message: 'Invalid input' });
}
function throwPartialForbidden(): never {
	throw new ORPCError('PARTIAL_FORBIDDEN', {
		message: 'Some flashcards cannot be deleted',
		data: { ids: ['x', 'y'] }
	});
}

const sampleStudySetId = '11111111-1111-1111-1111-111111111111';

describe.concurrent('FlashcardService', () => {
	describe('createFlashcards', () => {
		it('propagates FORBIDDEN from assertStudySetOwnerOrForbidden', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertStudySetOwnerOrForbidden.mockImplementation(throwForbidden);
			const err = await captureError(
				service.createFlashcards(
					{ studySetId: sampleStudySetId, flashcards: [{ front: 'Q', back: 'A' }] },
					'owner-1'
				)
			);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
			expect(guard.assertStudySetOwnerOrForbidden).toHaveBeenCalledWith(
				sampleStudySetId,
				'owner-1'
			);
			expect(repo.insertFlashcards).not.toHaveBeenCalled();
		});

		it('creates one flashcard with generated id, default importance, null hint', async ({
			expect
		}) => {
			const { repo, guard, service } = setupService();
			const result = await service.createFlashcards(
				{ studySetId: sampleStudySetId, flashcards: [{ front: 'Q1', back: 'A1' }] },
				'owner-1'
			);
			expect(guard.assertStudySetOwnerOrForbidden).toHaveBeenCalledWith(
				sampleStudySetId,
				'owner-1'
			);
			expect(guard.assertChapterOwnerInStudySetOrForbidden).not.toHaveBeenCalled();
			expect(repo.insertFlashcards).toHaveBeenCalledOnce();
			const rows = repo.insertFlashcards.mock.calls[0]?.[0] ?? [];
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({
				front: 'Q1',
				back: 'A1',
				hint: null,
				importance: FLASHCARD_IMPORTANCE_DEFAULT,
				chapterId: null,
				studySetId: sampleStudySetId,
				ownerId: 'owner-1'
			});
			expect(rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
			expect(result).toHaveLength(1);
			expect(result[0]?.front).toBe('Q1');
		});

		it('preserves the order of flashcards in the batch', async ({ expect }) => {
			const { repo, service } = setupService();
			await service.createFlashcards(
				{
					studySetId: sampleStudySetId,
					flashcards: [
						{ front: 'F1', back: 'B1' },
						{ front: 'F2', back: 'B2' },
						{ front: 'F3', back: 'B3' }
					]
				},
				'owner-1'
			);
			const rows = repo.insertFlashcards.mock.calls[0]?.[0] ?? [];
			expect(rows.map((r) => r.front)).toEqual(['F1', 'F2', 'F3']);
		});

		it('validates every unique chapterId exactly once and aborts on the first mismatch', async ({
			expect
		}) => {
			const { guard, service } = setupService();
			guard.assertChapterOwnerInStudySetOrForbidden.mockImplementation(throwValidationFailed);
			const err = await captureError(
				service.createFlashcards(
					{
						studySetId: sampleStudySetId,
						flashcards: [
							{ chapterId: '22222222-2222-2222-2222-222222222222', front: 'F', back: 'B' },
							{ chapterId: '22222222-2222-2222-2222-222222222222', front: 'F', back: 'B' },
							{ chapterId: '33333333-3333-3333-3333-333333333333', front: 'F', back: 'B' }
						]
					},
					'owner-1'
				)
			);
			expect(err).toMatchObject({ code: 'VALIDATION_FAILED' });
			const calls = guard.assertChapterOwnerInStudySetOrForbidden.mock.calls;
			const seen = new Set(calls.map(([id]) => id));
			expect(seen.size).toBe(1);
			expect(seen.has('22222222-2222-2222-2222-222222222222')).toBe(true);
		});

		it('stores hint string when provided', async ({ expect }) => {
			const { repo, service } = setupService();
			await service.createFlashcards(
				{
					studySetId: sampleStudySetId,
					flashcards: [{ front: 'F', back: 'B', hint: 'a small hint' }]
				},
				'owner-1'
			);
			const rows = repo.insertFlashcards.mock.calls[0]?.[0] ?? [];
			expect(rows[0]?.hint).toBe('a small hint');
		});
	});

	describe('updateFlashcard', () => {
		it('propagates FORBIDDEN from assertFlashcardOwnerOrForbidden', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertFlashcardOwnerOrForbidden.mockImplementation(throwForbidden);
			const err = await captureError(
				service.updateFlashcard({ id: 'card-1', front: 'F', back: 'B' }, 'owner-1')
			);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
			expect(repo.updateFlashcard).not.toHaveBeenCalled();
		});

		it('updates front+back and clears hint when set to null', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertFlashcardOwnerOrForbidden.mockResolvedValue(
				createFlashcardFixture({ id: 'card-1', ownerId: 'owner-1', hint: 'old hint' })
			);
			repo.updateFlashcard.mockImplementation(async (id, ownerId, patch) =>
				createFlashcardFixture({ id, ownerId, ...patch })
			);
			await service.updateFlashcard(
				{ id: 'card-1', front: 'F2', back: 'B2', hint: null },
				'owner-1'
			);
			expect(repo.updateFlashcard).toHaveBeenCalledWith(
				'card-1',
				'owner-1',
				expect.objectContaining({ front: 'F2', back: 'B2', hint: null })
			);
		});

		it('clears hint when an empty string is sent', async ({ expect }) => {
			const { repo, service } = setupService();
			repo.updateFlashcard.mockImplementation(async (id, ownerId, patch) =>
				createFlashcardFixture({ id, ownerId, ...patch })
			);
			await service.updateFlashcard({ id: 'card-1', front: 'F', back: 'B', hint: '' }, 'owner-1');
			expect(repo.updateFlashcard).toHaveBeenCalledWith(
				'card-1',
				'owner-1',
				expect.objectContaining({ hint: null })
			);
		});

		it('omits hint and importance from patch when not provided', async ({ expect }) => {
			const { repo, service } = setupService();
			repo.updateFlashcard.mockImplementation(async (id, ownerId, patch) =>
				createFlashcardFixture({ id, ownerId, ...patch })
			);
			await service.updateFlashcard({ id: 'card-1', front: 'F', back: 'B' }, 'owner-1');
			const patch = repo.updateFlashcard.mock.calls[0]?.[2] ?? {};
			expect(patch).not.toHaveProperty('hint');
			expect(patch).not.toHaveProperty('importance');
		});

		it('throws NOT_FOUND when the repo returns null', async ({ expect }) => {
			const { service } = setupService();
			const err = await captureError(
				service.updateFlashcard({ id: 'card-1', front: 'F', back: 'B' }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('deleteFlashcards', () => {
		it('propagates PARTIAL_FORBIDDEN from assertFlashcardsAllOwnedOrThrow', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertFlashcardsAllOwnedOrThrow.mockImplementation(throwPartialForbidden);
			const err = await captureError(service.deleteFlashcards({ ids: ['a', 'b'] }, 'owner-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'PARTIAL_FORBIDDEN', data: { ids: ['x', 'y'] } });
			expect(repo.deleteFlashcards).not.toHaveBeenCalled();
		});

		it('deletes all ids when the ownership check passes', async ({ expect }) => {
			const { repo, service } = setupService();
			await service.deleteFlashcards({ ids: ['a', 'b', 'c'] }, 'owner-1');
			expect(repo.deleteFlashcards).toHaveBeenCalledWith(['a', 'b', 'c'], 'owner-1');
		});
	});

	describe('getFlashcards', () => {
		it('propagates NOT_FOUND from the study set visibility check', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertStudySetVisibleOrNotFound.mockImplementation(throwNotFound);
			const err = await captureError(
				service.getFlashcards({ studySetId: sampleStudySetId }, 'user-1')
			);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
			expect(repo.findFlashcardsByStudySet).not.toHaveBeenCalled();
		});

		it('returns the repository result for a visible study set', async ({ expect }) => {
			const { repo, service } = setupService();
			const cards = [
				createFlashcardFixture({ id: 'card-1' }),
				createFlashcardFixture({ id: 'card-2' })
			];
			repo.findFlashcardsByStudySet.mockResolvedValue(cards);
			const result = await service.getFlashcards({ studySetId: sampleStudySetId }, 'user-1');
			expect(repo.findFlashcardsByStudySet).toHaveBeenCalledWith(sampleStudySetId);
			expect(result).toBe(cards);
		});
	});

	describe('getFlashcard', () => {
		it('returns the flashcard returned by the guard', async ({ expect }) => {
			const { guard, service } = setupService();
			const card = createFlashcardFixture({ id: 'card-1', ownerId: 'owner-1' });
			guard.assertFlashcardVisibleOrNotFound.mockResolvedValue(card);
			const result = await service.getFlashcard({ id: 'card-1' }, 'owner-1');
			expect(guard.assertFlashcardVisibleOrNotFound).toHaveBeenCalledWith('card-1', 'owner-1');
			expect(result).toBe(card);
		});

		it('propagates NOT_FOUND from the visibility check', async ({ expect }) => {
			const { guard, service } = setupService();
			guard.assertFlashcardVisibleOrNotFound.mockImplementation(throwNotFound);
			const err = await captureError(service.getFlashcard({ id: 'card-1' }, 'user-1'));
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});
});
