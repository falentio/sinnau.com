import { type MockedFunction, vi } from 'vitest';
import { getTestingDb } from '$lib/server/infras/db/testing';
import { user } from '$lib/server/infras/db/schema/auth-schema';
import { StudySetDrizzleRepository } from './study-set.repository.drizzle';
import type { StudySet } from '../../infras/db/schema/study-set.ts';
import type { StudySetGuard } from './study-set.guard.ts';
import type { StudySetListResult, StudySetRepository } from './study-set.repository.ts';

export type MockedStudySetRepository = {
	[K in keyof StudySetRepository]: MockedFunction<StudySetRepository[K]>;
};

export function createMockRepository(): MockedStudySetRepository {
	return {
		insertStudySet: vi.fn(),
		updateStudySet: vi.fn(),
		deleteStudySet: vi.fn(),
		findStudySetById: vi.fn(),
		findStudySetBySlug: vi.fn(),
		findOwnedStudySets: vi.fn(),
		isSlugTaken: vi.fn(),
		upsertVisit: vi.fn(),
		deleteOldVisits: vi.fn(),
		findRecentVisits: vi.fn()
	};
}

export type MockedStudySetGuard = {
	[K in keyof StudySetGuard]: MockedFunction<StudySetGuard[K]>;
};

export function createMockGuard(): MockedStudySetGuard {
	return {
		requireOwner: vi.fn(),
		requireUser: vi.fn(),
		assertOwnerOrForbidden: vi.fn(),
		assertVisibleByIdOrNotFound: vi.fn(),
		assertVisibleBySlugOrNotFound: vi.fn(),
		canView: vi.fn()
	};
}

export function createStudySetFixture(overrides: Partial<StudySet> = {}): StudySet {
	return {
		id: crypto.randomUUID(),
		slug: 'test-slug-abc123',
		title: 'Test Set',
		description: null,
		visibility: 'PUBLIC',
		ownerId: 'owner-1',
		files: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

export const EMPTY_STUDY_SET_LIST: StudySetListResult = {
	data: [],
	pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }
};

export async function captureError(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
		return null;
	} catch (err) {
		return err;
	}
}

interface SeedUserOptions {
	id?: string;
	email?: string;
	name?: string;
}

export class StudySetTestEnv implements AsyncDisposable {
	readonly db: ReturnType<typeof getTestingDb>;
	readonly repo: StudySetDrizzleRepository;
	readonly ownerId: string;
	readonly otherId: string;

	constructor() {
		this.db = getTestingDb();
		this.repo = new StudySetDrizzleRepository(this.db);
		this.ownerId = this.seedUser({ name: 'Owner' });
		this.otherId = this.seedUser({ name: 'Other' });
	}

	seedUser(options: SeedUserOptions = {}): string {
		const id = options.id ?? crypto.randomUUID();
		this.db
			.insert(user)
			.values({
				id,
				email: options.email ?? `${id}@test.local`,
				name: options.name ?? 'Test User',
				emailVerified: true
			})
			.run();
		return id;
	}

	async seedStudySet(overrides: Partial<StudySet> = {}): Promise<StudySet> {
		const id = overrides.id ?? crypto.randomUUID();
		return this.repo.insertStudySet({
			id,
			slug: overrides.slug ?? `slug-${id.slice(0, 8)}`,
			title: overrides.title ?? 'Seeded Set',
			description: overrides.description ?? null,
			visibility: overrides.visibility ?? 'PUBLIC',
			ownerId: overrides.ownerId ?? 'seed-owner',
			files: overrides.files ?? []
		});
	}

	async [Symbol.asyncDispose](): Promise<void> {
		this.db.$client.close();
	}
}
