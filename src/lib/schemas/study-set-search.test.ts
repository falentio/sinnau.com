import * as v from "valibot";
import { describe, it } from "vitest";

import {
  STUDY_SET_SEARCH_QUERY_MAX_LENGTH,
  STUDY_SET_SEARCH_QUERY_MIN_LENGTH,
} from "./study-set-search.constant.ts";
import type { SearchStudySetsInput } from "./study-set-search.ts";
import { searchStudySetsInputSchema } from "./study-set-search.ts";

describe.concurrent("searchStudySetsInputSchema (input validation)", () => {
  it("accepts a query at the minimum length (3 chars after trim)", ({
    expect,
  }) => {
    const result = v.safeParse(searchStudySetsInputSchema, { query: "abc" });
    expect(result.success).toBe(true);
  });

  it("rejects a 2-character query (below FTS5 trigram floor)", ({ expect }) => {
    const result = v.safeParse(searchStudySetsInputSchema, { query: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty query", ({ expect }) => {
    const result = v.safeParse(searchStudySetsInputSchema, { query: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only query after trim", ({ expect }) => {
    const result = v.safeParse(searchStudySetsInputSchema, { query: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a query above the maximum length", ({ expect }) => {
    const tooLong = "a".repeat(STUDY_SET_SEARCH_QUERY_MAX_LENGTH + 1);
    const result = v.safeParse(searchStudySetsInputSchema, { query: tooLong });
    expect(result.success).toBe(false);
  });

  it("exports min length constant as 3 (FTS5 trigram floor)", ({ expect }) => {
    expect(STUDY_SET_SEARCH_QUERY_MIN_LENGTH).toBe(3);
  });

  it("infers a properly typed SearchStudySetsInput", ({ expect }) => {
    const input: SearchStudySetsInput = { query: "biology" };
    expect(input.query).toBe("biology");
  });

  it("rejects queries containing NUL bytes", ({ expect }) => {
    const result = v.safeParse(searchStudySetsInputSchema, {
      query: "bio\u0000logy",
    });
    expect(result.success).toBe(false);
  });

  it("rejects queries containing other control characters", ({ expect }) => {
    const result = v.safeParse(searchStudySetsInputSchema, {
      query: "bio\u0001logy",
    });
    expect(result.success).toBe(false);
  });
});
