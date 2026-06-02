import { ORPCError } from '@orpc/server';
import type { Flashcard } from '../../infras/db/schema/flashcard.ts';
import type { StudySet } from '../../infras/db/schema/study-set.ts';
import type { StudySetGuard } from '../study-set/study-set.guard.ts';
import type { FlashcardRepository } from './flashcard.repository.ts';

export class FlashcardGuard {
	private readonly resolvedStudySetGuard: StudySetGuard;

	constructor(
		private readonly repo: FlashcardRepository,
		studySetGuardInstance: StudySetGuard
	) {
		this.resolvedStudySetGuard = studySetGuardInstance;
	}

	async assertStudySetOwnerOrForbidden(studySetId: string, ownerId: string): Promise<StudySet> {
		try {
			return await this.resolvedStudySetGuard.assertStudySetOwnerOrForbidden(studySetId, ownerId);
		} catch (err) {
			if (err instanceof ORPCError && err.code === 'FORBIDDEN') {
				throw new ORPCError('FORBIDDEN', {
					message: 'Cannot modify flashcards in a study set you do not own'
				});
			}
			throw err;
		}
	}

	async assertStudySetVisibleOrNotFound(studySetId: string, userId: string): Promise<StudySet> {
		return this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(studySetId, userId);
	}

	async assertChapterOwnerInStudySetOrForbidden(
		chapterId: string,
		ownerId: string,
		expectedStudySetId: string
	): Promise<void> {
		const ch = await this.repo.findChapter(chapterId);
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
	}

	async assertFlashcardOwnerOrForbidden(id: string, ownerId: string): Promise<Flashcard> {
		const card = await this.repo.findFlashcardById(id);
		if (!card || card.ownerId !== ownerId) {
			throw new ORPCError('FORBIDDEN', { message: 'Cannot modify a flashcard you do not own' });
		}
		return card;
	}

	async assertFlashcardVisibleOrNotFound(id: string, userId: string): Promise<Flashcard> {
		const card = await this.repo.findFlashcardById(id);
		if (!card) {
			throw new ORPCError('NOT_FOUND', { message: 'Flashcard not found' });
		}
		try {
			await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(card.studySetId, userId);
		} catch (err) {
			if (err instanceof ORPCError && err.code === 'NOT_FOUND') {
				throw new ORPCError('NOT_FOUND', { message: 'Flashcard not found' });
			}
			throw err;
		}
		return card;
	}

	async assertFlashcardsAllOwnedOrThrow(ids: string[], ownerId: string): Promise<void> {
		const cards = await this.repo.findFlashcardsByIds(ids);
		const owned = new Set(cards.filter((c) => c.ownerId === ownerId).map((c) => c.id));
		const blocked = ids.filter((id) => !owned.has(id));
		if (blocked.length > 0) {
			throw new ORPCError('PARTIAL_FORBIDDEN', {
				message: 'Some flashcards cannot be deleted by the current user',
				data: { ids: blocked }
			});
		}
	}
}
