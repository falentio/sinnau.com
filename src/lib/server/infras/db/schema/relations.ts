/* oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-member-access -- Drizzle relation references */

import { relations } from "drizzle-orm";

import {
  affiliateCommission,
  affiliatePayout,
  affiliateProfile,
  affiliateRelationship,
  affiliateSubscriptionEvent,
} from "./affiliate.ts";
import { user } from "./auth-schema.ts";
import { chapter } from "./chapter.ts";
import {
  flashcardSession,
  flashcardSessionReview,
  flashcardState,
} from "./flashcard-session.ts";
import { flashcard } from "./flashcard.ts";
import { generate, generateChunkResult, generateInput } from "./generate.ts";
import {
  quizSession,
  quizSessionAnswer,
  quizSessionQuiz,
  quizSessionQuizOption,
} from "./quiz-session.ts";
import { quiz, quizOption } from "./quiz.ts";
import {
  studySetContent,
  studySetContentToChapter,
} from "./study-set-content.ts";
import { studySet, studySetVisit } from "./study-set.ts";

export const chapterRelations = relations(chapter, ({ one, many }) => ({
  contentJunctions: many(studySetContentToChapter),
  flashcards: many(flashcard),
  owner: one(user, {
    fields: [chapter.ownerId],
    references: [user.id],
  }),
  quizzes: many(quiz),
  studySet: one(studySet, {
    fields: [chapter.studySetId],
    references: [studySet.id],
  }),
}));

export const flashcardRelations = relations(flashcard, ({ one }) => ({
  chapter: one(chapter, {
    fields: [flashcard.chapterId],
    references: [chapter.id],
  }),
  owner: one(user, {
    fields: [flashcard.ownerId],
    references: [user.id],
  }),
  studySet: one(studySet, {
    fields: [flashcard.studySetId],
    references: [studySet.id],
  }),
}));

export const quizRelations = relations(quiz, ({ one, many }) => ({
  chapter: one(chapter, {
    fields: [quiz.chapterId],
    references: [chapter.id],
  }),
  options: many(quizOption),
  owner: one(user, {
    fields: [quiz.ownerId],
    references: [user.id],
  }),
  studySet: one(studySet, {
    fields: [quiz.studySetId],
    references: [studySet.id],
  }),
}));

export const quizOptionRelations = relations(quizOption, ({ one }) => ({
  quiz: one(quiz, {
    fields: [quizOption.quizId],
    references: [quiz.id],
  }),
}));

export const studySetRelations = relations(studySet, ({ one, many }) => ({
  chapters: many(chapter),
  contents: many(studySetContent),
  flashcards: many(flashcard),
  owner: one(user, {
    fields: [studySet.ownerId],
    references: [user.id],
  }),
  quizzes: many(quiz),
  visits: many(studySetVisit),
}));

export const studySetVisitRelations = relations(studySetVisit, ({ one }) => ({
  studySet: one(studySet, {
    fields: [studySetVisit.studySetId],
    references: [studySet.id],
  }),
  user: one(user, {
    fields: [studySetVisit.userId],
    references: [user.id],
  }),
}));

export const studySetContentRelations = relations(
  studySetContent,
  ({ one, many }) => ({
    chapterJunctions: many(studySetContentToChapter),
    studySet: one(studySet, {
      fields: [studySetContent.studySetId],
      references: [studySet.id],
    }),
  })
);

export const studySetContentToChapterRelations = relations(
  studySetContentToChapter,
  ({ one }) => ({
    chapter: one(chapter, {
      fields: [studySetContentToChapter.chapterId],
      references: [chapter.id],
    }),
    content: one(studySetContent, {
      fields: [studySetContentToChapter.contentId],
      references: [studySetContent.id],
    }),
  })
);

export const quizSessionRelations = relations(quizSession, ({ one, many }) => ({
  chapter: one(chapter, {
    fields: [quizSession.chapterId],
    references: [chapter.id],
  }),
  quizzes: many(quizSessionQuiz),
  studySet: one(studySet, {
    fields: [quizSession.studySetId],
    references: [studySet.id],
  }),
  user: one(user, {
    fields: [quizSession.userId],
    references: [user.id],
  }),
}));

export const quizSessionQuizRelations = relations(
  quizSessionQuiz,
  ({ one, many }) => ({
    answers: many(quizSessionAnswer),
    options: many(quizSessionQuizOption),
    originalQuiz: one(quiz, {
      fields: [quizSessionQuiz.originalQuizId],
      references: [quiz.id],
    }),
    session: one(quizSession, {
      fields: [quizSessionQuiz.sessionId],
      references: [quizSession.id],
    }),
  })
);

export const quizSessionQuizOptionRelations = relations(
  quizSessionQuizOption,
  ({ one }) => ({
    sessionQuiz: one(quizSessionQuiz, {
      fields: [quizSessionQuizOption.sessionQuizId],
      references: [quizSessionQuiz.id],
    }),
  })
);

export const quizSessionAnswerRelations = relations(
  quizSessionAnswer,
  ({ one }) => ({
    session: one(quizSession, {
      fields: [quizSessionAnswer.sessionId],
      references: [quizSession.id],
    }),
    sessionQuiz: one(quizSessionQuiz, {
      fields: [quizSessionAnswer.sessionQuizId],
      references: [quizSessionQuiz.id],
    }),
  })
);

export const flashcardSessionRelations = relations(
  flashcardSession,
  ({ one, many }) => ({
    reviews: many(flashcardSessionReview),
    studySet: one(studySet, {
      fields: [flashcardSession.studySetId],
      references: [studySet.id],
    }),
    user: one(user, {
      fields: [flashcardSession.userId],
      references: [user.id],
    }),
  })
);

export const flashcardSessionReviewRelations = relations(
  flashcardSessionReview,
  ({ one }) => ({
    session: one(flashcardSession, {
      fields: [flashcardSessionReview.sessionId],
      references: [flashcardSession.id],
    }),
  })
);

export const flashcardStateRelations = relations(flashcardState, ({ one }) => ({
  user: one(user, {
    fields: [flashcardState.userId],
    references: [user.id],
  }),
}));

export const generateRelations = relations(generate, ({ many, one }) => ({
  chunkResults: many(generateChunkResult),
  input: one(generateInput, {
    fields: [generate.id],
    references: [generateInput.generateId],
  }),
  owner: one(user, {
    fields: [generate.ownerId],
    references: [user.id],
  }),
  studySet: one(studySet, {
    fields: [generate.studySetId],
    references: [studySet.id],
  }),
}));

export const generateInputRelations = relations(generateInput, ({ one }) => ({
  generate: one(generate, {
    fields: [generateInput.generateId],
    references: [generate.id],
  }),
}));

export const generateChunkResultRelations = relations(
  generateChunkResult,
  ({ one }) => ({
    generate: one(generate, {
      fields: [generateChunkResult.generateId],
      references: [generate.id],
    }),
  })
);

export const affiliateProfileRelations = relations(
  affiliateProfile,
  ({ one }) => ({
    user: one(user, {
      fields: [affiliateProfile.userId],
      references: [user.id],
    }),
  })
);

export const affiliateCommissionRelations = relations(
  affiliateCommission,
  ({ one }) => ({
    affiliateUser: one(user, {
      fields: [affiliateCommission.affiliateUserId],
      references: [user.id],
    }),
    payout: one(affiliatePayout, {
      fields: [affiliateCommission.payoutId],
      references: [affiliatePayout.id],
    }),
    purchaserUser: one(user, {
      fields: [affiliateCommission.purchaserUserId],
      references: [user.id],
    }),
  })
);

export const affiliatePayoutRelations = relations(
  affiliatePayout,
  ({ one }) => ({
    affiliateUser: one(user, {
      fields: [affiliatePayout.affiliateUserId],
      references: [user.id],
    }),
    processedByAdmin: one(user, {
      fields: [affiliatePayout.processedByAdminId],
      references: [user.id],
    }),
  })
);

export const affiliateRelationshipRelations = relations(
  affiliateRelationship,
  ({ many, one }) => ({
    referredUser: one(user, {
      fields: [affiliateRelationship.referredUserId],
      references: [user.id],
    }),
    referrerUser: one(user, {
      fields: [affiliateRelationship.referrerUserId],
      references: [user.id],
    }),
    subscriptionEvents: many(affiliateSubscriptionEvent),
  })
);

export const affiliateSubscriptionEventRelations = relations(
  affiliateSubscriptionEvent,
  ({ one }) => ({
    referredUser: one(user, {
      fields: [affiliateSubscriptionEvent.referredUserId],
      references: [user.id],
    }),
    referrerUser: one(user, {
      fields: [affiliateSubscriptionEvent.referrerUserId],
      references: [user.id],
    }),
    relationship: one(affiliateRelationship, {
      fields: [affiliateSubscriptionEvent.relationshipId],
      references: [affiliateRelationship.id],
    }),
  })
);
