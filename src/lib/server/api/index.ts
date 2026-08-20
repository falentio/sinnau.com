import { affiliateSeedRouter } from "$lib/server/services/affiliate-seed/affiliate-seed.router";
import { affiliateRouter } from "$lib/server/services/affiliate/affiliate.router";
import { aiLimitRouter } from "$lib/server/services/ai-limit/ai-limit.router";
import { chapterRouter } from "$lib/server/services/chapter/chapter.router";
import { flashcardSessionRouter } from "$lib/server/services/flashcard-session/flashcard-session.router";
import { flashcardRouter } from "$lib/server/services/flashcard/flashcard.router";
import { generateRouter } from "$lib/server/services/generate/generate.router";
import { planRouter } from "$lib/server/services/plan/plan.router";
import { quizSessionRouter } from "$lib/server/services/quiz-session/quiz-session.router";
import { quizRouter } from "$lib/server/services/quiz/quiz.router";
import { studySetContentRouter } from "$lib/server/services/study-set-content/study-set-content.router";
import { studySetSearchRouter } from "$lib/server/services/study-set-search/study-set-search.router";
import { studySetRouter } from "$lib/server/services/study-set/study-set.router";
import { userRouter } from "$lib/server/services/user/user.router";

import {
  publicProcedure,
  authorizedProcedure,
  adminProcedure,
  requireAuth,
} from "./base.ts";

export { publicProcedure, authorizedProcedure, adminProcedure, requireAuth };

export const router = {
  affiliate: affiliateRouter,
  affiliateSeed: affiliateSeedRouter,
  aiLimit: aiLimitRouter,
  chapter: chapterRouter,
  flashcard: flashcardRouter,
  flashcardSession: flashcardSessionRouter,
  generate: generateRouter,
  ping: publicProcedure.handler(() => ({
    message: "pong",
    timestamp: Date.now(),
  })),
  plan: planRouter,
  quiz: quizRouter,
  quizSession: quizSessionRouter,
  studySet: studySetRouter,
  studySetContent: studySetContentRouter,
  studySetSearch: studySetSearchRouter,
  unimplemented: publicProcedure.handler(() => {
    throw new Error("This procedure is not yet implemented.");
  }),
  user: userRouter,
};

export type Router = typeof router;
