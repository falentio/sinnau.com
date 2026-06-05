import { studySetGuard } from '../study-set/index.ts';
import { FlashcardGuard } from './flashcard.guard.ts';
import { FlashcardDrizzleRepository } from './flashcard.repository.drizzle.ts';
import { FlashcardService } from './flashcard.service.ts';

const flashcardRepo = new FlashcardDrizzleRepository();
export const flashcardGuard = new FlashcardGuard(flashcardRepo, studySetGuard);
export const flashcardService = new FlashcardService(flashcardRepo, flashcardGuard);
