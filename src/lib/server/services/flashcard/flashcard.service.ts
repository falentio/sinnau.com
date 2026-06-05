import { FLASHCARD_ID_PREFIX } from '$lib/schemas/flashcard';
import { FLASHCARD_IMPORTANCE_DEFAULT } from '$lib/schemas/flashcard.constant';
import { ORPCError } from '@orpc/server';
import type {
	CreateFlashcardsInput,
	DeleteFlashcardsInput,
	GetFlashcardInput,
	GetFlashcardsInput,
	UpdateFlashcardInput
} from '../../../schemas/flashcard.ts';
import type { Flashcard } from '../../infras/db/schema/flashcard.ts';
import { generateId } from '../../utils/nanoid.ts';
import type { FlashcardGuard } from './flashcard.guard.ts';
import type { FlashcardRepository } from './flashcard.repository.ts';

export type { Flashcard };

export class FlashcardService {
	private readonly guard: FlashcardGuard;

	constructor(
		private readonly repo: FlashcardRepository,
		guard: FlashcardGuard
	) {
		this.guard = guard;
	}

	async createFlashcards(input: CreateFlashcardsInput, ownerId: string): Promise<Flashcard[]> {
		await this.guard.assertStudySetOwnerOrForbidden(input.studySetId, ownerId);

		const chapterIds = Array.from(
			new Set(input.flashcards.map((f) => f.chapterId).filter((v): v is string => !!v))
		);
		for (const chapterId of chapterIds) {
			// oxlint-disable-next-line no-await-in-loop -- guard checks must abort on first mismatch sequentially
			await this.guard.assertChapterOwnerInStudySetOrForbidden(
				chapterId,
				ownerId,
				input.studySetId
			);
		}

		const rows: Omit<Flashcard, 'createdAt' | 'updatedAt'>[] = input.flashcards.map((item) => ({
			id: generateId(FLASHCARD_ID_PREFIX),
			chapterId: item.chapterId ?? null,
			studySetId: input.studySetId,
			front: item.front,
			back: item.back,
			hint: item.hint === '' || item.hint === undefined ? null : (item.hint ?? null),
			importance: item.importance ?? FLASHCARD_IMPORTANCE_DEFAULT,
			ownerId
		}));

		return this.repo.insertFlashcards(rows);
	}

	async updateFlashcard(input: UpdateFlashcardInput, ownerId: string): Promise<Flashcard> {
		await this.guard.assertFlashcardOwnerOrForbidden(input.id, ownerId);

		const patch: Partial<Flashcard> = {
			front: input.front,
			back: input.back
		};
		if (input.hint !== undefined) {
			patch.hint = input.hint === '' || input.hint === null ? null : input.hint;
		}
		if (input.importance !== undefined) {
			patch.importance = input.importance;
		}

		const updated = await this.repo.updateFlashcard(input.id, ownerId, patch);
		if (!updated) {
			throw new ORPCError('NOT_FOUND', { message: 'Flashcard not found' });
		}
		return updated;
	}

	async deleteFlashcards(input: DeleteFlashcardsInput, ownerId: string): Promise<void> {
		await this.guard.assertFlashcardsAllOwnedOrThrow(input.ids, ownerId);
		await this.repo.deleteFlashcards(input.ids, ownerId);
	}

	async getFlashcards(input: GetFlashcardsInput, userId: string): Promise<Flashcard[]> {
		await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, userId);
		return this.repo.findFlashcardsByStudySet(input.studySetId);
	}

	async getFlashcard(input: GetFlashcardInput, userId: string): Promise<Flashcard> {
		return this.guard.assertFlashcardVisibleOrNotFound(input.id, userId);
	}
}
