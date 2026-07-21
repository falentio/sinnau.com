import { STUDY_SET_SEARCH_LIMIT } from "$lib/schemas/study-set-search.constant";
import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { StudySetSearchService } from "./study-set-search.service.ts";
import {
  captureError,
  createMockGuard,
  createMockRepository,
} from "./study-set-search.testing.ts";

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();
  repo.search.mockResolvedValue([]);
  // oxlint-disable-next-line no-non-null-assertion
  guard.requireUser.mockImplementation((id) => id!);
  // oxlint-disable-next-line no-unsafe-type-assertion
  const service = new StudySetSearchService(
    repo,
    // oxlint-disable-next-line no-unsafe-type-assertion
    guard
  );
  return { guard, repo, service };
};

describe.concurrent(StudySetSearchService, () => {
  it("calls requireUser before searching", async ({ expect }) => {
    const { guard, service } = setupService();
    await service.search({ query: "biology" }, "user-1");
    expect(guard.requireUser).toHaveBeenCalledExactlyOnceWith("user-1");
  });

  it("propagates UNAUTHORIZED when requireUser rejects", async ({ expect }) => {
    const { guard, repo, service } = setupService();
    guard.requireUser.mockImplementation(() => {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    });

    const error = await captureError(
      service.search({ query: "biology" }, null)
    );
    expect(error).toBeInstanceOf(ORPCError);
    expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    expect(repo.search).not.toHaveBeenCalled();
  });

  it("passes sanitized params to repository", async ({ expect }) => {
    const { repo, service } = setupService();
    await service.search({ query: "biology 101" }, "user-1");
    expect(repo.search).toHaveBeenCalledExactlyOnceWith({
      limit: STUDY_SET_SEARCH_LIMIT,
      query: '"biology 101"',
    });
  });

  it("returns repository results directly", async ({ expect }) => {
    const repo = createMockRepository();
    const results = [
      {
        description: null,
        id: "sts_1",
        slug: "bio-101",
        title: "Biology 101",
      },
    ];
    repo.search.mockResolvedValue(results);
    const guard = createMockGuard();
    // oxlint-disable-next-line no-non-null-assertion
    guard.requireUser.mockImplementation((id) => id!);
    // oxlint-disable-next-line no-unsafe-type-assertion
    const service = new StudySetSearchService(
      repo,
      // oxlint-disable-next-line no-unsafe-type-assertion
      guard
    );

    const result = await service.search({ query: "biology" }, "user-1");

    expect(result).toBe(results);
  });

  it("sanitizes special characters before passing to repository", async ({
    expect,
  }) => {
    const { repo, service } = setupService();
    await service.search({ query: 'test "query"' }, "user-1");
    expect(repo.search).toHaveBeenCalledExactlyOnceWith({
      limit: STUDY_SET_SEARCH_LIMIT,
      query: '"test ""query"""',
    });
  });
});
