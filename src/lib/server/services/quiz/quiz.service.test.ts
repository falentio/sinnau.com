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
    deletedAt: null,
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
  repo.updateQuiz.mockImplementation(async (id, _ownerId, patch) => ({
    ...ownedQuiz,
    id,
    ...patch,
  }));
  // oxlint-disable-next-line require-await
  repo.updateQuizWithOptions.mockImplementation(
    // oxlint-disable-next-line require-await
    async (quizId, _ownerId, patch, _toDelete, _toUpdate, _toCreate) => ({
      ...ownedQuiz,
      ...patch,
      id: quizId,
      options: [ownedOption],
    })
  );
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
  guard.assertQuizOptionsBelongToQuizOrNotFound.mockResolvedValue([
    ownedOption,
  ]);

  // oxlint-disable-next-line no-unsafe-type-assertion
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
            options: [
              { isCorrect: true, optionText: "A" },
              { isCorrect: false, optionText: "B" },
            ],
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
          options: [
            { isCorrect: true, optionText: "A" },
            { isCorrect: false, optionText: "B" },
          ],
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
          options: [
            { isCorrect: true, optionText: "A" },
            { isCorrect: false, optionText: "B" },
          ],
          questionText: "Q?",
          studySetId: STUDY_SET_ID,
          type: "MULTIPLE_CHOICE",
        },
        "owner-1"
      );
      expect(guard.assertChapterInStudySetOrForbidden).not.toHaveBeenCalled();
    });

    it("creates a quiz with options", async ({ expect }) => {
      const { repo, service } = setupService();
      const result = await service.createQuiz(
        {
          options: [
            { isCorrect: true, optionText: "A" },
            { isCorrect: false, optionText: "B" },
          ],
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
        expect.arrayContaining([
          expect.objectContaining({ isCorrect: true }),
          expect.objectContaining({ isCorrect: false }),
        ])
      );
      expect(result.options).toHaveLength(2);
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
      expect(repo.updateQuizWithOptions).not.toHaveBeenCalled();
    });

    it("validates chapter ownership when chapterId is provided", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      await service.updateQuiz(
        { chapterId: CHAPTER_ID, id: QUIZ_ID },
        "owner-1"
      );
      expect(guard.assertChapterInStudySetOrForbidden).toHaveBeenCalledWith(
        CHAPTER_ID,
        "owner-1",
        expect.any(String)
      );
    });

    it("allows setting chapterId to null (unassign)", async ({ expect }) => {
      const { service, repo } = setupService();
      await service.updateQuiz({ chapterId: null, id: QUIZ_ID }, "owner-1");
      expect(repo.updateQuizWithOptions).toHaveBeenCalledWith(
        QUIZ_ID,
        "owner-1",
        expect.objectContaining({ chapterId: null }),
        expect.any(Array),
        expect.any(Array),
        expect.any(Array)
      );
    });

    it("updates only questionText and returns the hydrated quiz", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const result = await service.updateQuiz(
        { id: QUIZ_ID, questionText: "Updated?" },
        "owner-1"
      );
      expect(repo.updateQuizWithOptions).toHaveBeenCalledWith(
        QUIZ_ID,
        "owner-1",
        expect.objectContaining({ questionText: "Updated?" }),
        expect.any(Array),
        expect.any(Array),
        expect.any(Array)
      );
      expect(result.questionText).toBe("Updated?");
      expect(Array.isArray(result.options)).toBe(true);
    });

    it("throws FORBIDDEN when the repo returns null", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.updateQuizWithOptions.mockResolvedValue(null);
      const err = await captureError(
        service.updateQuiz({ id: QUIZ_ID, questionText: "Updated?" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });

    it("creates options when options provided without ids", async ({
      expect,
    }) => {
      const { ownedQuiz, repo, service } = setupService();
      repo.updateQuizWithOptions.mockImplementation(
        // oxlint-disable-next-line require-await
        async (quizId, ownerId, patch, toDelete, toUpdate, toCreate) => ({
          ...ownedQuiz,
          ...patch,
          id: quizId,
          options: toCreate.map(
            (r: { optionText: string; isCorrect: boolean }) =>
              createQuizOptionFixture(r)
          ),
        })
      );
      const result = await service.updateQuiz(
        {
          id: QUIZ_ID,
          options: [
            { isCorrect: true, optionText: "A" },
            { isCorrect: false, optionText: "B" },
          ],
        },
        "owner-1"
      );
      expect(result.options).toHaveLength(2);
    });

    it("updates options when options provided with ids", async ({ expect }) => {
      const { ownedQuiz, repo, service } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({ id: OPTION_ID, quizId: QUIZ_ID }),
        createQuizOptionFixture({ id: "opt-2", quizId: QUIZ_ID }),
      ]);
      repo.updateQuizWithOptions.mockImplementation(
        // oxlint-disable-next-line require-await
        async (quizId, _ownerId, patch, _toDelete, _toUpdate, _toCreate) => ({
          ...ownedQuiz,
          ...patch,
          id: quizId,
          options: [
            createQuizOptionFixture({
              id: OPTION_ID,
              optionText: "Updated",
              quizId: QUIZ_ID,
            }),
            createQuizOptionFixture({ id: "opt-2", quizId: QUIZ_ID }),
          ],
        })
      );
      const result = await service.updateQuiz(
        {
          id: QUIZ_ID,
          options: [
            { id: OPTION_ID, isCorrect: true, optionText: "Updated" },
            { id: "opt-2", isCorrect: false, optionText: "B" },
          ],
        },
        "owner-1"
      );
      expect(result.options).toHaveLength(2);
      expect(result.options[0]?.optionText).toBe("Updated");
    });

    it("deletes options not in input", async ({ expect }) => {
      const { ownedQuiz, repo, service } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({ id: OPTION_ID, quizId: QUIZ_ID }),
        createQuizOptionFixture({ id: "other-option", quizId: QUIZ_ID }),
        createQuizOptionFixture({ id: "keep-me", quizId: QUIZ_ID }),
      ]);
      repo.updateQuizWithOptions.mockImplementation(
        // oxlint-disable-next-line require-await
        async (quizId, _ownerId, patch, _toDelete, _toUpdate, _toCreate) => ({
          ...ownedQuiz,
          ...patch,
          id: quizId,
          options: [
            createQuizOptionFixture({ id: OPTION_ID, quizId: QUIZ_ID }),
            createQuizOptionFixture({ id: "keep-me", quizId: QUIZ_ID }),
          ],
        })
      );
      const result = await service.updateQuiz(
        {
          id: QUIZ_ID,
          options: [
            { id: OPTION_ID, isCorrect: true, optionText: "A" },
            { id: "keep-me", isCorrect: false, optionText: "B" },
          ],
        },
        "owner-1"
      );
      expect(result.options).toHaveLength(2);
    });
  });

  describe("processOptions", () => {
    it("creates new options when input has no ids", async ({ expect }) => {
      const { guard, service } = setupService();
      const result = await service.processOptions(QUIZ_ID, [
        { isCorrect: true, optionText: "A" },
        { isCorrect: false, optionText: "B" },
      ]);
      expect(result.optionsToCreate).toHaveLength(2);
      expect(result.optionsToCreate[0]?.optionText).toBe("A");
      expect(result.optionsToCreate[0]?.isCorrect).toBe(true);
      expect(result.optionsToDelete).toHaveLength(0);
      expect(result.optionsToUpdate).toHaveLength(0);
      expect(
        guard.assertQuizOptionsBelongToQuizOrNotFound
      ).not.toHaveBeenCalled();
    });

    it("updates existing options when input has ids", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({
          id: "opt-1",
          isCorrect: false,
          optionText: "Old",
          quizId: QUIZ_ID,
        }),
        createQuizOptionFixture({
          id: "opt-2",
          isCorrect: true,
          optionText: "Keep",
          quizId: QUIZ_ID,
        }),
      ]);
      const result = await service.processOptions(QUIZ_ID, [
        { id: "opt-1", isCorrect: false, optionText: "New" },
        { id: "opt-2", isCorrect: true, optionText: "Keep" },
      ]);
      expect(result.optionsToUpdate).toHaveLength(2);
      expect(result.optionsToUpdate[0]?.patch.isCorrect).toBe(false);
      expect(result.optionsToUpdate[0]?.patch.optionText).toBe("New");
    });

    it("deletes options not included in input", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({ id: "opt-1", quizId: QUIZ_ID }),
        createQuizOptionFixture({ id: "opt-2", quizId: QUIZ_ID }),
        createQuizOptionFixture({ id: "opt-3", quizId: QUIZ_ID }),
      ]);
      const result = await service.processOptions(QUIZ_ID, [
        { id: "opt-1", isCorrect: true, optionText: "A" },
        { id: "opt-2", isCorrect: false, optionText: "B" },
      ]);
      expect(result.optionsToDelete).toEqual(["opt-3"]);
      expect(result.optionsToUpdate).toHaveLength(2);
      expect(result.optionsToCreate).toHaveLength(0);
    });

    it("validates option ids via guard", async ({ expect }) => {
      const { guard, repo, service } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({ id: "opt-1", quizId: QUIZ_ID }),
        createQuizOptionFixture({
          id: "opt-2",
          isCorrect: true,
          quizId: QUIZ_ID,
        }),
      ]);
      await service.processOptions(QUIZ_ID, [
        { id: "opt-1", isCorrect: false, optionText: "A" },
        { id: "opt-2", isCorrect: true, optionText: "B" },
      ]);
      expect(
        guard.assertQuizOptionsBelongToQuizOrNotFound
      ).toHaveBeenCalledWith(QUIZ_ID, ["opt-1", "opt-2"]);
    });

    it("skips guard when no ids in input", async ({ expect }) => {
      const { guard, service } = setupService();
      await service.processOptions(QUIZ_ID, [
        { isCorrect: true, optionText: "A" },
        { isCorrect: false, optionText: "B" },
      ]);
      expect(
        guard.assertQuizOptionsBelongToQuizOrNotFound
      ).not.toHaveBeenCalled();
    });

    it("combines create, update, and delete", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({
          id: "keep",
          isCorrect: false,
          optionText: "Keep",
          quizId: QUIZ_ID,
        }),
        createQuizOptionFixture({
          id: "remove",
          isCorrect: false,
          optionText: "Remove",
          quizId: QUIZ_ID,
        }),
      ]);
      const result = await service.processOptions(QUIZ_ID, [
        { id: "keep", isCorrect: true, optionText: "Updated Keep" },
        { isCorrect: false, optionText: "New" },
      ]);
      expect(result.optionsToDelete).toEqual(["remove"]);
      expect(result.optionsToUpdate).toHaveLength(1);
      expect(result.optionsToUpdate[0]?.id).toBe("keep");
      expect(result.optionsToUpdate[0]?.patch.optionText).toBe("Updated Keep");
      expect(result.optionsToCreate).toHaveLength(1);
      expect(result.optionsToCreate[0]?.optionText).toBe("New");
    });

    it("preserves explanation when not provided", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({
          explanation: "Original explanation",
          id: "opt-1",
          quizId: QUIZ_ID,
        }),
        createQuizOptionFixture({
          id: "opt-2",
          isCorrect: true,
          quizId: QUIZ_ID,
        }),
      ]);
      const result = await service.processOptions(QUIZ_ID, [
        { id: "opt-1", isCorrect: false, optionText: "A" },
        { id: "opt-2", isCorrect: true, optionText: "B" },
      ]);
      expect(result.optionsToUpdate[0]?.patch.explanation).toBeUndefined();
    });

    it("clears explanation when null", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({
          explanation: "Original",
          id: "opt-1",
          quizId: QUIZ_ID,
        }),
        createQuizOptionFixture({
          id: "opt-2",
          isCorrect: true,
          quizId: QUIZ_ID,
        }),
      ]);
      const result = await service.processOptions(QUIZ_ID, [
        {
          explanation: null,
          id: "opt-1",
          isCorrect: false,
          optionText: "A",
        },
        { id: "opt-2", isCorrect: true, optionText: "B" },
      ]);
      expect(result.optionsToUpdate[0]?.patch.explanation).toBeNull();
    });

    it("clears explanation when empty string", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({
          explanation: "Original",
          id: "opt-1",
          quizId: QUIZ_ID,
        }),
        createQuizOptionFixture({
          id: "opt-2",
          isCorrect: true,
          quizId: QUIZ_ID,
        }),
      ]);
      const result = await service.processOptions(QUIZ_ID, [
        {
          explanation: "",
          id: "opt-1",
          isCorrect: false,
          optionText: "A",
        },
        { id: "opt-2", isCorrect: true, optionText: "B" },
      ]);
      expect(result.optionsToUpdate[0]?.patch.explanation).toBeNull();
    });

    it("sets explanation when non-empty string", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({ id: "opt-1", quizId: QUIZ_ID }),
        createQuizOptionFixture({
          id: "opt-2",
          isCorrect: true,
          quizId: QUIZ_ID,
        }),
      ]);
      const result = await service.processOptions(QUIZ_ID, [
        {
          explanation: "New explanation",
          id: "opt-1",
          isCorrect: false,
          optionText: "A",
        },
        { id: "opt-2", isCorrect: true, optionText: "B" },
      ]);
      expect(result.optionsToUpdate[0]?.patch.explanation).toBe(
        "New explanation"
      );
    });

    it("rejects MCQ with second correct option", async ({ expect }) => {
      const { repo, service, ownedQuiz } = setupService();
      ownedQuiz.type = "MULTIPLE_CHOICE";
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({
          id: "opt-1",
          isCorrect: true,
          quizId: QUIZ_ID,
        }),
      ]);
      const err = await captureError(
        service.processOptions(QUIZ_ID, [
          { id: "opt-1", isCorrect: true, optionText: "A" },
          { isCorrect: true, optionText: "B" },
        ])
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("rejects MCQ with no correct option after deletion", async ({
      expect,
    }) => {
      const { repo, service, ownedQuiz } = setupService();
      ownedQuiz.type = "MULTIPLE_CHOICE";
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({
          id: "opt-1",
          isCorrect: true,
          quizId: QUIZ_ID,
        }),
      ]);
      const err = await captureError(
        service.processOptions(QUIZ_ID, [{ isCorrect: false, optionText: "B" }])
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("rejects MS with all incorrect", async ({ expect }) => {
      const { repo, service, ownedQuiz } = setupService();
      ownedQuiz.type = "MULTIPLE_SELECT";
      repo.findOptionsByQuizIds.mockResolvedValue([]);
      const err = await captureError(
        service.processOptions(QUIZ_ID, [
          { isCorrect: false, optionText: "A" },
          { isCorrect: false, optionText: "B" },
        ])
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("accepts MS with at least one correct", async ({ expect }) => {
      const { repo, service, ownedQuiz } = setupService();
      ownedQuiz.type = "MULTIPLE_SELECT";
      repo.findOptionsByQuizIds.mockResolvedValue([]);
      const result = await service.processOptions(QUIZ_ID, [
        { isCorrect: true, optionText: "A" },
        { isCorrect: false, optionText: "B" },
      ]);
      expect(result.optionsToCreate).toHaveLength(2);
    });

    it("accepts valid MCQ configuration", async ({ expect }) => {
      const { repo, service, ownedQuiz } = setupService();
      ownedQuiz.type = "MULTIPLE_CHOICE";
      repo.findOptionsByQuizIds.mockResolvedValue([]);
      const result = await service.processOptions(QUIZ_ID, [
        { isCorrect: true, optionText: "A" },
        { isCorrect: false, optionText: "B" },
        { isCorrect: false, optionText: "C" },
      ]);
      expect(result.optionsToCreate).toHaveLength(3);
      expect(result.optionsToDelete).toHaveLength(0);
    });

    it("throws FORBIDDEN when quiz not found", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findQuizById.mockResolvedValue(null);
      const err = await captureError(
        service.processOptions(QUIZ_ID, [{ isCorrect: true, optionText: "A" }])
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });

    it("rejects empty input when quiz type requires options", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findOptionsByQuizIds.mockResolvedValue([
        createQuizOptionFixture({
          id: "existing",
          isCorrect: true,
          quizId: QUIZ_ID,
        }),
      ]);
      const err = await captureError(service.processOptions(QUIZ_ID, []));
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
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
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
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
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
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
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
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
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
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
        createQuizOptionFixture({ isCorrect: false, quizId: QUIZ_ID }),
        createQuizOptionFixture({ isCorrect: false, quizId: QUIZ_ID }),
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
        createQuizOptionFixture({ isCorrect: false, quizId: QUIZ_ID }),
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
