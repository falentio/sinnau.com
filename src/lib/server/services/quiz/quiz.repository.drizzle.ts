import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db as defaultDb, type DB } from '../../infras/db/client.ts';
import { chapter } from '../../infras/db/schema/chapter.ts';
import type { Chapter } from '../../infras/db/schema/chapter.ts';
import { quiz, quizOption } from '../../infras/db/schema/quiz.ts';
import type { Quiz, QuizOption } from '../../infras/db/schema/quiz.ts';
import type {
	NewQuizOptionRow,
	NewQuizRow,
	QuizOptionUpdatePatch,
	QuizRepository,
	QuizUpdatePatch
} from './quiz.repository.ts';

export class QuizDrizzleRepository implements QuizRepository {
	constructor(private readonly dbInstance: DB = defaultDb) {}

	static withDatabase(db: DB): QuizDrizzleRepository {
		return new QuizDrizzleRepository(db);
	}

	async insertQuiz(row: NewQuizRow, options: NewQuizOptionRow[]): Promise<Quiz> {
		const inserted = this.dbInstance.transaction((tx) => {
			const rowsReturned = tx.insert(quiz).values(row).returning().all();
			const [created] = rowsReturned;
			if (!created) throw new Error('Failed to insert quiz');
			if (options.length > 0) {
				tx.insert(quizOption).values(options).run();
			}
			return created;
		});
		return Promise.resolve(inserted);
	}

	async updateQuiz(id: string, ownerId: string, patch: QuizUpdatePatch): Promise<Quiz | null> {
		const [updated] = await this.dbInstance
			.update(quiz)
			.set(patch)
			.where(and(eq(quiz.id, id), eq(quiz.ownerId, ownerId)))
			.returning();
		return updated ?? null;
	}

	async deleteQuizzes(ids: string[], ownerId: string): Promise<boolean> {
		if (ids.length === 0) return false;
		try {
			this.dbInstance.transaction((tx) => {
				const deleted = tx
					.delete(quiz)
					.where(and(inArray(quiz.id, ids), eq(quiz.ownerId, ownerId)))
					.returning({ id: quiz.id })
					.all();
				if (deleted.length !== ids.length) {
					throw new Error('QUIZ_DELETE_PARTIAL_FORBIDDEN');
				}
			});
			return true;
		} catch (err) {
			if (err instanceof Error && err.message === 'QUIZ_DELETE_PARTIAL_FORBIDDEN') {
				return false;
			}
			throw err;
		}
	}

	async findQuizById(id: string): Promise<Quiz | null> {
		const [row] = await this.dbInstance.select().from(quiz).where(eq(quiz.id, id)).limit(1);
		return row ?? null;
	}

	async findQuizzesByStudySetId(studySetId: string): Promise<Quiz[]> {
		const rows = await this.dbInstance
			.select()
			.from(quiz)
			.where(eq(quiz.studySetId, studySetId))
			.orderBy(desc(quiz.createdAt), asc(quiz.id));
		return rows;
	}

	async findChapterById(id: string): Promise<Chapter | null> {
		const [row] = await this.dbInstance.select().from(chapter).where(eq(chapter.id, id)).limit(1);
		return row ?? null;
	}

	async findOptionsByQuizId(quizId: string): Promise<QuizOption[]> {
		const rows = await this.dbInstance
			.select()
			.from(quizOption)
			.where(eq(quizOption.quizId, quizId))
			.orderBy(asc(quizOption.createdAt), asc(quizOption.id));
		return rows;
	}

	async findOptionsByQuizIds(quizIds: string[]): Promise<QuizOption[]> {
		if (quizIds.length === 0) return [];
		const rows = await this.dbInstance
			.select()
			.from(quizOption)
			.where(inArray(quizOption.quizId, quizIds))
			.orderBy(asc(quizOption.createdAt), asc(quizOption.id));
		return rows;
	}

	async findOptionsByIdsForOwner(ids: string[], ownerId: string): Promise<QuizOption[]> {
		if (ids.length === 0) return [];
		const rows = await this.dbInstance
			.select({
				id: quizOption.id,
				quizId: quizOption.quizId,
				optionText: quizOption.optionText,
				isCorrect: quizOption.isCorrect,
				explanation: quizOption.explanation,
				createdAt: quizOption.createdAt,
				updatedAt: quizOption.updatedAt
			})
			.from(quizOption)
			.innerJoin(quiz, eq(quizOption.quizId, quiz.id))
			.where(and(inArray(quizOption.id, ids), eq(quiz.ownerId, ownerId)))
			.orderBy(asc(quizOption.createdAt), asc(quizOption.id));
		return rows as QuizOption[];
	}

	async findOptionByIdForOwner(id: string, ownerId: string): Promise<QuizOption | null> {
		const [row] = await this.dbInstance
			.select({
				id: quizOption.id,
				quizId: quizOption.quizId,
				optionText: quizOption.optionText,
				isCorrect: quizOption.isCorrect,
				explanation: quizOption.explanation,
				createdAt: quizOption.createdAt,
				updatedAt: quizOption.updatedAt
			})
			.from(quizOption)
			.innerJoin(quiz, eq(quizOption.quizId, quiz.id))
			.where(and(eq(quizOption.id, id), eq(quiz.ownerId, ownerId)))
			.limit(1);
		return (row as QuizOption | undefined) ?? null;
	}

	async insertQuizOptions(rows: NewQuizOptionRow[]): Promise<QuizOption[]> {
		if (rows.length === 0) return [];
		const inserted = await this.dbInstance.insert(quizOption).values(rows).returning();
		return inserted;
	}

	async updateQuizOption(
		id: string,
		ownerId: string,
		patch: QuizOptionUpdatePatch
	): Promise<QuizOption | null> {
		const target = await this.findOptionByIdForOwner(id, ownerId);
		if (!target) return null;
		const [updated] = await this.dbInstance
			.update(quizOption)
			.set(patch)
			.where(eq(quizOption.id, id))
			.returning();
		return updated ?? null;
	}

	async deleteQuizOptions(ids: string[], ownerId: string): Promise<boolean> {
		if (ids.length === 0) return false;
		const owned = await this.findOptionsByIdsForOwner(ids, ownerId);
		if (owned.length !== ids.length) return false;
		const deleted = await this.dbInstance
			.delete(quizOption)
			.where(inArray(quizOption.id, ids))
			.returning({ id: quizOption.id });
		return deleted.length === ids.length;
	}
}
