import { ORPCError } from '@orpc/server';
import { describe, it } from 'vitest';
import type { StudySetVisit } from '../../infras/db/schema/study-set.ts';
import { STUDY_SET_VISIT_TTL_MS } from './study-set.constant.ts';
import type { StudySetGuard } from './study-set.guard.ts';
import { StudySetService } from './study-set.service.ts';
import {
	captureError,
	createMockGuard,
	createMockRepository,
	createStudySetFixture,
	EMPTY_STUDY_SET_LIST
} from './study-set.testing.ts';

function setupService() {
	const repo = createMockRepository();
	const guard = createMockGuard();

	// Repo defaults so individual tests only override the methods they care about.
	repo.isSlugTaken.mockResolvedValue(false);
	repo.insertStudySet.mockImplementation(async (row) => ({
		...createStudySetFixture(),
		...row
	}));
	repo.updateStudySet.mockResolvedValue(null);
	repo.deleteStudySet.mockResolvedValue(false);
	repo.findStudySetById.mockResolvedValue(null);
	repo.findStudySetBySlug.mockResolvedValue(null);
	repo.findOwnedStudySets.mockResolvedValue(EMPTY_STUDY_SET_LIST);
	repo.upsertVisit.mockImplementation(
		async (userId, studySetId, visitedAt) =>
			({
				id: crypto.randomUUID(),
				userId,
				studySetId,
				visitedAt: new Date(visitedAt)
			}) satisfies StudySetVisit
	);
	repo.deleteOldVisits.mockResolvedValue(0);
	repo.findRecentVisits.mockResolvedValue([]);

	// Guard defaults: happy-path passthrough so tests only configure failures explicitly.
	guard.requireOwner.mockImplementation((id) => id as string);
	guard.requireUser.mockImplementation((id) => id as string);
	guard.assertOwnerOrForbidden.mockResolvedValue(createStudySetFixture());
	guard.assertVisibleByIdOrNotFound.mockResolvedValue(createStudySetFixture());
	guard.assertVisibleBySlugOrNotFound.mockResolvedValue(createStudySetFixture());
	guard.canView.mockReturnValue(true);

	const service = new StudySetService(repo, guard as unknown as StudySetGuard);
	return { repo, guard, service };
}

function throwUnauthorized(): never {
	throw new ORPCError('UNAUTHORIZED', { message: 'Authentication is required' });
}

function throwForbidden(): never {
	throw new ORPCError('FORBIDDEN', { message: 'Cannot modify a study set you do not own' });
}

function throwNotFound(): never {
	throw new ORPCError('NOT_FOUND', { message: 'Study set not found' });
}

describe.concurrent('StudySetService', () => {
	describe('createStudySet', () => {
		it('propagates UNAUTHORIZED from guard.requireOwner', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.requireOwner.mockImplementation(throwUnauthorized);
			const err = await captureError(service.createStudySet({ title: 'Biology 101' }, null));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'UNAUTHORIZED' });
			expect(guard.requireOwner).toHaveBeenCalledWith(null);
			expect(repo.insertStudySet).not.toHaveBeenCalled();
		});

		it('creates a study set with generated slug, default visibility, and empty files', async ({
			expect
		}) => {
			const { repo, guard, service } = setupService();
			const result = await service.createStudySet({ title: 'Biology 101' }, 'owner-1');
			expect(guard.requireOwner).toHaveBeenCalledWith('owner-1');
			expect(repo.isSlugTaken).toHaveBeenCalled();
			expect(repo.insertStudySet).toHaveBeenCalledOnce();
			expect(repo.insertStudySet).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Biology 101',
					ownerId: 'owner-1',
					visibility: 'PUBLIC',
					files: []
				})
			);
			const inserted = repo.insertStudySet.mock.calls[0]?.[0];
			expect(inserted?.slug).toMatch(/^biology-101-[a-z2-7]{6}$/);
			expect(result.title).toBe('Biology 101');
			expect(result.ownerId).toBe('owner-1');
			expect(result.visibility).toBe('PUBLIC');
			expect(result.files).toEqual([]);
		});

		it('honors explicit PRIVATE visibility and files array', async ({ expect }) => {
			const { repo, service } = setupService();
			const created = createStudySetFixture({
				title: 'Private Set',
				visibility: 'PRIVATE',
				files: ['a.pdf', 'b.png']
			});
			repo.insertStudySet.mockResolvedValue(created);

			const result = await service.createStudySet(
				{ title: 'Private Set', visibility: 'PRIVATE', files: ['a.pdf', 'b.png'] },
				'owner-1'
			);

			expect(repo.insertStudySet).toHaveBeenCalledWith(
				expect.objectContaining({ visibility: 'PRIVATE', files: ['a.pdf', 'b.png'] })
			);
			expect(result.visibility).toBe('PRIVATE');
			expect(result.files).toEqual(['a.pdf', 'b.png']);
		});

		it('uses short random slug when sanitized title is too short', async ({ expect }) => {
			const { repo, service } = setupService();
			await service.createStudySet({ title: 'ab' }, 'owner-1');
			const inserted = repo.insertStudySet.mock.calls[0]?.[0];
			expect(inserted?.slug).toMatch(/^[a-z2-7]{12}$/);
		});

		it('consults the repo via isSlugTaken for each generated candidate', async ({ expect }) => {
			const { repo, service } = setupService();
			await service.createStudySet({ title: 'Biology 101' }, 'owner-1');
			const candidates = repo.isSlugTaken.mock.calls.map(([c]) => c);
			expect(candidates.length).toBeGreaterThan(0);
			for (const candidate of candidates) {
				expect(candidate).toMatch(/^biology-101-[a-z2-7]{6}$/);
			}
		});
	});

	describe('updateStudySet', () => {
		it('propagates UNAUTHORIZED from guard.requireOwner', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.requireOwner.mockImplementation(throwUnauthorized);
			const err = await captureError(
				service.updateStudySet({ id: crypto.randomUUID(), title: 'X' }, null)
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'UNAUTHORIZED' });
			expect(guard.assertOwnerOrForbidden).not.toHaveBeenCalled();
			expect(repo.updateStudySet).not.toHaveBeenCalled();
		});

		it('propagates FORBIDDEN from guard.assertOwnerOrForbidden', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertOwnerOrForbidden.mockImplementation(throwForbidden);
			const err = await captureError(
				service.updateStudySet({ id: 'set-1', title: 'X' }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
			expect(guard.assertOwnerOrForbidden).toHaveBeenCalledWith('set-1', 'owner-1');
			expect(repo.updateStudySet).not.toHaveBeenCalled();
		});

		it('updates allowed fields, preserves slug, and replaces files entirely', async ({
			expect
		}) => {
			const { repo, guard, service } = setupService();
			const existing = createStudySetFixture({
				id: 'set-1',
				ownerId: 'owner-1',
				slug: 'original-slug-abc123',
				title: 'Original Title',
				visibility: 'PUBLIC',
				files: ['x.txt', 'y.txt']
			});
			guard.assertOwnerOrForbidden.mockResolvedValue(existing);
			repo.updateStudySet.mockImplementation(async (_id, _ownerId, patch) => ({
				...existing,
				...patch,
				updatedAt: new Date()
			}));

			const result = await service.updateStudySet(
				{ id: 'set-1', title: 'Renamed', visibility: 'PRIVATE', files: ['only.pdf'] },
				'owner-1'
			);

			expect(repo.updateStudySet).toHaveBeenCalledWith(
				'set-1',
				'owner-1',
				expect.objectContaining({
					title: 'Renamed',
					visibility: 'PRIVATE',
					files: ['only.pdf']
				})
			);
			expect(result.title).toBe('Renamed');
			expect(result.visibility).toBe('PRIVATE');
			expect(result.files).toEqual(['only.pdf']);
			expect(result.slug).toBe('original-slug-abc123');
		});

		it('clears description when null is sent in update', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			const existing = createStudySetFixture({
				id: 'set-1',
				ownerId: 'owner-1',
				description: 'old description'
			});
			guard.assertOwnerOrForbidden.mockResolvedValue(existing);
			repo.updateStudySet.mockImplementation(async (_id, _ownerId, patch) => ({
				...existing,
				...patch,
				updatedAt: new Date()
			}));

			const result = await service.updateStudySet({ id: 'set-1', description: null }, 'owner-1');
			expect(repo.updateStudySet).toHaveBeenCalledWith(
				'set-1',
				'owner-1',
				expect.objectContaining({ description: null })
			);
			expect(result.description).toBe(null);
		});

		it('returns the existing row without calling update when patch is empty', async ({
			expect
		}) => {
			const { repo, guard, service } = setupService();
			const existing = createStudySetFixture({
				id: 'set-1',
				ownerId: 'owner-1',
				title: 'Original Title'
			});
			guard.assertOwnerOrForbidden.mockResolvedValue(existing);

			const result = await service.updateStudySet({ id: 'set-1' }, 'owner-1');
			expect(result).toBe(existing);
			expect(repo.updateStudySet).not.toHaveBeenCalled();
		});

		it('throws NOT_FOUND when repo update returns null', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertOwnerOrForbidden.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' })
			);
			repo.updateStudySet.mockResolvedValue(null);

			const err = await captureError(
				service.updateStudySet({ id: 'set-1', title: 'New' }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('deleteStudySet', () => {
		it('propagates UNAUTHORIZED from guard.requireOwner', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.requireOwner.mockImplementation(throwUnauthorized);
			const err = await captureError(service.deleteStudySet({ id: crypto.randomUUID() }, null));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'UNAUTHORIZED' });
			expect(repo.deleteStudySet).not.toHaveBeenCalled();
		});

		it('throws NOT_FOUND when repo reports nothing was deleted', async ({ expect }) => {
			const { service } = setupService();
			const err = await captureError(
				service.deleteStudySet({ id: crypto.randomUUID() }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('passes the id and owner to the repo when owner matches', async ({ expect }) => {
			const { repo, service } = setupService();
			repo.deleteStudySet.mockResolvedValue(true);
			await service.deleteStudySet({ id: 'set-1' }, 'owner-1');
			expect(repo.deleteStudySet).toHaveBeenCalledWith('set-1', 'owner-1');
		});
	});

	describe('getStudySets', () => {
		it('propagates UNAUTHORIZED from guard.requireOwner', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.requireOwner.mockImplementation(throwUnauthorized);
			const err = await captureError(service.getStudySets({}, null));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'UNAUTHORIZED' });
			expect(repo.findOwnedStudySets).not.toHaveBeenCalled();
		});

		it('forwards default pagination (orderBy=createdAt, orderDirection=desc, page=1)', async ({
			expect
		}) => {
			const { repo, service } = setupService();
			await service.getStudySets({}, 'owner-1');
			expect(repo.findOwnedStudySets).toHaveBeenCalledWith('owner-1', 'createdAt', 'desc', 1);
		});

		it('forwards requested pagination options', async ({ expect }) => {
			const { repo, service } = setupService();
			await service.getStudySets(
				{ pagination: { orderBy: 'updatedAt', orderDirection: 'asc', page: 2 } },
				'owner-1'
			);
			expect(repo.findOwnedStudySets).toHaveBeenCalledWith('owner-1', 'updatedAt', 'asc', 2);
		});
	});

	describe('getStudySet', () => {
		it('propagates UNAUTHORIZED from guard.requireUser', async ({ expect }) => {
			const { guard, service } = setupService();
			guard.requireUser.mockImplementation(throwUnauthorized);
			const err = await captureError(service.getStudySet({ id: crypto.randomUUID() }, null));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'UNAUTHORIZED' });
			expect(guard.assertVisibleByIdOrNotFound).not.toHaveBeenCalled();
			expect(guard.assertVisibleBySlugOrNotFound).not.toHaveBeenCalled();
		});

		it('delegates to guard.assertVisibleByIdOrNotFound when input has an id', async ({
			expect
		}) => {
			const { guard, service } = setupService();
			const expected = createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' });
			guard.assertVisibleByIdOrNotFound.mockResolvedValue(expected);

			const result = await service.getStudySet({ id: 'set-1' }, 'owner-1');
			expect(guard.assertVisibleByIdOrNotFound).toHaveBeenCalledWith('set-1', 'owner-1');
			expect(guard.assertVisibleBySlugOrNotFound).not.toHaveBeenCalled();
			expect(result).toBe(expected);
		});

		it('delegates to guard.assertVisibleBySlugOrNotFound when input has a slug', async ({
			expect
		}) => {
			const { guard, service } = setupService();
			const expected = createStudySetFixture({ id: 'set-1', slug: 'slug-abc123' });
			guard.assertVisibleBySlugOrNotFound.mockResolvedValue(expected);

			const result = await service.getStudySet({ slug: 'slug-abc123' }, 'owner-1');
			expect(guard.assertVisibleBySlugOrNotFound).toHaveBeenCalledWith('slug-abc123', 'owner-1');
			expect(guard.assertVisibleByIdOrNotFound).not.toHaveBeenCalled();
			expect(result).toBe(expected);
		});

		it('propagates NOT_FOUND from the id visibility check', async ({ expect }) => {
			const { guard, service } = setupService();
			guard.assertVisibleByIdOrNotFound.mockImplementation(throwNotFound);
			const err = await captureError(service.getStudySet({ id: crypto.randomUUID() }, 'owner-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('propagates NOT_FOUND from the slug visibility check', async ({ expect }) => {
			const { guard, service } = setupService();
			guard.assertVisibleBySlugOrNotFound.mockImplementation(throwNotFound);
			const err = await captureError(service.getStudySet({ slug: 'missing-slug' }, 'owner-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('refreshStudySetVisit', () => {
		it('propagates UNAUTHORIZED from guard.requireUser', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.requireUser.mockImplementation(throwUnauthorized);
			const err = await captureError(
				service.refreshStudySetVisit({ studySetId: crypto.randomUUID() }, null)
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'UNAUTHORIZED' });
			expect(guard.assertVisibleByIdOrNotFound).not.toHaveBeenCalled();
			expect(repo.upsertVisit).not.toHaveBeenCalled();
		});

		it('upserts the visit with the current timestamp and returns it', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertVisibleByIdOrNotFound.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' })
			);
			const before = Date.now();
			const result = await service.refreshStudySetVisit({ studySetId: 'set-1' }, 'owner-1');
			const after = Date.now();

			expect(guard.assertVisibleByIdOrNotFound).toHaveBeenCalledWith('set-1', 'owner-1');
			expect(repo.upsertVisit).toHaveBeenCalledOnce();
			const [userId, studySetId, visitedAt] = repo.upsertVisit.mock.calls[0]!;
			expect(userId).toBe('owner-1');
			expect(studySetId).toBe('set-1');
			expect(visitedAt).toBeGreaterThanOrEqual(before);
			expect(visitedAt).toBeLessThanOrEqual(after);
			expect(result.visitedAt).toBe(visitedAt);
		});

		it('propagates NOT_FOUND from the visibility check and skips upsert', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertVisibleByIdOrNotFound.mockImplementation(throwNotFound);
			const err = await captureError(
				service.refreshStudySetVisit({ studySetId: 'set-1' }, 'other')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
			expect(repo.upsertVisit).not.toHaveBeenCalled();
		});
	});

	describe('getRecentStudySets', () => {
		it('propagates UNAUTHORIZED from guard.requireUser', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.requireUser.mockImplementation(throwUnauthorized);
			const err = await captureError(service.getRecentStudySets({ count: 5 }, null));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'UNAUTHORIZED' });
			expect(repo.findRecentVisits).not.toHaveBeenCalled();
		});

		it('forwards user and count to the repo and returns its result', async ({ expect }) => {
			const { repo, service } = setupService();
			const sets = [createStudySetFixture({ id: 'set-1' })];
			repo.findRecentVisits.mockResolvedValue(sets);
			const result = await service.getRecentStudySets({ count: 5 }, 'owner-1');
			expect(repo.findRecentVisits).toHaveBeenCalledWith('owner-1', 5);
			expect(result).toBe(sets);
		});
	});

	describe('cleanupOldStudySetVisits', () => {
		it('passes a cutoff of now - TTL and returns the deleted count', async ({ expect }) => {
			const { repo, service } = setupService();
			repo.deleteOldVisits.mockResolvedValue(3);
			const before = Date.now();
			const result = await service.cleanupOldStudySetVisits();
			const after = Date.now();

			expect(repo.deleteOldVisits).toHaveBeenCalledOnce();
			const cutoff = repo.deleteOldVisits.mock.calls[0]?.[0] ?? 0;
			expect(cutoff).toBeGreaterThanOrEqual(before - STUDY_SET_VISIT_TTL_MS);
			expect(cutoff).toBeLessThanOrEqual(after - STUDY_SET_VISIT_TTL_MS);
			expect(result).toEqual({ deletedCount: 3 });
		});
	});
});
