import { affiliateRouter } from "$lib/server/services/affiliate/affiliate.router";
import { chapterRouter } from "$lib/server/services/chapter/chapter.router";
import { flashcardSessionRouter } from "$lib/server/services/flashcard-session/flashcard-session.router";
import { flashcardRouter } from "$lib/server/services/flashcard/flashcard.router";
import { generateRouter } from "$lib/server/services/generate/generate.router";
import { quizSessionRouter } from "$lib/server/services/quiz-session/quiz-session.router";
import { quizRouter } from "$lib/server/services/quiz/quiz.router";
import { studySetSearchRouter } from "$lib/server/services/study-set-search/study-set-search.router";
import { studySetRouter } from "$lib/server/services/study-set/study-set.router";
import { ORPCError } from "@orpc/client";

import {
  publicProcedure,
  authorizedProcedure,
  adminProcedure,
  requireAuth,
} from "./base.ts";

export { publicProcedure, authorizedProcedure, adminProcedure, requireAuth };

export const router = {
  affiliate: affiliateRouter,
  chapter: chapterRouter,
  flashcard: flashcardRouter,
  flashcardSession: flashcardSessionRouter,
  generate: generateRouter,
  ping: publicProcedure.handler(() => ({
    message: "pong",
    timestamp: Date.now(),
  })),
  quiz: quizRouter,
  quizSession: quizSessionRouter,
  studySet: studySetRouter,
  studySetSearch: studySetSearchRouter,
  unimplemented: publicProcedure.handler(() => {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "unimplemented" });
  }),
};

export type Router = typeof router;
