import { STUDY_SET_ID_PREFIX } from '$lib/schemas/study-set';
import { STUDY_SET_CONTENT_ID_PREFIX } from '$lib/schemas/study-set-content.constant';
import { user } from '$lib/server/infras/db/schema/auth-schema';
import { studySet } from '$lib/server/infras/db/schema/study-set';
import { getTestingDb } from '$lib/server/infras/db/testing';
import { eq } from 'drizzle-orm';
import { type MockedFunction, vi } from 'vitest';
import { chapter } from '../../infras/db/schema/chapter.ts';
import type {
	StudySetContent,
	StudySetContentWithChapters
} from '../../infras/db/schema/study-set-content.ts';
import type { StudySetVisibility } from '../../infras/db/schema/study-set.ts';
import { generateId } from '../../utils/nanoid.ts';
import { ChapterDrizzleRepository } from '../chapter/chapter.repository.drizzle.ts';
import { StudySetDrizzleRepository } from '../study-set/study-set.repository.drizzle.ts';
import type { StudySetContentGuard } from './study-set-content.guard.ts';
import { StudySetContentDrizzleRepository } from './study-set-content.repository.drizzle.ts';
import type { StudySetContentRepository } from './study-set-content.repository.ts';

export type MockedStudySetContentRepository = {
	[K in keyof StudySetContentRepository]: MockedFunction<StudySetContentRepository[K]>;
};

export function createMockRepository(): MockedStudySetContentRepository {
	return {
		insertContent: vi.fn(),
		updateContent: vi.fn(),
		deleteContent: vi.fn(),
		findContentById: vi.fn(),
		findContentByIdWithChapters: vi.fn(),
		findContentsByStudySet: vi.fn(),
		findContentsByChapter: vi.fn(),
		linkChapter: vi.fn(),
		unlinkChapter: vi.fn(),
		setChapters: vi.fn(),
		findChapterById: vi.fn()
	};
}

export type MockedStudySetContentGuard = {
	[K in keyof StudySetContentGuard]: MockedFunction<StudySetContentGuard[K]>;
};

export function createMockGuard(): MockedStudySetContentGuard {
	return {
		assertContentOwnerOrForbidden: vi.fn(),
		assertContentVisibleByIdOrNotFound: vi.fn(),
		assertStudySetOwnerOrForbidden: vi.fn(),
		assertStudySetVisibleByIdOrNotFound: vi.fn()
	};
}

export function createStudySetContentFixture(
	overrides: Partial<StudySetContent> = {}
): StudySetContent {
	return {
		id: generateId(STUDY_SET_CONTENT_ID_PREFIX),
		studySetId: 'set-1',
		content: 'Some study content text',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

export function createStudySetContentWithChaptersFixture(
	overrides: Partial<StudySetContentWithChapters> = {}
): StudySetContentWithChapters {
	return {
		id: generateId(STUDY_SET_CONTENT_ID_PREFIX),
		studySetId: 'set-1',
		content: 'Some study content text',
		chapterIds: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

export const EMPTY_CONTENT_LIST: StudySetContentWithChapters[] = [];

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

export class StudySetContentTestEnv implements AsyncDisposable {
	readonly db: ReturnType<typeof getTestingDb>;
	readonly repo: StudySetContentDrizzleRepository;
	readonly studySetRepo: StudySetDrizzleRepository;
	readonly chapterRepo: ChapterDrizzleRepository;
	readonly ownerId: string;
	readonly otherId: string;
	readonly studySetId: string;
	readonly otherStudySetId: string;

	constructor() {
		this.db = getTestingDb();
		this.repo = new StudySetContentDrizzleRepository(this.db);
		this.studySetRepo = new StudySetDrizzleRepository(this.db);
		this.chapterRepo = new ChapterDrizzleRepository(this.db);
		this.ownerId = this.seedUser({ name: 'Owner' });
		this.otherId = this.seedUser({ name: 'Other' });
		this.studySetId = generateId(STUDY_SET_ID_PREFIX);
		this.otherStudySetId = generateId(STUDY_SET_ID_PREFIX);
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
		const id = options.id ?? generateId(STUDY_SET_ID_PREFIX);
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

	seedChapterSync(chapterId: string, studySetId: string, ownerId: string): void {
		this.db
			.insert(chapter)
			.values({
				id: chapterId,
				slug: `ch-${chapterId.slice(0, 8)}`,
				title: `Chapter ${chapterId.slice(0, 8)}`,
				description: null,
				studySetId,
				ownerId
			})
			.run();
	}

	async seedContent(overrides: Partial<StudySetContent> = {}): Promise<StudySetContent> {
		return this.repo.insertContent({
			id: overrides.id ?? generateId(STUDY_SET_CONTENT_ID_PREFIX),
			studySetId: overrides.studySetId ?? this.studySetId,
			content: overrides.content ?? 'Default content text'
		});
	}

	[Symbol.asyncDispose](): Promise<void> {
		this.db.$client.close();
		return Promise.resolve();
	}
}
