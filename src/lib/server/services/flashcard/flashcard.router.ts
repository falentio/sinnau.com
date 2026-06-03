import { flashcardCreate } from './commands/flashcard.create.ts';
import { flashcardUpdate } from './commands/flashcard.update.ts';
import { flashcardDelete } from './commands/flashcard.delete.ts';
import { flashcardList } from './queries/flashcard.list.ts';
import { flashcardGet } from './queries/flashcard.get.ts';

export const flashcardRouter = {
	create: flashcardCreate,
	update: flashcardUpdate,
	delete: flashcardDelete,
	list: flashcardList,
	get: flashcardGet
};

export type FlashcardRouter = typeof flashcardRouter;
