import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { QuizRepository } from "../quiz/quiz.repository.ts";
import type { QuizSessionGuard } from "./quiz-session.guard.ts";
import { QuizSessionService } from "./quiz-session.service.ts";
import {
  captureError,
  createMockGuard,
  createMockRepository,
} from "./quiz-session.testing.ts";

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();

  repo.countQuizzesInScope.mockResolvedValue(0);

  const service = new QuizSessionService(
    repo,
    // oxlint-disable-next-line no-unsafe-type-assertion
    guard as unknown as QuizSessionGuard,
    // oxlint-disable-next-line no-unsafe-type-assertion
    null as unknown as QuizRepository
  );
  return { guard, repo, service };
};

const throwUnauthorized = (): never => {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
};

const throwNotFound = (): never => {
  throw new ORPCError("NOT_FOUND", { message: "Study set not found" });
};

const SAMPLE_STUDY_SET_ID = "sst_000000000000000001";
const SAMPLE_CHAPTER_ID = "chp_000000000000000001";

describe.concurrent("QuizSessionService.countInScope", () => {
  it("throws UNAUTHORIZED when requireUser fails", async ({ expect }) => {
    const { guard, service } = setupService();
    guard.requireUser.mockImplementation(throwUnauthorized);

    const error = await captureError(
      service.countInScope({ studySetId: SAMPLE_STUDY_SET_ID }, null)
    );
    expect(error).toBeInstanceOf(ORPCError);
    expect(error).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws NOT_FOUND when study set is not visible", async ({ expect }) => {
    const { guard, service } = setupService();
    guard.assertStudySetVisibleOrNotFound.mockImplementation(throwNotFound);

    const error = await captureError(
      service.countInScope({ studySetId: SAMPLE_STUDY_SET_ID }, "user-1")
    );
    expect(error).toBeInstanceOf(ORPCError);
    expect(error).toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns { count } on the happy path with no chapterId", async ({
    expect,
  }) => {
    const { repo, service } = setupService();
    repo.countQuizzesInScope.mockResolvedValue(7);

    const result = await service.countInScope(
      { studySetId: SAMPLE_STUDY_SET_ID },
      "user-1"
    );
    expect(result).toEqual({ count: 7 });
    expect(repo.countQuizzesInScope).toHaveBeenCalledWith(
      SAMPLE_STUDY_SET_ID,
      undefined
    );
  });

  it("passes chapterId through to the repository when provided", async ({
    expect,
  }) => {
    const { repo, service } = setupService();
    repo.countQuizzesInScope.mockResolvedValue(3);

    const result = await service.countInScope(
      {
        chapterId: SAMPLE_CHAPTER_ID,
        studySetId: SAMPLE_STUDY_SET_ID,
      },
      "user-1"
    );
    expect(result).toEqual({ count: 3 });
    expect(repo.countQuizzesInScope).toHaveBeenCalledWith(
      SAMPLE_STUDY_SET_ID,
      SAMPLE_CHAPTER_ID
    );
  });
});
