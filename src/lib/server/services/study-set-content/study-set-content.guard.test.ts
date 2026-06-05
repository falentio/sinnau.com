import { ORPCError } from '@orpc/server';
import { describe, it } from 'vitest';
import { StudySetGuard } from '../study-set/study-set.guard.ts';
import {
	createStudySetFixture,
	createMockRepository as createMockStudySetRepo
} from '../study-set/study-set.testing.ts';
import { StudySetContentGuard } from './study-set-content.guard.ts';
import { createStudySetContentFixture, createMockRepository } from './study-set-content.testing.ts';

async function captureError(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
		return null;
	} catch (err) {
		return err;
	}
}

function setupGuard() {
	const contentRepo = createMockRepository();
	contentRepo.findContentById.mockResolvedValue(null);

	const studySetRepo = createMockStudySetRepo();
	studySetRepo.findStudySetById.mockResolvedValue(null);
	const studySetGuard = new StudySetGuard(studySetRepo);

	const guard = new StudySetContentGuard(contentRepo, studySetGuard);
	return { contentRepo, studySetRepo, guard };
}

describe.concurrent('StudySetContentGuard', () => {
	describe('assertContentOwnerOrForbidden', () => {
		it('returns the content when the caller owns the parent study set', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			const content = createStudySetContentFixture({ id: 'ssc-1', studySetId: 'set-1' });
			contentRepo.findContentById.mockResolvedValue(content);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' })
			);
			const result = await guard.assertContentOwnerOrForbidden('ssc-1', 'owner-1');
			expect(contentRepo.findContentById).toHaveBeenCalledWith('ssc-1');
			expect(studySetRepo.findStudySetById).toHaveBeenCalledWith('set-1');
			expect(result).toBe(content);
		});

		it('throws FORBIDDEN when content does not exist', async ({ expect }) => {
			const { contentRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(null);
			const err = await captureError(guard.assertContentOwnerOrForbidden('missing', 'owner-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});

		it('throws FORBIDDEN when the study set is not owned', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(
				createStudySetContentFixture({ id: 'ssc-1', studySetId: 'set-1' })
			);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' })
			);
			const err = await captureError(guard.assertContentOwnerOrForbidden('ssc-1', 'other'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});

		it('throws FORBIDDEN when the study set does not exist', async ({ expect }) => {
			const { contentRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(
				createStudySetContentFixture({ id: 'ssc-1', studySetId: 'missing-set' })
			);
			const err = await captureError(guard.assertContentOwnerOrForbidden('ssc-1', 'owner-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});
	});

	describe('assertContentVisibleByIdOrNotFound', () => {
		it('returns the content to the owner even when study set is PRIVATE', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			const content = createStudySetContentFixture({ id: 'ssc-1', studySetId: 'set-1' });
			contentRepo.findContentById.mockResolvedValue(content);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PRIVATE' })
			);
			const result = await guard.assertContentVisibleByIdOrNotFound('ssc-1', 'owner-1');
			expect(result).toBe(content);
		});

		it('returns the content to a non-owner when study set is PUBLIC', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			const content = createStudySetContentFixture({ id: 'ssc-1', studySetId: 'set-1' });
			contentRepo.findContentById.mockResolvedValue(content);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PUBLIC' })
			);
			const result = await guard.assertContentVisibleByIdOrNotFound('ssc-1', 'other-user');
			expect(result).toBe(content);
		});

		it('throws NOT_FOUND when content does not exist', async ({ expect }) => {
			const { contentRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(null);
			const err = await captureError(guard.assertContentVisibleByIdOrNotFound('missing', 'user-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('throws NOT_FOUND when study set is PRIVATE and caller is not owner', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(
				createStudySetContentFixture({ id: 'ssc-1', studySetId: 'set-1' })
			);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PRIVATE' })
			);
			const err = await captureError(
				guard.assertContentVisibleByIdOrNotFound('ssc-1', 'other-user')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('throws NOT_FOUND when parent study set is missing', async ({ expect }) => {
			const { contentRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(
				createStudySetContentFixture({ id: 'ssc-1', studySetId: 'missing-set' })
			);
			const err = await captureError(guard.assertContentVisibleByIdOrNotFound('ssc-1', 'user-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('does not call study set repo when content is missing', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(null);
			await captureError(guard.assertContentVisibleByIdOrNotFound('missing', 'user-1'));
			expect(studySetRepo.findStudySetById).not.toHaveBeenCalled();
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
	});

	describe('assertStudySetVisibleByIdOrNotFound', () => {
		it('returns when study set is PUBLIC', async ({ expect }) => {
			const { studySetRepo, guard } = setupGuard();
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PUBLIC' })
			);
			await expect(
				guard.assertStudySetVisibleByIdOrNotFound('set-1', 'other-user')
			).resolves.toBeUndefined();
		});

		it('returns when caller owns the study set even if PRIVATE', async ({ expect }) => {
			const { studySetRepo, guard } = setupGuard();
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PRIVATE' })
			);
			await expect(
				guard.assertStudySetVisibleByIdOrNotFound('set-1', 'owner-1')
			).resolves.toBeUndefined();
		});

		it('throws NOT_FOUND when study set is PRIVATE and caller is not owner', async ({ expect }) => {
			const { studySetRepo, guard } = setupGuard();
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PRIVATE' })
			);
			const err = await captureError(guard.assertStudySetVisibleByIdOrNotFound('set-1', 'other'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});
});

