import * as v from "valibot";

import {
  STUDY_SET_SEARCH_QUERY_MAX_LENGTH,
  STUDY_SET_SEARCH_QUERY_MIN_LENGTH,
} from "./study-set-search.constant.ts";

export const searchStudySetsInputSchema = v.object({
  query: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(STUDY_SET_SEARCH_QUERY_MIN_LENGTH),
    v.maxLength(STUDY_SET_SEARCH_QUERY_MAX_LENGTH),
    // oxlint-disable-next-line no-control-regex
    v.regex(
      /^[^\u0000-\u001F\u007F]*$/u,
      "Query must not contain control characters"
    )
  ),
});

export const studySetSearchSchema = v.object({
  description: v.nullable(v.string()),
  id: v.string(),
  slug: v.string(),
  title: v.string(),
});

export const searchStudySetsListOutputSchema = v.array(studySetSearchSchema);

export type SearchStudySetsInput = v.InferOutput<
  typeof searchStudySetsInputSchema
>;
export type StudySetSearchResult = v.InferOutput<typeof studySetSearchSchema>;
