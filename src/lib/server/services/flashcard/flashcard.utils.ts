import { FLASHCARD_ID_PREFIX } from '$lib/schemas/flashcard';
import type { Flashcard } from '../../infras/db/schema/flashcard.ts';
import { generateId } from '../../utils/nanoid.ts';

let stubs: Flashcard[] | null = null;

export function getFlashcardStubs(count: number, studySetId: string, ownerId: string): Flashcard[] {
	if (!stubs) {
		const now = new Date();
		stubs = Array.from({ length: count }, (_, i) => ({
			id: generateId(FLASHCARD_ID_PREFIX),
			chapterId: null,
			studySetId,
			front: `Flashcard depan #${i + 1}`,
			back: `Flashcard belakang #${i + 1}`,
			hint: null,
			importance: 0,
			ownerId,
			createdAt: new Date(now.getTime() - (count - i) * 3_600_000),
			updatedAt: new Date(now.getTime() - (count - i) * 1_800_000)
		}));
	}
	return stubs;
}
