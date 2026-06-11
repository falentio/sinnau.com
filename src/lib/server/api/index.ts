import { chapterRouter } from "$lib/server/services/chapter/chapter.router";
import { flashcardRouter } from "$lib/server/services/flashcard/flashcard.router";
import { quizSessionRouter } from "$lib/server/services/quiz-session/quiz-session.router";
import { quizRouter } from "$lib/server/services/quiz/quiz.router";
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
  chapter: chapterRouter,
  flashcard: flashcardRouter,
  ping: publicProcedure.handler(() => ({
    message: "pong",
    timestamp: Date.now(),
  })),
  quiz: quizRouter,
  quizSession: quizSessionRouter,
  studySet: studySetRouter,
  unimplemented: publicProcedure.handler(() => {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "unimplemented" });
  }),
};

export type Router = typeof router;
