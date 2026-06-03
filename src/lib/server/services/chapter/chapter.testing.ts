import { eq } from 'drizzle-orm';
import { type MockedFunction, vi } from 'vitest';
import { getTestingDb } from '$lib/server/infras/db/testing';
import { user } from '$lib/server/infras/db/schema/auth-schema';
import { flashcard } from '../../infras/db/schema/flashcard.ts';
import { studySet } from '../../infras/db/schema/study-set.ts';
import type { Chapter } from '../../infras/db/schema/chapter.ts';
import type { StudySetVisibility } from '../../infras/db/schema/study-set.ts';
import { StudySetDrizzleRepository } from '../study-set/study-set.repository.drizzle';
import { ChapterDrizzleRepository } from './chapter.repository.drizzle';
import type { ChapterGuard } from './chapter.guard.ts';
import type { ChapterRepository } from './chapter.repository.ts';

export type MockedChapterRepository = {
	[K in keyof ChapterRepository]: MockedFunction<ChapterRepository[K]>;
};

export function createMockRepository(): MockedChapterRepository {
	return {
		insertChapter: vi.fn(),
		updateChapter: vi.fn(),
		deleteChapter: vi.fn(),
		findChapterById: vi.fn(),
		findChaptersVisibleTo: vi.fn(),
		isSlugTakenInStudySet: vi.fn(),
		countChildren: vi.fn()
	};
}

export type MockedChapterGuard = {
	[K in keyof ChapterGuard]: MockedFunction<ChapterGuard[K]>;
};

export function createMockGuard(): MockedChapterGuard {
	return {
		assertOwnerOrForbidden: vi.fn(),
		assertVisibleByIdOrNotFound: vi.fn(),
		assertStudySetOwnerOrForbidden: vi.fn()
	};
}

export function createChapterFixture(overrides: Partial<Chapter> = {}): Chapter {
	return {
		id: crypto.randomUUID(),
		slug: 'chapter-slug-abc123',
		title: 'Chapter Title',
		description: null,
		studySetId: 'set-1',
		ownerId: 'owner-1',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

export const EMPTY_CHAPTER_LIST: Chapter[] = [];

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
	id?: string;
	slug?: string;
	visibility?: StudySetVisibility;
	ownerId: string;
}

interface SeedChapterOptions {
	id?: string;
	slug?: string;
	title?: string;
	description?: string | null;
	studySetId?: string;
	ownerId?: string;
}

export class ChapterTestEnv implements AsyncDisposable {
	readonly db: ReturnType<typeof getTestingDb>;
	readonly repo: ChapterDrizzleRepository;
	readonly studySetRepo: StudySetDrizzleRepository;
	readonly ownerId: string;
	readonly otherId: string;
	readonly studySetId: string;
	readonly otherStudySetId: string;

	constructor() {
		this.db = getTestingDb();
		this.repo = new ChapterDrizzleRepository(this.db);
		this.studySetRepo = new StudySetDrizzleRepository(this.db);
		this.ownerId = this.seedUser({ name: 'Owner' });
		this.otherId = this.seedUser({ name: 'Other' });
		this.studySetId = crypto.randomUUID();
		this.otherStudySetId = crypto.randomUUID();
		this.insertStudySetSync(this.studySetId, this.ownerId, 'PUBLIC');
		this.insertStudySetSync(this.otherStudySetId, this.otherId, 'PRIVATE');
	}

	private insertStudySetSync(id: string, ownerId: string, visibility: StudySetVisibility): void {
		this.db
			.insert(studySet)
			.values({
				id,
				slug: `set-${id.slice(0, 8)}`,
				title: `Set ${id.slice(0, 8)}`,
				description: null,
				visibility,
				ownerId,
				files: []
			})
			.run();
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

	async seedStudySet(options: SeedStudySetOptions): Promise<{
		id: string;
		slug: string;
		visibility: StudySetVisibility;
	}> {
		const id = options.id ?? crypto.randomUUID();
		const slug = options.slug ?? `slug-${id.slice(0, 8)}`;
		const visibility: StudySetVisibility = options.visibility ?? 'PUBLIC';
		this.db.delete(studySet).where(eq(studySet.id, id)).run();
		await this.studySetRepo.insertStudySet({
			id,
			slug,
			title: `Set ${slug}`,
			description: null,
			visibility,
			ownerId: options.ownerId,
			files: []
		});
		return { id, slug, visibility };
	}

	async seedChapter(overrides: SeedChapterOptions = {}): Promise<Chapter> {
		const id = overrides.id ?? crypto.randomUUID();
		const chapter = await this.repo.insertChapter({
			id,
			slug: overrides.slug ?? `chapter-${id.slice(0, 8)}`,
			title: overrides.title ?? 'Seeded Chapter',
			description: overrides.description ?? null,
			studySetId: overrides.studySetId ?? this.studySetId,
			ownerId: overrides.ownerId ?? this.ownerId
		});
		return chapter;
	}

	seedFlashcardInChapter(
		chapterId: string,
		ownerId: string = this.ownerId,
		studySetId: string = this.studySetId
	): string {
		const id = crypto.randomUUID();
		this.db
			.insert(flashcard)
			.values({
				id,
				chapterId,
				studySetId,
				front: 'Front',
				back: 'Back',
				hint: null,
				importance: 0,
				ownerId
			})
			.run();
		return id;
	}

	async [Symbol.asyncDispose](): Promise<void> {
		this.db.$client.close();
	}
}
