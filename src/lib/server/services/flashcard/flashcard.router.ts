import { flashcardCreate } from './commands/flashcard.create.ts';
import { flashcardDelete } from './commands/flashcard.delete.ts';
import { flashcardUpdate } from './commands/flashcard.update.ts';
import { flashcardGet } from './queries/flashcard.get.ts';
import { flashcardList } from './queries/flashcard.list.ts';

export const flashcardRouter = {
	create: flashcardCreate,
	update: flashcardUpdate,
	delete: flashcardDelete,
	list: flashcardList,
	get: flashcardGet
};

export type FlashcardRouter = typeof flashcardRouter;
