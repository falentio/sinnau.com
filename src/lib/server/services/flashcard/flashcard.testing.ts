import { CHAPTER_ID_PREFIX } from '$lib/schemas/chapter';
import { FLASHCARD_ID_PREFIX } from '$lib/schemas/flashcard';
import { STUDY_SET_ID_PREFIX } from '$lib/schemas/study-set';
import { user } from '$lib/server/infras/db/schema/auth-schema';
import { getTestingDb } from '$lib/server/infras/db/testing';
import { type MockedFunction, vi } from 'vitest';
import { chapter } from '../../infras/db/schema/chapter.ts';
import type { Flashcard } from '../../infras/db/schema/flashcard.ts';
import { generateId } from '../../utils/nanoid.ts';
import type { StudySetGuard } from '../study-set/study-set.guard.ts';
import { StudySetDrizzleRepository } from '../study-set/study-set.repository.drizzle';
import type { FlashcardGuard } from './flashcard.guard.ts';
import { FlashcardDrizzleRepository } from './flashcard.repository.drizzle';
import type { FlashcardRepository } from './flashcard.repository.ts';

export type MockedFlashcardRepository = {
	[K in keyof FlashcardRepository]: MockedFunction<FlashcardRepository[K]>;
};

export function createMockRepository(): MockedFlashcardRepository {
	return {
		insertFlashcards: vi.fn<FlashcardRepository['insertFlashcards']>(),
		updateFlashcard: vi.fn<FlashcardRepository['updateFlashcard']>(),
		deleteFlashcards: vi.fn<FlashcardRepository['deleteFlashcards']>(),
		findFlashcardById: vi.fn<FlashcardRepository['findFlashcardById']>(),
		findFlashcardsByIds: vi.fn<FlashcardRepository['findFlashcardsByIds']>(),
		findFlashcardsByStudySet: vi.fn<FlashcardRepository['findFlashcardsByStudySet']>(),
		findChapter: vi.fn<FlashcardRepository['findChapter']>()
	};
}

export type MockedFlashcardGuard = {
	[K in keyof FlashcardGuard]: MockedFunction<FlashcardGuard[K]>;
};

export function createMockGuard(): MockedFlashcardGuard {
	return {
		assertStudySetOwnerOrForbidden: vi.fn<FlashcardGuard['assertStudySetOwnerOrForbidden']>(),
		assertStudySetVisibleOrNotFound: vi.fn<FlashcardGuard['assertStudySetVisibleOrNotFound']>(),
		assertChapterOwnerInStudySetOrForbidden: vi.fn<FlashcardGuard['assertChapterOwnerInStudySetOrForbidden']>(),
		assertFlashcardOwnerOrForbidden: vi.fn<FlashcardGuard['assertFlashcardOwnerOrForbidden']>(),
		assertFlashcardVisibleOrNotFound: vi.fn<FlashcardGuard['assertFlashcardVisibleOrNotFound']>(),
		assertFlashcardsAllOwnedOrThrow: vi.fn<FlashcardGuard['assertFlashcardsAllOwnedOrThrow']>()
	};
}

export type MockedStudySetGuard = {
	[K in keyof StudySetGuard]: MockedFunction<StudySetGuard[K]>;
};

export function createMockStudySetGuard(): MockedStudySetGuard {
	return {
		assertOwnerOrForbidden: vi.fn<StudySetGuard['assertOwnerOrForbidden']>(),
		assertStudySetOwnerOrForbidden: vi.fn<StudySetGuard['assertStudySetOwnerOrForbidden']>(),
		assertVisibleByIdOrNotFound: vi.fn<StudySetGuard['assertVisibleByIdOrNotFound']>(),
		assertStudySetVisibleByIdOrNotFound: vi.fn<StudySetGuard['assertStudySetVisibleByIdOrNotFound']>(),
		assertVisibleBySlugOrNotFound: vi.fn<StudySetGuard['assertVisibleBySlugOrNotFound']>(),
		canView: vi.fn<StudySetGuard['canView']>()
	};
}

export function createFlashcardFixture(overrides: Partial<Flashcard> = {}): Flashcard {
	return {
		id: generateId(FLASHCARD_ID_PREFIX),
		chapterId: null,
		studySetId: 'set-1',
		front: 'Front of card',
		back: 'Back of card',
		hint: null,
		importance: 0,
		ownerId: 'owner-1',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

export const EMPTY_FLASHCARD_LIST: Flashcard[] = [];

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

interface SeedStudySetOptions {
	visibility?: 'PUBLIC' | 'PRIVATE';
}

export class FlashcardTestEnv implements AsyncDisposable {
	readonly db: ReturnType<typeof getTestingDb>;
	readonly repo: FlashcardDrizzleRepository;
	readonly studySetRepo: StudySetDrizzleRepository;
	readonly ownerId: string;
	readonly otherId: string;
	readonly studySetId: string;
	readonly otherStudySetId: string;

	constructor() {
		this.db = getTestingDb();
		this.repo = new FlashcardDrizzleRepository(this.db);
		this.studySetRepo = new StudySetDrizzleRepository(this.db);
		this.ownerId = this.seedUser({ name: 'Owner' });
		this.otherId = this.seedUser({ name: 'Other' });
		this.studySetId = generateId(STUDY_SET_ID_PREFIX);
		this.otherStudySetId = generateId(STUDY_SET_ID_PREFIX);
	}

	async seedOwnedStudySet(options: SeedStudySetOptions = {}): Promise<string> {
		await this.studySetRepo.insertStudySet({
			id: this.studySetId,
			slug: 'slug-owned',
			title: 'Owned set',
			description: null,
			visibility: options.visibility ?? 'PUBLIC',
			ownerId: this.ownerId,
			files: []
		});
		return this.studySetId;
	}

	async seedOtherStudySet(options: SeedStudySetOptions = {}): Promise<string> {
		await this.studySetRepo.insertStudySet({
			id: this.otherStudySetId,
			slug: 'slug-other',
			title: 'Other set',
			description: null,
			visibility: options.visibility ?? 'PUBLIC',
			ownerId: this.otherId,
			files: []
		});
		return this.otherStudySetId;
	}

	seedUser(options: SeedUserOptions = {}): string {
		const id = options.id ?? crypto.randomUUID();
		this.db
			.insert(user)
			.values({
				id,

				// User IDs are auth domain (not prefixed with project prefix)

				email: options.email ?? `${id}@test.local`,
				name: options.name ?? 'Test User',
				emailVerified: true
			})
			.run();
		return id;
	}

	async seedStudySet(
		id: string,
		ownerId: string,
		slugSuffix: string,
		options: SeedStudySetOptions = {}
	): Promise<string> {
		await this.studySetRepo.insertStudySet({
			id,
			slug: `slug-${slugSuffix}`,
			title: `Set ${slugSuffix}`,
			description: null,
			visibility: options.visibility ?? 'PUBLIC',
			ownerId,
			files: []
		});
		return id;
	}

	async seedFlashcard(overrides: Partial<Flashcard> = {}): Promise<Flashcard> {
		const id = overrides.id ?? generateId(FLASHCARD_ID_PREFIX);
		const rows = await this.repo.insertFlashcards([
			{
				id,
				chapterId: overrides.chapterId ?? null,
				studySetId: overrides.studySetId ?? this.studySetId,
				front: overrides.front ?? 'Front',
				back: overrides.back ?? 'Back',
				hint: overrides.hint ?? null,
				importance: overrides.importance ?? 0,
				ownerId: overrides.ownerId ?? this.ownerId
			}
		]);
		const [row] = rows;
		if (!row) throw new Error('Expected seeded flashcard to be inserted');
		return row;
	}

	seedChapter(options: { id?: string; studySetId?: string; ownerId?: string } = {}): string {
		const id = options.id ?? generateId(CHAPTER_ID_PREFIX);
		this.db
			.insert(chapter)
			.values({
				id,
				slug: `chapter-${id.slice(0, 8)}`,
				title: 'Seeded chapter',
				description: null,
				studySetId: options.studySetId ?? this.studySetId,
				ownerId: options.ownerId ?? this.ownerId
			})
			.run();
		return id;
	}

	async [Symbol.asyncDispose](): Promise<void> {
		this.db.$client.close();
		return Promise.resolve();
	}
}
