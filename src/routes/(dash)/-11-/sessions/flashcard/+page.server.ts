import { createServerClient } from "$lib/orpc.server";

import type { PageServerLoad } from "./$types";

const parsePage = (raw: string | null): number => {
  if (raw === null || raw === "") {
    return 1;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
};

export const load: PageServerLoad = async ({ depends, url }) => {
  depends("flashcard-session:admin");

  const userId = url.searchParams.get("userId") ?? undefined;
  const studySetId = url.searchParams.get("studySetId") ?? undefined;

  if (userId === undefined && studySetId === undefined) {
    return { pagination: null, sessions: [] };
  }

  const page = parsePage(url.searchParams.get("page"));

  const client = createServerClient();
  const result = await client.flashcardSession.admin.listSessions({
    pagination: { limit: 10, page },
    studySetId,
    userId,
  });

  return {
    pagination: result.pagination,
    sessions: result.data,
  };
};
