import { dev } from "$app/environment";
import { client } from "$lib/orpc";
import { getTakingStub } from "$lib/server/services/quiz-session/quiz-session.utils";
import type { DevStubFilter } from "$lib/server/services/quiz-session/quiz-session.utils";
import { error as httpError, fail, redirect } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

const isTakingStubFilter = (value: string): value is DevStubFilter =>
  value === "mc" || value === "ms" || value === "fitb";

const isRedirect = (cause: unknown): cause is Response => {
  if (!(cause instanceof Response)) {
    return false;
  }
  return [301, 302, 303, 307, 308].includes(cause.status);
};

export const load: PageServerLoad = async (event) => {
  const stubFilter = event.url.searchParams.get("filter");
  const session = await client.quizSession.get({
    sessionId: event.params.sessionId,
  });

  if (dev && stubFilter !== null) {
    if (!isTakingStubFilter(stubFilter)) {
      httpError(400, { message: "Unknown dev stub filter" });
    }
    const stub = getTakingStub(stubFilter);
    if (stub === null) {
      httpError(400, { message: "Unknown dev stub filter" });
    }
    return { questions: stub, session };
  }

  if (session.status === "COMPLETED") {
    redirect(
      303,
      `/session/${event.params.studySetId}/quiz/${event.params.sessionId}/results/`
    );
  }
  const questions = await client.quizSession.getQuestions({
    sessionId: event.params.sessionId,
  });
  return { questions, session };
};

export const actions: Actions = {
  completeSession: async (event) => {
    try {
      await client.quizSession.complete({
        sessionId: event.params.sessionId,
      });
      redirect(
        303,
        `/session/${event.params.studySetId}/quiz/${event.params.sessionId}/results/`
      );
      return fail(500, { message: "Gagal menyelesaikan sesi" });
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      return fail(500, { message: "Gagal menyelesaikan sesi" });
    }
  },
};
