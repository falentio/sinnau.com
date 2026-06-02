import { ORPCError } from '@orpc/server';
import type { Chapter } from '../../infras/db/schema/chapter.ts';
import type { StudySet } from '../../infras/db/schema/study-set.ts';
import type { StudySetGuard } from '../study-set/study-set.guard.ts';
import type { ChapterGuard } from '../chapter/chapter.guard.ts';
import type { Quiz, QuizOption } from '../../infras/db/schema/quiz.ts';
import type { QuizRepository } from './quiz.repository.ts';

export class QuizGuard {
	private readonly resolvedStudySetGuard: StudySetGuard;
	private readonly resolvedChapterGuard: ChapterGuard;

	constructor(
		private readonly repo: QuizRepository,
		studySetGuardInstance: StudySetGuard,
		chapterGuardInstance: ChapterGuard
	) {
		this.resolvedStudySetGuard = studySetGuardInstance;
		this.resolvedChapterGuard = chapterGuardInstance;
	}

	async assertStudySetOwnerOrForbidden(studySetId: string, ownerId: string): Promise<StudySet> {
		try {
			return await this.resolvedStudySetGuard.assertStudySetOwnerOrForbidden(studySetId, ownerId);
		} catch (err) {
			if (err instanceof ORPCError && err.code === 'FORBIDDEN') {
				throw new ORPCError('FORBIDDEN', {
					message: 'Cannot modify a study set you do not own'
				});
			}
			throw err;
		}
	}

	async assertStudySetVisibleOrNotFound(studySetId: string, userId: string): Promise<StudySet> {
		return this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(studySetId, userId);
	}

	async assertChapterOwnerOrForbidden(chapterId: string, ownerId: string): Promise<Chapter> {
		return this.resolvedChapterGuard.assertOwnerOrForbidden(chapterId, ownerId);
	}

	async assertChapterInStudySetOrForbidden(
		chapterId: string,
		ownerId: string,
		expectedStudySetId: string
	): Promise<Chapter> {
		const ch = await this.repo.findChapterById(chapterId);
		if (!ch) {
			throw new ORPCError('NOT_FOUND', { message: 'Chapter not found' });
		}
		if (ch.studySetId !== expectedStudySetId) {
			throw new ORPCError('VALIDATION_FAILED', {
				message: 'Chapter does not belong to the target study set'
			});
		}
		if (ch.ownerId !== ownerId) {
			throw new ORPCError('FORBIDDEN', { message: 'Cannot use a chapter you do not own' });
		}
		return ch;
	}

	async assertQuizOwnerOrForbidden(quizId: string, ownerId: string): Promise<Quiz> {
		const quizRow = await this.repo.findQuizById(quizId);
		if (!quizRow || quizRow.ownerId !== ownerId) {
			throw new ORPCError('FORBIDDEN', { message: 'Cannot modify a quiz you do not own' });
		}
		return quizRow;
	}

	async assertQuizOwnerBatchOrPartialForbidden(ids: string[], ownerId: string): Promise<Quiz[]> {
		const rows = await Promise.all(ids.map((id) => this.repo.findQuizById(id)));
		const blockedIds: string[] = [];
		rows.forEach((row, idx) => {
			if (!row || row.ownerId !== ownerId) blockedIds.push(ids[idx]!);
		});
		if (blockedIds.length > 0) {
			throw new ORPCError('PARTIAL_FORBIDDEN', {
				message: 'Some ids cannot be modified by this user',
				data: { ids: blockedIds }
			});
		}
		return rows as Quiz[];
	}

	async assertQuizOptionOwnerBatchOrPartialForbidden(
		ids: string[],
		ownerId: string
	): Promise<QuizOption[]> {
		const owned = await this.repo.findOptionsByIdsForOwner(ids, ownerId);
		const ownedIds = new Set(owned.map((o) => o.id));
		const blockedIds = ids.filter((id) => !ownedIds.has(id));
		if (blockedIds.length > 0) {
			throw new ORPCError('PARTIAL_FORBIDDEN', {
				message: 'Some ids cannot be modified by this user',
				data: { ids: blockedIds }
			});
		}
		return owned;
	}

	async assertQuizVisibleByIdOrNotFound(quizId: string, userId: string): Promise<Quiz> {
		const quizRow = await this.repo.findQuizById(quizId);
		if (!quizRow) {
			throw new ORPCError('NOT_FOUND', { message: 'Quiz not found' });
		}
		try {
			await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
				quizRow.studySetId,
				userId
			);
		} catch (err) {
			if (err instanceof ORPCError && err.code === 'NOT_FOUND') {
				throw new ORPCError('NOT_FOUND', { message: 'Quiz not found' });
			}
			throw err;
		}
		return quizRow;
	}
}
