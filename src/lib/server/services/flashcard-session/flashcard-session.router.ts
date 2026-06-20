import { flashcardSessionDeleteExpired } from "./commands/flashcard-session.delete-expired.ts";
import { flashcardSessionGetOrCreate } from "./commands/flashcard-session.get-or-create.ts";
import { flashcardSessionSubmitReview } from "./commands/flashcard-session.submit-review.ts";
import { flashcardSessionAdminListSessions } from "./queries/flashcard-session.admin-list-sessions.ts";
import { flashcardSessionGetReviewQueue } from "./queries/flashcard-session.get-review-queue.ts";
import { flashcardSessionGet } from "./queries/flashcard-session.get.ts";
import { flashcardSessionListReviews } from "./queries/flashcard-session.list-reviews.ts";
import { flashcardSessionList } from "./queries/flashcard-session.list.ts";

export const flashcardSessionRouter = {
  admin: {
    deleteExpired: flashcardSessionDeleteExpired,
    listSessions: flashcardSessionAdminListSessions,
  },
  queue: {
    get: flashcardSessionGetReviewQueue,
  },
  review: {
    list: flashcardSessionListReviews,
    submit: flashcardSessionSubmitReview,
  },
  session: {
    get: flashcardSessionGet,
    getOrCreate: flashcardSessionGetOrCreate,
    list: flashcardSessionList,
  },
};

export type FlashcardSessionRouter = typeof flashcardSessionRouter;
