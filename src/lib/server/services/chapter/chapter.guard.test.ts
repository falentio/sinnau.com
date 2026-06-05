import { ORPCError } from '@orpc/server';
import { describe, it } from 'vitest';
import { StudySetGuard } from '../study-set/study-set.guard.ts';
import {
	createStudySetFixture,
	createMockRepository as createMockStudySetRepo
} from '../study-set/study-set.testing.ts';
import { ChapterGuard } from './chapter.guard.ts';
import { createChapterFixture, createMockRepository } from './chapter.testing.ts';

async function captureError(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
		return null;
	} catch (err) {
		return err;
	}
}

function setupGuard() {
	const chapterRepo = createMockRepository();
	chapterRepo.findChapterById.mockResolvedValue(null);

	const studySetRepo = createMockStudySetRepo();
	studySetRepo.findStudySetById.mockResolvedValue(null);
	const studySetGuard = new StudySetGuard(studySetRepo);

	const guard = new ChapterGuard(chapterRepo, studySetGuard);
	return { chapterRepo, studySetRepo, guard };
}

describe.concurrent('ChapterGuard', () => {
	describe('assertOwnerOrForbidden', () => {
		it('returns the chapter when the caller is the owner', async ({ expect }) => {
			const { chapterRepo, guard } = setupGuard();
			const ch = createChapterFixture({ id: 'ch-1', ownerId: 'owner-1' });
			chapterRepo.findChapterById.mockResolvedValue(ch);
			const result = await guard.assertOwnerOrForbidden('ch-1', 'owner-1');
			expect(chapterRepo.findChapterById).toHaveBeenCalledWith('ch-1');
			expect(result).toBe(ch);
		});

		it('throws FORBIDDEN when the caller is not the owner', async ({ expect }) => {
			const { chapterRepo, guard } = setupGuard();
			chapterRepo.findChapterById.mockResolvedValue(
				createChapterFixture({ id: 'ch-1', ownerId: 'owner-1' })
			);
			const err = await captureError(guard.assertOwnerOrForbidden('ch-1', 'someone-else'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});

		it('throws FORBIDDEN when the chapter does not exist', async ({ expect }) => {
			const { chapterRepo, guard } = setupGuard();
			chapterRepo.findChapterById.mockResolvedValue(null);
			const err = await captureError(guard.assertOwnerOrForbidden('missing', 'owner-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
			expect(chapterRepo.findChapterById).toHaveBeenCalledWith('missing');
		});
	});

	describe('assertVisibleByIdOrNotFound', () => {
		it('returns the chapter to the owner even when the study set is PRIVATE', async ({
			expect
		}) => {
			const { chapterRepo, studySetRepo, guard } = setupGuard();
			const ch = createChapterFixture({ id: 'ch-1', ownerId: 'owner-1', studySetId: 'set-1' });
			chapterRepo.findChapterById.mockResolvedValue(ch);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PRIVATE' })
			);
			const result = await guard.assertVisibleByIdOrNotFound('ch-1', 'owner-1');
			expect(chapterRepo.findChapterById).toHaveBeenCalledWith('ch-1');
			expect(studySetRepo.findStudySetById).toHaveBeenCalledWith('set-1');
			expect(result).toBe(ch);
		});

		it('returns the chapter to a non-owner when the study set is PUBLIC', async ({ expect }) => {
			const { chapterRepo, studySetRepo, guard } = setupGuard();
			const ch = createChapterFixture({ id: 'ch-1', ownerId: 'owner-1', studySetId: 'set-1' });
			chapterRepo.findChapterById.mockResolvedValue(ch);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PUBLIC' })
			);
			const result = await guard.assertVisibleByIdOrNotFound('ch-1', 'other-user');
			expect(result).toBe(ch);
		});

		it('throws NOT_FOUND when a non-owner requests a chapter in a PRIVATE study set', async ({
			expect
		}) => {
			const { chapterRepo, studySetRepo, guard } = setupGuard();
			chapterRepo.findChapterById.mockResolvedValue(
				createChapterFixture({ id: 'ch-1', ownerId: 'owner-1', studySetId: 'set-1' })
			);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PRIVATE' })
			);
			const err = await captureError(guard.assertVisibleByIdOrNotFound('ch-1', 'other-user'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('throws NOT_FOUND when the chapter is missing', async ({ expect }) => {
			const { chapterRepo, guard } = setupGuard();
			chapterRepo.findChapterById.mockResolvedValue(null);
			const err = await captureError(guard.assertVisibleByIdOrNotFound('missing', 'user-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('throws NOT_FOUND when the chapter is missing in scope (does not call study set)', async ({
			expect
		}) => {
			const { chapterRepo, studySetRepo, guard } = setupGuard();
			chapterRepo.findChapterById.mockResolvedValue(null);
			await captureError(guard.assertVisibleByIdOrNotFound('missing', 'user-1'));
			expect(studySetRepo.findStudySetById).not.toHaveBeenCalled();
		});

		it('throws NOT_FOUND when the parent study set is missing', async ({ expect }) => {
			const { chapterRepo, studySetRepo, guard } = setupGuard();
			chapterRepo.findChapterById.mockResolvedValue(
				createChapterFixture({ id: 'ch-1', ownerId: 'owner-1', studySetId: 'missing-set' })
			);
			studySetRepo.findStudySetById.mockResolvedValue(null);
			const err = await captureError(guard.assertVisibleByIdOrNotFound('ch-1', 'user-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('assertStudySetOwnerOrForbidden', () => {
		it('returns when the caller owns the study set', async ({ expect }) => {
			const { studySetRepo, guard } = setupGuard();
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' })
			);
			await expect(
				guard.assertStudySetOwnerOrForbidden('set-1', 'owner-1')
			).resolves.toBeUndefined();
		});

		it('throws FORBIDDEN when the caller does not own the study set', async ({ expect }) => {
			const { studySetRepo, guard } = setupGuard();
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' })
			);
			const err = await captureError(guard.assertStudySetOwnerOrForbidden('set-1', 'other'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});

		it('throws FORBIDDEN when the study set does not exist', async ({ expect }) => {
			const { guard } = setupGuard();
			const err = await captureError(guard.assertStudySetOwnerOrForbidden('missing', 'owner-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});
	});
});

