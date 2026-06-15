import { dev } from "$app/environment";
import { client } from "$lib/orpc";
import { getResultsStub } from "$lib/server/services/quiz-session/quiz-session.utils";
import type { DevStubFilter } from "$lib/server/services/quiz-session/quiz-session.utils";
import { error as httpError, redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

const isResultsStubFilter = (value: string): value is DevStubFilter =>
  value === "perfect" || value === "partial" || value === "zero";

export const load: PageServerLoad = async (event) => {
  const stubFilter = event.url.searchParams.get("filter");
  if (dev && stubFilter !== null) {
    if (!isResultsStubFilter(stubFilter)) {
      httpError(400, { message: "Unknown dev stub filter" });
    }
    const stub = getResultsStub(stubFilter);
    if (stub === null) {
      httpError(400, { message: "Unknown dev stub filter" });
    }
    const session = await client.quizSession.get({
      sessionId: event.params.sessionId,
    });
    const parentData = await event.parent();
    const { chapters } = parentData;
    const failingChapterTitles = Object.fromEntries(
      stub.failingChapterIds.map((id) => [
        id,
        chapters.find((c: { id: string }) => c.id === id)?.title ?? id,
      ])
    );
    return {
      chapterScores: {},
      failingChapterTitles,
      results: stub,
      session,
    };
  }

  const session = await client.quizSession.get({
    sessionId: event.params.sessionId,
  });
  if (session.status !== "COMPLETED") {
    redirect(
      303,
      `/session/${event.params.studySetId}/quiz/${event.params.sessionId}/`
    );
  }
  const results = await client.quizSession.getResults({
    sessionId: event.params.sessionId,
  });
  const parentData = await event.parent();
  const { chapters } = parentData;

  const failingChapterTitles = Object.fromEntries(
    results.failingChapterIds.map((id) => [
      id,
      chapters.find((c: { id: string }) => c.id === id)?.title ?? id,
    ])
  );

  const chapterScores: Record<string, { correct: number; total: number }> = {};
  for (const id of results.failingChapterIds) {
    const wrong = results.incorrectQuestions.filter(
      (q) => q.chapterId === id
    ).length;
    chapterScores[id] = { correct: 0, total: wrong };
  }

  return { chapterScores, failingChapterTitles, results, session };
};
