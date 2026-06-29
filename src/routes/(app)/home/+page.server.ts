import { dev } from "$app/environment";
import { createServerClient } from "$lib/orpc.server";
import { getStudySetsInputSchema } from "$lib/schemas/study-set";
import { STUDY_SET_PAGE_LIMIT } from "$lib/schemas/study-set.constant";
import { getStudySetStubs } from "$lib/server/services/study-set/study-set.utils";
import { searchParamsToRecord } from "$lib/server/utils/searchparams";
import { error } from "@sveltejs/kit";
import * as v from "valibot";

import type { PageServerLoad } from "./$types";

const VALID_FILTERS = new Set(["latest", "newly-opened"]);
const DEV_STUB_FILTERS = new Set(["empty", "paginated", "unpaginated", "500"]);

export const load: PageServerLoad = async ({ url, locals }) => {
  const filter = url.searchParams.get("filter");

  if (
    filter !== null &&
    !VALID_FILTERS.has(filter) &&
    !(dev && DEV_STUB_FILTERS.has(filter))
  ) {
    error(400, { message: "filter unknown" });
  }

  const parsed = v.safeParse(getStudySetsInputSchema, {
    pagination: searchParamsToRecord(url.searchParams),
  });

  if (!parsed.success) {
    error(400, { message: "invalid query" });
  }

  const user = locals.mustGetUser();

  if (dev) {
    if (filter === "empty") {
      return {
        filter,
        pagination: {
          limit: STUDY_SET_PAGE_LIMIT,
          page: 1,
          total: 0,
          totalPages: 1,
        },
        studySets: [],
      };
    }
    if (filter === "500") {
      const client = createServerClient();
      await client.unimplemented();
    }
    if (filter === "paginated") {
      const page = parsed.output.pagination?.page ?? 1;
      return {
        ...getStudySetStubs(100, page, STUDY_SET_PAGE_LIMIT, user.id),
        filter,
      };
    }
    if (filter === "unpaginated") {
      return {
        ...getStudySetStubs(9, 1, STUDY_SET_PAGE_LIMIT, user.id),
        filter,
      };
    }
  }

  const client = createServerClient();

  const orderBy =
    filter === "newly-opened"
      ? "newlyOpened"
      : parsed.output.pagination?.orderBy;

  const result = await client.studySet.list({
    pagination: {
      ...parsed.output.pagination,
      ...(orderBy ? { orderBy } : {}),
    },
  });

  return {
    filter,
    pagination: result.pagination,
    studySets: result.data,
  };
};
