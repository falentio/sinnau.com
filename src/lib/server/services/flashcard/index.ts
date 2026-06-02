import { FlashcardDrizzleRepository } from './flashcard.repository.drizzle.ts';
import { FlashcardGuard } from './flashcard.guard.ts';
import { FlashcardService } from './flashcard.service.ts';
import { studySetGuard } from '../study-set/index.ts';

const flashcardRepo = new FlashcardDrizzleRepository();
export const flashcardGuard = new FlashcardGuard(flashcardRepo, studySetGuard);
export const flashcardService = new FlashcardService(flashcardRepo, flashcardGuard);
