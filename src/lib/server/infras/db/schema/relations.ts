import { relations } from "drizzle-orm";

import { user } from "./auth-schema.ts";
import { chapter } from "./chapter.ts";
import { flashcard } from "./flashcard.ts";
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
