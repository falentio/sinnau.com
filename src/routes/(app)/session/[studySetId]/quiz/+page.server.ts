import { dev } from "$app/environment";
import { client } from "$lib/orpc";
import type { DevStubFilter } from "$lib/server/services/quiz-session/quiz-session.utils";
import { getHubStub } from "$lib/server/services/quiz-session/quiz-session.utils";

import type { PageServerLoad } from "./$types";

const STATUS_FILTER_VALUES = ["all", "active", "completed"] as const;
type StatusFilter = (typeof STATUS_FILTER_VALUES)[number];

const isStatusFilter = (value: string | null): value is StatusFilter => {
  if (value === null) {
    return false;
  }
  return (STATUS_FILTER_VALUES as readonly string[]).includes(value);
};

const parseStatusFilter = (raw: string | null): StatusFilter =>
  isStatusFilter(raw) ? raw : "all";

const isDevStubFilter = (value: string): value is DevStubFilter =>
  value === "empty" || value === "active" || value === "500";

export const load: PageServerLoad = async (event) => {
  const stubFilter = event.url.searchParams.get("filter");

  if (dev && stubFilter !== null) {
    if (!isDevStubFilter(stubFilter)) {
      throw new Error("Unknown dev stub filter");
    }
    const stub = getHubStub(stubFilter);
    if (stub === null) {
      throw new Error("Unknown dev stub filter");
    }
    if (stubFilter === "500") {
      throw new Error("DEV_STUB_500");
    }
    return {
      ...stub,
      statusFilter: parseStatusFilter(event.url.searchParams.get("status")),
    };
  }

  const statusFilter = parseStatusFilter(event.url.searchParams.get("status"));

  const { chapters } = await event.parent();

  const [allSessions, totalScope, ...chapterCounts] = await Promise.all([
    client.quizSession.list({ studySetId: event.params.studySetId }),
    client.quizSession.countInScope({
      studySetId: event.params.studySetId,
    }),
    ...chapters.map(
      async (c) =>
        await client.quizSession.countInScope({
          chapterId: c.id,
          studySetId: event.params.studySetId,
        })
    ),
  ]);

  const activeSessions = allSessions.filter((s) => s.status === "ACTIVE");
  const completedSessions = allSessions.filter((s) => s.status === "COMPLETED");

  const chapterQuizCounts: Record<string, number> = {};
  for (const [i, chapter] of chapters.entries()) {
    const result = chapterCounts[i];
    if (result) {
      chapterQuizCounts[chapter.id] = result.count;
    }
  }

  const recentCounts = {
    active: activeSessions.length,
    all: allSessions.length,
    completed: completedSessions.length,
  };

  let baseRecent: typeof allSessions;
  if (statusFilter === "active") {
    baseRecent = activeSessions;
  } else if (statusFilter === "completed") {
    baseRecent = completedSessions;
  } else {
    baseRecent = allSessions;
  }

  return {
    activeSessions,
    chapterQuizCounts,
    recentCounts,
    recentSessions: baseRecent.slice(0, 5),
    statusFilter,
    totalScopeCount: totalScope.count,
  };
};
