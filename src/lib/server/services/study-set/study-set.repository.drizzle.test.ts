import { STUDY_SET_VISIT_TTL_MS } from '$lib/schemas/study-set.constant';
import { studySet, studySetVisit } from '$lib/server/infras/db/schema/study-set';
import { eq } from 'drizzle-orm';
import { describe, it } from 'vitest';
import { StudySetTestEnv } from './study-set.testing';

describe.concurrent('StudySetDrizzleRepository', () => {
	describe('insertStudySet', () => {
		it('persists the row and returns it with timestamps', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const before = Date.now();
			const created = await env.repo.insertStudySet({
				id: 'set-1',
				slug: 'my-slug-abc123',
				title: 'My Set',
				description: null,
				visibility: 'PUBLIC',
				ownerId: env.ownerId,
				files: ['a.pdf']
			});
			const after = Date.now();

			expect(created.id).toBe('set-1');
			expect(created.slug).toBe('my-slug-abc123');
			expect(created.title).toBe('My Set');
			expect(created.files).toEqual(['a.pdf']);
			expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before);
			expect(created.createdAt.getTime()).toBeLessThanOrEqual(after);
			expect(created.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
			expect(created.updatedAt.getTime()).toBeLessThanOrEqual(after);

			const rows = env.db.select().from(studySet).where(eq(studySet.id, 'set-1')).all();
			expect(rows).toHaveLength(1);
		});
	});

	describe('updateStudySet', () => {
		it('updates fields when id and ownerId match', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const created = await env.seedStudySet({
				id: 'set-1',
				ownerId: env.ownerId,
				title: 'Original'
			});
			const updated = await env.repo.updateStudySet('set-1', env.ownerId, {
				title: 'Renamed',
				visibility: 'PRIVATE'
			});
			expect(updated).not.toBeNull();
			expect(updated).toHaveProperty('title', 'Renamed');
			expect(updated).toHaveProperty('visibility', 'PRIVATE');
			expect(updated).toHaveProperty('id', 'set-1');
			expect(updated).toHaveProperty('createdAt', created.createdAt);
		});

		it('returns null when the id does not exist', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const result = await env.repo.updateStudySet('missing', env.ownerId, { title: 'X' });
			expect(result).toBeNull();
		});

		it('returns null when ownerId does not match', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId });
			const result = await env.repo.updateStudySet('set-1', env.otherId, { title: 'Hacked' });
			expect(result).toBeNull();
			// Verify the original row was not modified
			const [row] = env.db.select().from(studySet).where(eq(studySet.id, 'set-1')).all();
			expect(row?.title).toBe('Seeded Set');
		});
	});

	describe('deleteStudySet', () => {
		it('returns true and removes the row when id and ownerId match', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId });
			const ok = await env.repo.deleteStudySet('set-1', env.ownerId);
			expect(ok).toBe(true);
			expect(env.db.select().from(studySet).where(eq(studySet.id, 'set-1')).all()).toHaveLength(0);
		});

		it('returns false when the id does not exist', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			expect(await env.repo.deleteStudySet('missing', env.ownerId)).toBe(false);
		});

		it('returns false when ownerId does not match', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId });
			expect(await env.repo.deleteStudySet('set-1', env.otherId)).toBe(false);
			expect(env.db.select().from(studySet).where(eq(studySet.id, 'set-1')).all()).toHaveLength(1);
		});

		it('cascades to study set visits', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const created = await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId });
			await env.repo.upsertVisit(env.ownerId, created.id, Date.now());
			expect(
				env.db.select().from(studySetVisit).where(eq(studySetVisit.studySetId, 'set-1')).all()
			).toHaveLength(1);

			await env.repo.deleteStudySet('set-1', env.ownerId);

			expect(
				env.db.select().from(studySetVisit).where(eq(studySetVisit.studySetId, 'set-1')).all()
			).toHaveLength(0);
		});
	});

	describe('findStudySetById', () => {
		it('returns the row when it exists', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId, title: 'Found' });
			const result = await env.repo.findStudySetById('set-1');
			expect(result?.id).toBe('set-1');
			expect(result?.title).toBe('Found');
		});

		it('returns null when the id does not exist', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			expect(await env.repo.findStudySetById('missing')).toBeNull();
		});
	});

	describe('findStudySetBySlug', () => {
		it('returns the row on an exact slug match', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			await env.seedStudySet({
				id: 'set-1',
				ownerId: env.ownerId,
				slug: 'my-set-abc123'
			});
			const result = await env.repo.findStudySetBySlug('my-set-abc123');
			expect(result?.id).toBe('set-1');
		});

		it('matches case-insensitively', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			await env.seedStudySet({
				id: 'set-1',
				ownerId: env.ownerId,
				slug: 'my-set-abc123'
			});
			expect((await env.repo.findStudySetBySlug('MY-SET-ABC123'))?.id).toBe('set-1');
			expect((await env.repo.findStudySetBySlug('My-Set-Abc123'))?.id).toBe('set-1');
		});

		it('returns null when no row matches', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			expect(await env.repo.findStudySetBySlug('missing-slug')).toBeNull();
		});
	});

	describe('findOwnedStudySets', () => {
		it('returns only sets owned by the given owner', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			await env.seedStudySet({ id: 'a', ownerId: env.ownerId });
			await env.seedStudySet({ id: 'b', ownerId: env.ownerId });
			await env.seedStudySet({ id: 'c', ownerId: env.otherId });

			const result = await env.repo.findOwnedStudySets(env.ownerId, 'createdAt', 'desc', 1);
			expect(result.data.map((s) => s.id).toSorted()).toEqual(['a', 'b']);
		});

		it('paginates with a fixed limit of 10', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			for (let i = 0; i < 12; i++) {
				await env.seedStudySet({ id: `set-${i}`, ownerId: env.ownerId });
			}

			const page1 = await env.repo.findOwnedStudySets(env.ownerId, 'createdAt', 'desc', 1);
			expect(page1.data).toHaveLength(10);
			expect(page1.pagination).toEqual({
				page: 1,
				limit: 10,
				total: 12,
				totalPages: 2
			});

			const page2 = await env.repo.findOwnedStudySets(env.ownerId, 'createdAt', 'desc', 2);
			expect(page2.data).toHaveLength(2);
			expect(page2.pagination.page).toBe(2);
		});

		it('orders by createdAt desc by default', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const first = await env.seedStudySet({ id: 'first', ownerId: env.ownerId });
			await new Promise((r) => setTimeout(r, 5));
			const second = await env.seedStudySet({ id: 'second', ownerId: env.ownerId });

			const result = await env.repo.findOwnedStudySets(env.ownerId, 'createdAt', 'desc', 1);
			expect(result.data[0]?.id).toBe(second.id);
			expect(result.data[1]?.id).toBe(first.id);
		});

		it('orders by updatedAt ascending when requested', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const a = await env.seedStudySet({ id: 'a', ownerId: env.ownerId });
			await new Promise((r) => setTimeout(r, 5));
			const b = await env.seedStudySet({ id: 'b', ownerId: env.ownerId });
			await new Promise((r) => setTimeout(r, 5));
			await env.repo.updateStudySet(a.id, env.ownerId, { title: 'a updated' });

			const result = await env.repo.findOwnedStudySets(env.ownerId, 'updatedAt', 'asc', 1);
			expect(result.data[0]?.id).toBe(b.id);
		});
	});

	describe('isSlugTaken', () => {
		it('returns true when an exact-match slug exists', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			await env.seedStudySet({ id: 'a', ownerId: env.ownerId, slug: 'slug-one' });
			expect(await env.repo.isSlugTaken('slug-one')).toBe(true);
		});

		it('returns true when the candidate matches case-insensitively', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			await env.seedStudySet({ id: 'a', ownerId: env.ownerId, slug: 'slug-one' });
			expect(await env.repo.isSlugTaken('SLUG-ONE')).toBe(true);
			expect(await env.repo.isSlugTaken('Slug-One')).toBe(true);
		});

		it('returns false when no row matches', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			await env.seedStudySet({ id: 'a', ownerId: env.ownerId, slug: 'slug-one' });
			expect(await env.repo.isSlugTaken('slug-two')).toBe(false);
		});

		it('returns false when there are no rows', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			expect(await env.repo.isSlugTaken('anything')).toBe(false);
		});
	});

	describe('upsertVisit', () => {
		it('inserts a new visit when none exists', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const created = await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId });
			const visitedAt = Date.now();
			const visit = await env.repo.upsertVisit(env.ownerId, created.id, visitedAt);
			expect(visit.userId).toBe(env.ownerId);
			expect(visit.studySetId).toBe('set-1');
			expect(visit.visitedAt.getTime()).toBe(visitedAt);
			expect(
				env.db.select().from(studySetVisit).where(eq(studySetVisit.userId, env.ownerId)).all()
			).toHaveLength(1);
		});

		it('updates the visitedAt timestamp on conflict for the same (user, set) pair', async ({
			expect
		}) => {
			await using env = new StudySetTestEnv();
			const created = await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId });
			const first = Date.now();
			await env.repo.upsertVisit(env.ownerId, created.id, first);
			await new Promise((r) => setTimeout(r, 5));
			const second = first + 10_000;
			await env.repo.upsertVisit(env.ownerId, created.id, second);

			const rows = env.db
				.select()
				.from(studySetVisit)
				.where(eq(studySetVisit.userId, env.ownerId))
				.all();
			expect(rows).toHaveLength(1);
			expect(rows[0]?.visitedAt.getTime()).toBe(second);
		});

		it('keeps visits separate per user', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const created = await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId });
			await env.repo.upsertVisit(env.ownerId, created.id, Date.now());
			await env.repo.upsertVisit(env.otherId, created.id, Date.now());
			expect(
				env.db.select().from(studySetVisit).where(eq(studySetVisit.studySetId, 'set-1')).all()
			).toHaveLength(2);
		});
	});

	describe('deleteOldVisits', () => {
		it('deletes only visits older than the cutoff and returns the count', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const owner = env.ownerId;
			const fresh = await env.seedStudySet({ id: 'fresh', ownerId: owner });
			const old = await env.seedStudySet({ id: 'old', ownerId: owner });

			const oldTimestamp = Date.now() - STUDY_SET_VISIT_TTL_MS - 1000;
			env.db
				.insert(studySetVisit)
				.values({
					id: 'visit-old',
					userId: owner,
					studySetId: old.id,
					visitedAt: new Date(oldTimestamp)
				})
				.run();
			await env.repo.upsertVisit(owner, fresh.id, Date.now());

			const cutoff = Date.now() - STUDY_SET_VISIT_TTL_MS;
			const deletedCount = await env.repo.deleteOldVisits(cutoff);
			expect(deletedCount).toBe(1);
			expect(
				env.db.select().from(studySetVisit).where(eq(studySetVisit.id, 'visit-old')).all()
			).toHaveLength(0);
		});

		it('returns 0 when no visits are older than the cutoff', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const created = await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId });
			await env.repo.upsertVisit(env.ownerId, created.id, Date.now());
			const deletedCount = await env.repo.deleteOldVisits(Date.now() - STUDY_SET_VISIT_TTL_MS);
			expect(deletedCount).toBe(0);
		});
	});

	describe('findRecentVisits', () => {
		it('returns visits ordered by visitedAt desc', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const a = await env.seedStudySet({ id: 'a', ownerId: env.ownerId });
			const b = await env.seedStudySet({ id: 'b', ownerId: env.ownerId });
			await env.repo.upsertVisit(env.otherId, a.id, Date.now());
			await new Promise((r) => setTimeout(r, 5));
			await env.repo.upsertVisit(env.otherId, b.id, Date.now());

			const recent = await env.repo.findRecentVisits(env.otherId, 10);
			expect(recent.map((s) => s.id)).toEqual([b.id, a.id]);
		});

		it('limits the result to the requested count', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			for (let i = 0; i < 5; i++) {
				const s = await env.seedStudySet({ id: `s-${i}`, ownerId: env.ownerId });
				await env.repo.upsertVisit(env.otherId, s.id, Date.now() + i);
			}
			const recent = await env.repo.findRecentVisits(env.otherId, 3);
			expect(recent).toHaveLength(3);
		});

		it('excludes private sets the user does not own', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const thirdId = env.seedUser({ name: 'Third' });
			const publicSet = await env.seedStudySet({
				id: 'public',
				ownerId: env.ownerId,
				visibility: 'PUBLIC'
			});
			const privateSet = await env.seedStudySet({
				id: 'private',
				ownerId: thirdId,
				visibility: 'PRIVATE'
			});
			await env.repo.upsertVisit(env.otherId, publicSet.id, Date.now());
			await new Promise((r) => setTimeout(r, 5));
			await env.repo.upsertVisit(env.otherId, privateSet.id, Date.now() + 1000);

			const recent = await env.repo.findRecentVisits(env.otherId, 10);
			expect(recent.map((s) => s.id)).toEqual([publicSet.id]);
		});

		it('includes private sets owned by the user themselves', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const ownPrivate = await env.seedStudySet({
				id: 'own',
				ownerId: env.otherId,
				visibility: 'PRIVATE'
			});
			await env.repo.upsertVisit(env.otherId, ownPrivate.id, Date.now());
			const recent = await env.repo.findRecentVisits(env.otherId, 10);
			expect(recent.map((s) => s.id)).toEqual([ownPrivate.id]);
		});

		it('returns an empty array when the user has no visits', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const recent = await env.repo.findRecentVisits(env.otherId, 10);
			expect(recent).toEqual([]);
		});
	});
});

describe.concurrent('StudySetDrizzleRepository (schema constraints)', () => {
	describe('slug uniqueness', () => {
		it('rejects inserting two rows with the same slug (case-insensitive)', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			await env.seedStudySet({ id: 'a', ownerId: env.ownerId, slug: 'same-slug' });
			const insertDuplicate = async () =>
				env.repo.insertStudySet({
					id: 'b',
					slug: 'SAME-SLUG',
					title: 'B',
					description: null,
					visibility: 'PUBLIC',
					ownerId: env.ownerId,
					files: []
				});
			await expect(insertDuplicate()).rejects.toThrow();
		});
	});

	describe('foreign keys', () => {
		it('rejects inserting a study set for a non-existent owner', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const insertOrphan = async () =>
				env.repo.insertStudySet({
					id: 'orphan',
					slug: 'orphan-slug',
					title: 'Orphan',
					description: null,
					visibility: 'PUBLIC',
					ownerId: 'does-not-exist',
					files: []
				});
			await expect(insertOrphan()).rejects.toThrow();
		});

		it('rejects inserting a visit for a non-existent user', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const created = await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId });
			const insertOrphan = () =>
				env.db
					.insert(studySetVisit)
					.values({
						id: 'visit-orphan',
						userId: 'does-not-exist',
						studySetId: created.id,
						visitedAt: new Date()
					})
					.run();
			expect(insertOrphan).toThrow();
		});
	});

	describe('visit unique constraint', () => {
		it('enforces (userId, studySetId) uniqueness at the DB level', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const created = await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId });
			env.db
				.insert(studySetVisit)
				.values({
					id: 'visit-1',
					userId: env.ownerId,
					studySetId: created.id,
					visitedAt: new Date()
				})
				.run();
			const insertDup = () =>
				env.db
					.insert(studySetVisit)
					.values({
						id: 'visit-2',
						userId: env.ownerId,
						studySetId: created.id,
						visitedAt: new Date()
					})
					.run();
			expect(insertDup).toThrow();
		});
	});

	describe('TTL cutoff boundary', () => {
		it('treats a visit at exactly the cutoff as not old', async ({ expect }) => {
			await using env = new StudySetTestEnv();
			const created = await env.seedStudySet({ id: 'set-1', ownerId: env.ownerId });
			const cutoff = Date.now() - STUDY_SET_VISIT_TTL_MS;
			env.db
				.insert(studySetVisit)
				.values({
					id: 'visit-edge',
					userId: env.ownerId,
					studySetId: created.id,
					visitedAt: new Date(cutoff)
				})
				.run();
			const deleted = await env.repo.deleteOldVisits(cutoff);
			expect(deleted).toBe(0);
			// Sanity: a row one millisecond older is deleted.
			env.db
				.update(studySetVisit)
				.set({ visitedAt: new Date(cutoff - 1) })
				.where(eq(studySetVisit.id, 'visit-edge'))
				.run();
			expect(await env.repo.deleteOldVisits(cutoff)).toBe(1);
		});
	});
});
