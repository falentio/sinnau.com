import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { Chapter } from "../../infras/db/schema/chapter.ts";
import type { Quiz, QuizOption } from "../../infras/db/schema/quiz.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import type { QuizGuard } from "./quiz.guard.ts";
import { QuizService } from "./quiz.service.ts";
import {
  captureError,
  createMockGuard,
  createMockRepository,
  createQuizFixture,
  createQuizOptionFixture,
} from "./quiz.testing.ts";

const STUDY_SET_ID = "11111111-1111-1111-1111-111111111111";
const QUIZ_ID = "22222222-2222-2222-2222-222222222222";
const OPTION_ID = "33333333-3333-3333-3333-333333333333";
const CHAPTER_ID = "44444444-4444-4444-4444-444444444444";

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();

  const ownedStudySet: StudySet = {
    createdAt: new Date(),
    description: null,
    files: [],
    id: STUDY_SET_ID,
    ownerId: "owner-1",
    slug: "set-slug",
    title: "Owned",
    updatedAt: new Date(),
    visibility: "PRIVATE",
  };

  const ownedChapter: Chapter = {
    createdAt: new Date(),
    description: null,
    id: CHAPTER_ID,
    ownerId: "owner-1",
    slug: "chapter-slug",
    studySetId: STUDY_SET_ID,
    title: "Owned",
    updatedAt: new Date(),
  };

  const ownedQuiz: Quiz = createQuizFixture({
    id: QUIZ_ID,
    ownerId: "owner-1",
    questionText: "What is 2 + 2?",
    studySetId: STUDY_SET_ID,
    type: "MULTIPLE_CHOICE",
  });

  const ownedOption: QuizOption = createQuizOptionFixture({
    id: OPTION_ID,
    isCorrect: true,
    optionText: "4",
    quizId: QUIZ_ID,
  });

  repo.findQuizById.mockResolvedValue(ownedQuiz);
  repo.findQuizzesByIds.mockResolvedValue([ownedQuiz]);
  repo.findOptionsByQuizIds.mockResolvedValue([]);
  repo.findOptionsByIdsForOwner.mockResolvedValue([]);
  repo.findOptionByIdForOwner.mockResolvedValue(null);
  repo.findChapterById.mockResolvedValue(ownedChapter);
  repo.findQuizzesByStudySetId.mockResolvedValue([]);

  // oxlint-disable-next-line require-await
  repo.insertQuiz.mockImplementation(async (row) => ({ ...ownedQuiz, ...row }));
  // oxlint-disable-next-line require-await
  repo.insertQuizOptions.mockImplementation(async (rows) =>
    rows.map((r) => createQuizOptionFixture(r))
  );
  // oxlint-disable-next-line require-await
  repo.updateQuiz.mockImplementation(async (id, _ownerId, patch) => ({
    ...ownedQuiz,
    id,
    ...patch,
  }));
  // oxlint-disable-next-line require-await
  repo.updateQuizOption.mockImplementation(async (id, _ownerId, patch) => ({
    ...ownedOption,
    id,
    ...patch,
    explanation: patch.explanation ?? ownedOption.explanation,
  }));
  repo.deleteQuizzes.mockResolvedValue(true);
  repo.deleteQuizOptions.mockResolvedValue(true);

  guard.assertStudySetOwnerOrForbidden.mockResolvedValue(ownedStudySet);
  guard.assertStudySetVisibleOrNotFound.mockResolvedValue(ownedStudySet);
  guard.assertChapterOwnerOrForbidden.mockResolvedValue(ownedChapter);
  guard.assertChapterInStudySetOrForbidden.mockResolvedValue(ownedChapter);
  guard.assertQuizOwnerOrForbidden.mockResolvedValue(ownedQuiz);
  guard.assertQuizOwnerBatchOrPartialForbidden.mockResolvedValue([ownedQuiz]);
  guard.assertQuizOptionOwnerBatchOrPartialForbidden.mockResolvedValue([
    ownedOption,
  ]);
  guard.assertQuizVisibleByIdOrNotFound.mockResolvedValue(ownedQuiz);

  const service = new QuizService(repo, guard as unknown as QuizGuard);
  return { guard, ownedOption, ownedQuiz, repo, service };
};

const throwForbidden = (): never => {
  throw new ORPCError("FORBIDDEN", {
    message: "Cannot modify a quiz you do not own",
  });
};
const throwNotFound = (): never => {
  throw new ORPCError("NOT_FOUND", { message: "Quiz not found" });
};
const throwPartialForbidden = (): never => {
  throw new ORPCError("PARTIAL_FORBIDDEN", {
    data: { ids: ["x", "y"] },
    message: "Some ids cannot be modified by this user",
  });
};

describe.concurrent(QuizService, () => {
  describe("createQuiz", () => {
    it("propagates FORBIDDEN from assertStudySetOwnerOrForbidden", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertStudySetOwnerOrForbidden.mockImplementation(throwForbidden);
      const err = await captureError(
        service.createQuiz(
          {
            questionText: "Q?",
            studySetId: STUDY_SET_ID,
            type: "MULTIPLE_CHOICE",
          },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
      expect(repo.insertQuiz).not.toHaveBeenCalled();
    });

    it("validates chapter ownership when chapterId is provided", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      await service.createQuiz(
        {
          chapterId: CHAPTER_ID,
          questionText: "Q?",
          studySetId: STUDY_SET_ID,
          type: "MULTIPLE_CHOICE",
        },
        "owner-1"
      );
      expect(guard.assertChapterInStudySetOrForbidden).toHaveBeenCalledWith(
        CHAPTER_ID,
        "owner-1",
        STUDY_SET_ID
      );
    });

    it("skips chapter validation when chapterId is omitted", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      await service.createQuiz(
        {
          questionText: "Q?",
          studySetId: STUDY_SET_ID,
          type: "MULTIPLE_CHOICE",
        },
        "owner-1"
      );
      expect(guard.assertChapterInStudySetOrForbidden).not.toHaveBeenCalled();
    });

    it("creates a quiz with no options when omitted", async ({ expect }) => {
      const { repo, service } = setupService();
      const result = await service.createQuiz(
        {
          questionText: "Q?",
          studySetId: STUDY_SET_ID,
          type: "MULTIPLE_CHOICE",
        },
        "owner-1"
      );
      expect(repo.insertQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: "owner-1",
          questionText: "Q?",
          studySetId: STUDY_SET_ID,
          type: "MULTIPLE_CHOICE",
        }),
        []
      );
      expect(result.options).toEqual([]);
    });

    it("rejects MCQ with more than one correct option during creation", async ({
      expect,
    }) => {
      const { service } = setupService();
      const err = await captureError(
        service.createQuiz(
          {
            options: [
              { isCorrect: true, optionText: "A" },
              { isCorrect: true, optionText: "B" },
            ],
            questionText: "Q?",
            studySetId: STUDY_SET_ID,
            type: "MULTIPLE_CHOICE",
          },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "MC_ALREADY_HAS_CORRECT" });
    });

    it("rejects FITB with more than one option", async ({ expect }) => {
      const { service } = setupService();
      const err = await captureError(
        service.createQuiz(
          {
            options: [
              { isCorrect: true, optionText: "A" },
              { isCorrect: false, optionText: "B" },
            ],
            questionText: "Q?",
            studySetId: STUDY_SET_ID,
            type: "FILL_IN_THE_BLANK",
          },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FITB_MULTIPLE_OPTIONS" });
    });

    it("rejects FITB with a non-correct option", async ({ expect }) => {
      const { service } = setupService();
      const err = await captureError(
        service.createQuiz(
          {
            options: [{ isCorrect: false, optionText: "A" }],
            questionText: "Q?",
            studySetId: STUDY_SET_ID,
            type: "FILL_IN_THE_BLANK",
          },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "CANNOT_DELETE_LAST_CORRECT" });
    });
  });

  describe("updateQuiz", () => {
    it("propagates FORBIDDEN from assertQuizOwnerOrForbidden", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertQuizOwnerOrForbidden.mockImplementation(throwForbidden);
      const err = await captureError(
        service.updateQuiz({ id: QUIZ_ID, questionText: "New Q?" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
      expect(repo.updateQuiz).not.toHaveBeenCalled();
    });

    it("updates only questionText and returns the hydrated quiz", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const result = await service.updateQuiz(
        { id: QUIZ_ID, questionText: "Updated?" },
        "owner-1"
      );
      expect(repo.updateQuiz).toHaveBeenCalledWith(
        QUIZ_ID,
        "owner-1",
        expect.objectContaining({ questionText: "Updated?" })
      );
      expect(result.questionText).toBe("Updated?");
      expect(Array.isArray(result.options)).toBe(true);
    });

    it("throws NOT_FOUND when the repo returns null", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.updateQuiz.mockResolvedValue(null);
      const err = await captureError(
        service.updateQuiz({ id: QUIZ_ID, questionText: "Updated?" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("deleteQuizzes", () => {
    it("propagates PARTIAL_FORBIDDEN from the guard", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      guard.assertQuizOwnerBatchOrPartialForbidden.mockImplementation(
        throwPartialForbidden
      );
      const err = await captureError(
        service.deleteQuizzes({ ids: [QUIZ_ID, "other"] }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "PARTIAL_FORBIDDEN" });
      expect(repo.deleteQuizzes).not.toHaveBeenCalled();
    });

    it("passes ids and owner to the repo when all ids are owned", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      await service.deleteQuizzes({ ids: [QUIZ_ID, "q-2"] }, "owner-1");
      expect(repo.deleteQuizzes).toHaveBeenCalledWith(
        [QUIZ_ID, "q-2"],
        "owner-1"
      );
    });

    it("throws NOT_FOUND when the repo reports not all rows were deleted", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.deleteQuizzes.mockResolvedValue(false);
      const err = await captureError(
        service.deleteQuizzes({ ids: [QUIZ_ID] }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("createQuizOptions", () => {
    it("rejects MCQ with a second correct option", async ({ expect }) => {
      const { repo, service, ownedQuiz } = setupService();
      ownedQuiz.type = "MULTIPLE_CHOICE";
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({ isCorrect: true, quizId: QUIZ_ID }),
      ]);
      const err = await captureError(
        service.createQuizOptions(
          {
            options: [
              { isCorrect: true, optionText: "A", quizId: QUIZ_ID },
              { isCorrect: false, optionText: "B", quizId: QUIZ_ID },
            ],
          },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "MC_ALREADY_HAS_CORRECT" });
    });

    it("rejects MS with all options incorrect", async ({ expect }) => {
      const { repo, service, ownedQuiz } = setupService();
      ownedQuiz.type = "MULTIPLE_SELECT";
      repo.findOptionsByQuizIds.mockResolvedValue([]);
      const err = await captureError(
        service.createQuizOptions(
          {
            options: [
              { isCorrect: false, optionText: "A", quizId: QUIZ_ID },
              { isCorrect: false, optionText: "B", quizId: QUIZ_ID },
            ],
          },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("rejects a second option for FITB", async ({ expect }) => {
      const { repo, service, ownedQuiz } = setupService();
      ownedQuiz.type = "FILL_IN_THE_BLANK";
      repo.findOptionsByQuizIds.mockResolvedValue([]);
      const err = await captureError(
        service.createQuizOptions(
          {
            options: [
              { isCorrect: true, optionText: "A", quizId: QUIZ_ID },
              { isCorrect: true, optionText: "B", quizId: QUIZ_ID },
            ],
          },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FITB_MULTIPLE_OPTIONS" });
    });

    it("inserts options and returns the rows", async ({ expect }) => {
      const { repo, service, ownedQuiz } = setupService();
      ownedQuiz.type = "MULTIPLE_CHOICE";
      repo.findOptionsByQuizIds.mockResolvedValue([]);
      const result = await service.createQuizOptions(
        {
          options: [
            { isCorrect: true, optionText: "A", quizId: QUIZ_ID },
            { isCorrect: false, optionText: "B", quizId: QUIZ_ID },
          ],
        },
        "owner-1"
      );
      expect(repo.insertQuizOptions).toHaveBeenCalledOnce();
      expect(result).toHaveLength(2);
    });
  });

  describe("updateQuizOption", () => {
    it("throws NOT_FOUND when the option is not owned", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findOptionByIdForOwner.mockResolvedValue(null);
      const err = await captureError(
        service.updateQuizOption({ id: OPTION_ID, optionText: "X" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
      expect(repo.updateQuizOption).not.toHaveBeenCalled();
    });

    it("rejects MCQ attempting to mark a second option correct", async ({
      expect,
    }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      ownedOption.isCorrect = false;
      ownedQuiz.type = "MULTIPLE_CHOICE";
      repo.findOptionByIdForOwner.mockResolvedValue(ownedOption);
      repo.findQuizById.mockResolvedValue(ownedQuiz);
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({
          id: "other-option",
          isCorrect: true,
          quizId: QUIZ_ID,
        }),
      ]);
      const err = await captureError(
        service.updateQuizOption({ id: OPTION_ID, isCorrect: true }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "MC_ALREADY_HAS_CORRECT" });
    });

    it("rejects MS removing the last correct option", async ({ expect }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      ownedOption.isCorrect = true;
      ownedQuiz.type = "MULTIPLE_SELECT";
      repo.findOptionByIdForOwner.mockResolvedValue(ownedOption);
      repo.findQuizById.mockResolvedValue(ownedQuiz);
      repo.findOptionsByQuizIds.mockResolvedValue([
        { ...ownedOption, isCorrect: true },
      ]);
      const err = await captureError(
        service.updateQuizOption({ id: OPTION_ID, isCorrect: false }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("clears explanation when null is sent", async ({ expect }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      ownedOption.explanation = "old";
      repo.findOptionByIdForOwner.mockResolvedValue(ownedOption);
      repo.findQuizById.mockResolvedValue(ownedQuiz);
      repo.findOptionsByQuizIds.mockResolvedValue([ownedOption]);
      await service.updateQuizOption(
        { explanation: null, id: OPTION_ID },
        "owner-1"
      );
      expect(repo.updateQuizOption).toHaveBeenCalledWith(
        OPTION_ID,
        "owner-1",
        expect.objectContaining({ explanation: null })
      );
    });

    it("updates allowed fields and returns the row", async ({ expect }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      repo.findOptionByIdForOwner.mockResolvedValue(ownedOption);
      repo.findQuizById.mockResolvedValue(ownedQuiz);
      repo.findOptionsByQuizIds.mockResolvedValue([ownedOption]);
      const result = await service.updateQuizOption(
        { id: OPTION_ID, optionText: "Renamed" },
        "owner-1"
      );
      expect(repo.updateQuizOption).toHaveBeenCalledWith(
        OPTION_ID,
        "owner-1",
        expect.objectContaining({ optionText: "Renamed" })
      );
      expect(result.optionText).toBe("Renamed");
    });

    it("throws NOT_FOUND when the repo update returns null", async ({
      expect,
    }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      repo.findOptionByIdForOwner.mockResolvedValue(ownedOption);
      repo.findQuizById.mockResolvedValue(ownedQuiz);
      repo.findOptionsByQuizIds.mockResolvedValue([ownedOption]);
      repo.updateQuizOption.mockResolvedValue(null);
      const err = await captureError(
        service.updateQuizOption({ id: OPTION_ID, optionText: "X" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("deleteQuizOptions", () => {
    it("propagates PARTIAL_FORBIDDEN from the guard", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      guard.assertQuizOptionOwnerBatchOrPartialForbidden.mockImplementation(
        throwPartialForbidden
      );
      const err = await captureError(
        service.deleteQuizOptions({ ids: [OPTION_ID, "x"] }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "PARTIAL_FORBIDDEN" });
      expect(repo.deleteQuizOptions).not.toHaveBeenCalled();
    });

    it("rejects MCQ removing the last correct option", async ({ expect }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      ownedOption.isCorrect = true;
      ownedQuiz.type = "MULTIPLE_CHOICE";
      repo.findOptionsByIdsForOwner.mockResolvedValue([ownedOption]);
      repo.findQuizzesByIds.mockResolvedValue([ownedQuiz]);
      repo.findOptionsByQuizIds.mockResolvedValue([
        ownedOption,
        createQuizOptionFixture({
          id: "other-option",
          isCorrect: false,
          quizId: QUIZ_ID,
        }),
      ]);
      const err = await captureError(
        service.deleteQuizOptions({ ids: [OPTION_ID] }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "CANNOT_DELETE_LAST_CORRECT" });
    });

    it("rejects MS removing the last correct option", async ({ expect }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      ownedOption.isCorrect = true;
      ownedQuiz.type = "MULTIPLE_SELECT";
      repo.findOptionsByIdsForOwner.mockResolvedValue([ownedOption]);
      repo.findQuizzesByIds.mockResolvedValue([ownedQuiz]);
      repo.findOptionsByQuizIds.mockResolvedValue([
        ownedOption,
        createQuizOptionFixture({
          id: "other-option",
          isCorrect: false,
          quizId: QUIZ_ID,
        }),
      ]);
      const err = await captureError(
        service.deleteQuizOptions({ ids: [OPTION_ID] }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "CANNOT_DELETE_LAST_CORRECT" });
    });

    it("rejects deleting the only FITB option", async ({ expect }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      ownedOption.isCorrect = true;
      ownedQuiz.type = "FILL_IN_THE_BLANK";
      repo.findOptionsByIdsForOwner.mockResolvedValue([ownedOption]);
      repo.findQuizzesByIds.mockResolvedValue([ownedQuiz]);
      repo.findOptionsByQuizIds.mockResolvedValue([ownedOption]);
      const err = await captureError(
        service.deleteQuizOptions({ ids: [OPTION_ID] }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "CANNOT_DELETE_LAST_CORRECT" });
    });

    it("rejects MS removing the last correct option (batch delete)", async ({
      expect,
    }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      ownedOption.isCorrect = true;
      ownedQuiz.type = "MULTIPLE_SELECT";
      repo.findOptionsByIdsForOwner.mockResolvedValue([ownedOption]);
      repo.findQuizzesByIds.mockResolvedValue([ownedQuiz]);
      repo.findOptionsByQuizIds.mockResolvedValue([ownedOption]);
      const err = await captureError(
        service.deleteQuizOptions({ ids: [OPTION_ID] }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "CANNOT_DELETE_LAST_CORRECT" });
    });

    it("rejects deleting the last MCQ correct option", async ({ expect }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      ownedOption.isCorrect = true;
      ownedQuiz.type = "MULTIPLE_CHOICE";
      repo.findOptionsByIdsForOwner.mockResolvedValue([ownedOption]);
      repo.findQuizzesByIds.mockResolvedValue([ownedQuiz]);
      repo.findOptionsByQuizIds.mockResolvedValue([ownedOption]);
      const err = await captureError(
        service.deleteQuizOptions({ ids: [OPTION_ID] }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "CANNOT_DELETE_LAST_CORRECT" });
    });

    it("rejects deleting the only FITB option (the answer)", async ({
      expect,
    }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      ownedOption.isCorrect = true;
      ownedQuiz.type = "FILL_IN_THE_BLANK";
      repo.findOptionsByIdsForOwner.mockResolvedValue([ownedOption]);
      repo.findQuizzesByIds.mockResolvedValue([ownedQuiz]);
      repo.findOptionsByQuizIds.mockResolvedValue([ownedOption]);
      const err = await captureError(
        service.deleteQuizOptions({ ids: [OPTION_ID] }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "CANNOT_DELETE_LAST_CORRECT" });
    });

    it("passes ids and owner to the repo when all checks pass", async ({
      expect,
    }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      ownedOption.isCorrect = false;
      ownedQuiz.type = "MULTIPLE_CHOICE";
      repo.findOptionsByIdsForOwner.mockResolvedValue([ownedOption]);
      repo.findQuizzesByIds.mockResolvedValue([ownedQuiz]);
      repo.findOptionsByQuizIds.mockResolvedValue([
        ownedOption,
        createQuizOptionFixture({ isCorrect: true, quizId: QUIZ_ID }),
      ]);
      await service.deleteQuizOptions({ ids: [OPTION_ID] }, "owner-1");
      expect(repo.deleteQuizOptions).toHaveBeenCalledWith(
        [OPTION_ID],
        "owner-1"
      );
    });

    it("throws NOT_FOUND when the repo reports not all rows were deleted", async ({
      expect,
    }) => {
      const { repo, service, ownedOption, ownedQuiz } = setupService();
      ownedOption.isCorrect = false;
      ownedQuiz.type = "MULTIPLE_CHOICE";
      repo.findOptionsByIdsForOwner.mockResolvedValue([ownedOption]);
      repo.findQuizzesByIds.mockResolvedValue([ownedQuiz]);
      repo.findOptionsByQuizIds.mockResolvedValue([
        ownedOption,
        createQuizOptionFixture({ isCorrect: true, quizId: QUIZ_ID }),
      ]);
      repo.deleteQuizOptions.mockResolvedValue(false);
      const err = await captureError(
        service.deleteQuizOptions({ ids: [OPTION_ID] }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("getQuizzes", () => {
    it("returns an empty array when no quizzes exist", async ({ expect }) => {
      const { service } = setupService();
      const result = await service.getQuizzes(
        { studySetId: STUDY_SET_ID },
        "owner-1"
      );
      expect(result).toEqual([]);
    });

    it("returns quizzes with embedded options", async ({ expect }) => {
      const { repo, service, ownedQuiz, ownedOption } = setupService();
      repo.findQuizzesByStudySetId.mockResolvedValue([
        { ...ownedQuiz, options: [ownedOption] },
      ]);
      const result = await service.getQuizzes(
        { studySetId: STUDY_SET_ID },
        "owner-1"
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(ownedQuiz.id);
      expect(result[0]?.options).toHaveLength(1);
      expect(result[0]?.options[0]?.id).toBe(ownedOption.id);
    });
  });

  describe("getQuiz", () => {
    it("propagates NOT_FOUND from the guard", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.assertQuizVisibleByIdOrNotFound.mockImplementation(throwNotFound);
      const err = await captureError(
        service.getQuiz({ id: QUIZ_ID }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("returns the quiz with embedded options", async ({ expect }) => {
      const { repo, service, ownedQuiz, ownedOption } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([ownedOption]);
      const result = await service.getQuiz({ id: QUIZ_ID }, "owner-1");
      expect(result.id).toBe(ownedQuiz.id);
      expect(result.options).toHaveLength(1);
    });
  });
});
