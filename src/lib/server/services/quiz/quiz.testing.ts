import { CHAPTER_ID_PREFIX } from '$lib/schemas/chapter';
import { QUIZ_ID_PREFIX, QUIZ_OPTION_ID_PREFIX } from '$lib/schemas/quiz';
import { STUDY_SET_ID_PREFIX } from '$lib/schemas/study-set';
import { user } from '$lib/server/infras/db/schema/auth-schema';
import { chapter } from '$lib/server/infras/db/schema/chapter';
import { studySet } from '$lib/server/infras/db/schema/study-set';
import { getTestingDb } from '$lib/server/infras/db/testing';
import { eq } from 'drizzle-orm';
import { type MockedFunction, vi } from 'vitest';
import type { Chapter } from '../../infras/db/schema/chapter.ts';
import type { Quiz, QuizOption } from '../../infras/db/schema/quiz.ts';
import type { StudySet } from '../../infras/db/schema/study-set.ts';
import { generateId } from '../../utils/nanoid.ts';
import type { QuizGuard } from './quiz.guard.ts';
import { QuizDrizzleRepository } from './quiz.repository.drizzle';
import type { QuizRepository } from './quiz.repository.ts';

export type MockedQuizRepository = {
	[K in keyof QuizRepository]: MockedFunction<QuizRepository[K]>;
};

export function createMockRepository(): MockedQuizRepository {
	return {
		insertQuiz: vi.fn<QuizRepository['insertQuiz']>(),
		updateQuiz: vi.fn<QuizRepository['updateQuiz']>(),
		deleteQuizzes: vi.fn<QuizRepository['deleteQuizzes']>(),
		findQuizById: vi.fn<QuizRepository['findQuizById']>(),
		findQuizzesByIds: vi.fn<QuizRepository['findQuizzesByIds']>(),
		findQuizzesByStudySetId: vi.fn<QuizRepository['findQuizzesByStudySetId']>(),
		findChapterById: vi.fn<QuizRepository['findChapterById']>(),
		findOptionsByQuizIds: vi.fn<QuizRepository['findOptionsByQuizIds']>(),
		findOptionsByIdsForOwner: vi.fn<QuizRepository['findOptionsByIdsForOwner']>(),
		findOptionByIdForOwner: vi.fn<QuizRepository['findOptionByIdForOwner']>(),
		insertQuizOptions: vi.fn<QuizRepository['insertQuizOptions']>(),
		updateQuizOption: vi.fn<QuizRepository['updateQuizOption']>(),
		deleteQuizOptions: vi.fn<QuizRepository['deleteQuizOptions']>()
	};
}

export type MockedQuizGuard = {
	[K in keyof QuizGuard]: MockedFunction<QuizGuard[K]>;
};

export function createMockGuard(): MockedQuizGuard {
	return {
		assertStudySetOwnerOrForbidden: vi.fn<QuizGuard['assertStudySetOwnerOrForbidden']>(),
		assertStudySetVisibleOrNotFound: vi.fn<QuizGuard['assertStudySetVisibleOrNotFound']>(),
		assertChapterOwnerOrForbidden: vi.fn<QuizGuard['assertChapterOwnerOrForbidden']>(),
		assertChapterInStudySetOrForbidden: vi.fn<QuizGuard['assertChapterInStudySetOrForbidden']>(),
		assertQuizOwnerOrForbidden: vi.fn<QuizGuard['assertQuizOwnerOrForbidden']>(),
		assertQuizOwnerBatchOrPartialForbidden: vi.fn<QuizGuard['assertQuizOwnerBatchOrPartialForbidden']>(),
		assertQuizOptionOwnerBatchOrPartialForbidden: vi.fn<QuizGuard['assertQuizOptionOwnerBatchOrPartialForbidden']>(),
		assertQuizVisibleByIdOrNotFound: vi.fn<QuizGuard['assertQuizVisibleByIdOrNotFound']>()
	};
}

export function createQuizFixture(overrides: Partial<Quiz> = {}): Quiz {
	return {
		id: generateId(QUIZ_ID_PREFIX),
		chapterId: null,
		studySetId: generateId(STUDY_SET_ID_PREFIX),
		type: 'MULTIPLE_CHOICE',
		questionText: 'What is 2 + 2?',
		ownerId: 'owner-1',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

export function createQuizOptionFixture(overrides: Partial<QuizOption> = {}): QuizOption {
	return {
		id: generateId(QUIZ_OPTION_ID_PREFIX),
		quizId: generateId(QUIZ_ID_PREFIX),
		optionText: 'Option text',
		isCorrect: false,
		explanation: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

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
	title?: string;
	visibility?: StudySet['visibility'];
	ownerId?: string;
}

interface SeedChapterOptions {
	id?: string;
	slug?: string;
	title?: string;
	studySetId?: string;
	ownerId?: string;
}

export class QuizTestEnv implements AsyncDisposable {
	readonly db: ReturnType<typeof getTestingDb>;
	readonly repo: QuizDrizzleRepository;
	readonly ownerId: string;
	readonly otherId: string;

	constructor() {
		this.db = getTestingDb();
		this.repo = new QuizDrizzleRepository(this.db);
		this.ownerId = this.seedUser({ name: 'Owner' });
		this.otherId = this.seedUser({ name: 'Other' });
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

	async seedStudySet(overrides: SeedStudySetOptions = {}): Promise<StudySet> {
		const id = overrides.id ?? generateId(STUDY_SET_ID_PREFIX);
		this.db
			.insert(studySet)
			.values({
				id,
				slug: overrides.slug ?? `slug-${id.slice(0, 8)}`,
				title: overrides.title ?? 'Seeded Set',
				description: null,
				visibility: overrides.visibility ?? 'PUBLIC',
				ownerId: overrides.ownerId ?? this.ownerId,
				files: []
			})
			.run();
		const [row] = this.db.select().from(studySet).where(eq(studySet.id, id)).all();
		if (!row) throw new Error('Failed to seed study set');
		return row;
	}

	async seedChapter(overrides: SeedChapterOptions = {}): Promise<Chapter> {
		const id = overrides.id ?? generateId(CHAPTER_ID_PREFIX);
		this.db
			.insert(chapter)
			.values({
				id,
				slug: overrides.slug ?? `chapter-${id.slice(0, 8)}`,
				title: overrides.title ?? 'Seeded Chapter',
				description: null,
				studySetId: overrides.studySetId ?? (await this.seedStudySet()).id,
				ownerId: overrides.ownerId ?? this.ownerId
			})
			.run();
		const [row] = this.db.select().from(chapter).where(eq(chapter.id, id)).all();
		if (!row) throw new Error('Failed to seed chapter');
		return row;
	}

	async seedQuiz(overrides: Partial<Quiz> = {}): Promise<Quiz> {
		const studySetId =
			overrides.studySetId ?? (await this.seedStudySet({ ownerId: overrides.ownerId })).id;
		const id = overrides.id ?? generateId(QUIZ_ID_PREFIX);
		return this.repo.insertQuiz(
			{
				id,
				chapterId: overrides.chapterId ?? null,
				studySetId,
				type: overrides.type ?? 'MULTIPLE_CHOICE',
				questionText: overrides.questionText ?? 'Seeded question?',
				ownerId: overrides.ownerId ?? this.ownerId
			},
			[]
		);
	}

	async seedQuizOption(overrides: Partial<QuizOption> = {}): Promise<QuizOption> {
		const quizId = overrides.quizId ?? (await this.seedQuiz()).id;
		const id = overrides.id ?? generateId(QUIZ_OPTION_ID_PREFIX);
		const rows = await this.repo.insertQuizOptions([
			{
				id,
				quizId,
				optionText: overrides.optionText ?? 'Seeded option',
				isCorrect: overrides.isCorrect ?? false,
				explanation: overrides.explanation ?? null
			}
		]);
		const [row] = rows;
		if (!row) throw new Error('Expected seeded quiz option to be inserted');
		return row;
	}

	async [Symbol.asyncDispose](): Promise<void> {
		this.db.$client.close();
		return Promise.resolve();
	}
}
