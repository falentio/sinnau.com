import type { FlashcardSessionState } from "$lib/schemas/flashcard-session.constant";
import { State } from "ts-fsrs";

export const tsfsStateFromDb = (state: FlashcardSessionState): State => {
  switch (state) {
    case "New": {
      return State.New;
    }
    case "Learning": {
      return State.Learning;
    }
    case "Review": {
      return State.Review;
    }
    case "Relearning": {
      return State.Relearning;
    }
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
};
