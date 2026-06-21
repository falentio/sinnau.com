import { flashcardGuard } from "../flashcard/index.ts";
import { studySetGuard } from "../study-set/index.ts";
import { FlashcardSessionGuard } from "./flashcard-session.guard.ts";
import { FlashcardSessionDrizzleRepository } from "./flashcard-session.repository.drizzle.ts";
import { FlashcardSessionService } from "./flashcard-session.service.ts";

const flashcardSessionRepo = new FlashcardSessionDrizzleRepository();
export const flashcardSessionGuard = new FlashcardSessionGuard(
  flashcardSessionRepo,
  studySetGuard,
  flashcardGuard
);
export const flashcardSessionService = new FlashcardSessionService(
  flashcardSessionRepo,
  flashcardSessionGuard
);
