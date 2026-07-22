import { ORPCError } from "@orpc/server";
import { describe, it, vi } from "vitest";

import type { GenerateGuard } from "./generate.guard.ts";
import type { ChunkSummary } from "./generate.repository.ts";
import { GenerateService } from "./generate.service.ts";
import {
  captureError,
  createGenerateFixture,
  createMockAiLimitService,
  createMockGuard,
  createMockPipeline,
  createMockRepository,
} from "./generate.testing";

vi.mock(import("$lib/server/infras/generate/infer-name"), () => ({
  inferStudyNameAndDescription:
    vi.fn<() => Promise<{ description: string; name: string }>>(),
}));

const getInferMock = async () => {
  const mod = await import("$lib/server/infras/generate/infer-name");
  const mock = vi.mocked(mod.inferStudyNameAndDescription);
  mock.mockReset();
  return mock;
};

const throwUnauthorized = (): never => {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
};

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();
  const pipeline = createMockPipeline();

  repo.insertGenerate.mockImplementation(
    // oxlint-disable-next-line typescript/promise-function-async
    (row) =>
      Promise.resolve({
        ...createGenerateFixture(),
        ...row,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
  );
  repo.updateGenerateStatus.mockResolvedValue(null);
  repo.findGenerateById.mockResolvedValue(null);
  repo.findChunkSummaries.mockResolvedValue([]);
  repo.findGenerateInputByGenerateId.mockResolvedValue(null);
  repo.loadChunkResults.mockResolvedValue([]);
  repo.deleteOldChunks.mockResolvedValue(0);
  repo.finalizeStuckAsFailed.mockResolvedValue(0);

  guard.requireOwner.mockReturnValue("user-1");

  pipeline.parseLiteparse.mockResolvedValue({ text: "parsed text" });
  pipeline.runLLM.mockResolvedValue({
    successCount: 1,
    totalChunkCount: 1,
  });

  const studySetService = {
    // oxlint-disable-next-line unicorn/no-useless-undefined
    createStudySet: vi
      .fn<() => Promise<{ id: string }>>()
      .mockResolvedValue({ id: "sts-new-id" }),
  };

  const studySetGuard = {
    // oxlint-disable-next-line unicorn/no-useless-undefined
    assertStudySetVisibleByIdOrNotFound: vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValue({}),
  };

  const aiLimitService = createMockAiLimitService();
  aiLimitService.consume.mockResolvedValue({
    logId: "aiu_test_log",
    usage: {},
  });

  // oxlint-disable typescript/no-unsafe-type-assertion
  const service = new GenerateService(
    repo,
    guard as unknown as GenerateGuard,
    pipeline,
    studySetService,
    studySetGuard,
    aiLimitService
  );
  // oxlint-enable typescript/no-unsafe-type-assertion

  return {
    aiLimitService,
    guard,
    pipeline,
    repo,
    service,
    studySetGuard,
    studySetService,
  };
};

describe.concurrent(GenerateService, () => {
  describe("createGenerate", () => {
    it("returns generateId and studySetId on success", async ({ expect }) => {
      const { service } = setupService();
      const pdf = new File(["fake"], "test.pdf");

      const result = await service.createGenerate(
        {
          description: "desc",
          pdf,
          title: "My Study Set",
          visibility: "PRIVATE",
        },
        "user-1"
      );

      expect(result).toHaveProperty("generateId");
      expect(result).toHaveProperty("studySetId");
      expect(result.studySetId).toBe("sts-new-id");
    });

    it("throws UNAUTHORIZED when ownerId is null", async ({ expect }) => {
      const { service, guard } = setupService();
      guard.requireOwner.mockImplementation(throwUnauthorized);
      const pdf = new File(["fake"], "test.pdf");

      const err = await captureError(
        service.createGenerate(
          { description: "desc", pdf, title: "My Study Set" },
          null
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws CONCURRENCY_LIMIT when owner already has active generation", async ({
      expect,
    }) => {
      const { service } = setupService();
      const pdf = new File(["fake"], "test.pdf");

      await service.createGenerate(
        { description: "d1", pdf, title: "Set 1" },
        "user-1"
      );

      const err = await captureError(
        service.createGenerate(
          { description: "d2", pdf, title: "Set 2" },
          "user-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "CONCURRENCY_LIMIT" });
    });

    it("throws LITEPARSE_FAILED when PDF parsing fails", async ({ expect }) => {
      const { service, pipeline } = setupService();
      pipeline.parseLiteparse.mockRejectedValue(new Error("parse error"));
      const pdf = new File(["fake"], "test.pdf");

      const err = await captureError(
        service.createGenerate(
          { description: "desc", pdf, title: "Set" },
          "user-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "LITEPARSE_FAILED" });
    });

    it("creates a study set via studySetService", async ({ expect }) => {
      const { service, studySetService } = setupService();
      const pdf = new File(["fake"], "test.pdf");

      await service.createGenerate(
        {
          description: "desc",
          pdf,
          title: "My Study Set",
          visibility: "PUBLIC",
        },
        "user-1"
      );

      expect(studySetService.createStudySet).toHaveBeenCalledExactlyOnceWith(
        {
          description: "desc",
          files: ["test.pdf"],
          title: "My Study Set",
          visibility: "PUBLIC",
        },
        "user-1"
      );
    });

    it("inserts a generate row with status CREATED", async ({ expect }) => {
      const { repo, service } = setupService();
      const pdf = new File(["fake"], "test.pdf");

      await service.createGenerate(
        { description: "desc", pdf, title: "Set" },
        "user-1"
      );

      expect(repo.insertGenerate).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          ownerId: "user-1",
          status: "CREATED",
        })
      );
    });

    it("inserts generate input with truncated flag when text exceeds limit", async ({
      expect,
    }) => {
      const { repo, pipeline, service } = setupService();
      const longText = "a".repeat(500_001);
      pipeline.parseLiteparse.mockResolvedValue({ text: longText });
      const pdf = new File(["fake"], "test.pdf");

      await service.createGenerate(
        { description: "desc", pdf, title: "Set" },
        "user-1"
      );

      expect(repo.insertGenerateInput).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          input: longText.slice(0, 500_000),
          isInputTruncated: true,
        })
      );

      await vi.waitFor(() => {
        expect(pipeline.runLLM).toHaveBeenCalledWith(
          expect.objectContaining({
            pdfText: longText.slice(0, 500_000),
          })
        );
      });
    });

    it("passes the full (untruncated) text to the pipeline when under the limit", async ({
      expect,
    }) => {
      const { pipeline, service } = setupService();
      const shortText = "a".repeat(100);
      pipeline.parseLiteparse.mockResolvedValue({ text: shortText });
      const pdf = new File(["fake"], "test.pdf");

      await service.createGenerate(
        { description: "desc", pdf, title: "Set" },
        "user-1"
      );

      await vi.waitFor(() => {
        expect(pipeline.runLLM).toHaveBeenCalledWith(
          expect.objectContaining({
            pdfText: shortText,
          })
        );
      });
    });

    it("consumes AI quota after PDF parse with correct amount and featureKey", async ({
      expect,
    }) => {
      const { aiLimitService, pipeline, service } = setupService();
      pipeline.parseLiteparse.mockResolvedValue({ text: "a".repeat(150_000) });
      const pdf = new File(["fake"], "test.pdf");

      await service.createGenerate(
        { description: "desc", pdf, title: "My Study Set" },
        "user-1"
      );

      expect(aiLimitService.consume).toHaveBeenCalledExactlyOnceWith(
        // oxlint-disable-next-line typescript/no-unsafe-assignment -- expect.any(String) returns any which is safe in test assertions
        { amount: 3, featureKey: "generate", referenceId: expect.any(String) },
        "user-1"
      );
    });

    it("throws AI_LIMIT_EXCEEDED when quota is exceeded", async ({
      expect,
    }) => {
      const { aiLimitService, service } = setupService();
      aiLimitService.consume.mockRejectedValue(
        new ORPCError("AI_LIMIT_EXCEEDED", {
          message: "AI usage limit reached for this period",
        })
      );
      const pdf = new File(["fake"], "test.pdf");

      const err = await captureError(
        service.createGenerate(
          { description: "desc", pdf, title: "Set" },
          "user-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AI_LIMIT_EXCEEDED" });
    });

    it("consumes minimum of 1 unit for short text", async ({ expect }) => {
      const { aiLimitService, service } = setupService();
      const pdf = new File(["hello"], "test.pdf");

      await service.createGenerate({ pdf, title: "Set" }, "user-1");

      expect(aiLimitService.consume).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ amount: 1 }),
        "user-1"
      );
    });

    it("refunds on pipeline total failure (successCount === 0)", async ({
      expect,
    }) => {
      const { aiLimitService, pipeline, service } = setupService();
      pipeline.runLLM.mockResolvedValue({
        successCount: 0,
        totalChunkCount: 3,
      });
      const pdf = new File(["fake"], "test.pdf");

      await service.createGenerate(
        { description: "desc", pdf, title: "Set" },
        "user-1"
      );

      await vi.waitFor(() => {
        expect(aiLimitService.refund).toHaveBeenCalledExactlyOnceWith(
          { logId: "aiu_test_log" },
          "user-1"
        );
      });
    });

    it("does not refund on pipeline success", async ({ expect }) => {
      const { aiLimitService, pipeline, service } = setupService();
      const pdf = new File(["fake"], "test.pdf");

      await service.createGenerate(
        { description: "desc", pdf, title: "Set" },
        "user-1"
      );

      await vi.waitFor(() => {
        expect(pipeline.runLLM).toHaveBeenCalled();
      });

      // oxlint-disable-next-line typescript/unbound-method
      expect(aiLimitService.refund).not.toHaveBeenCalled();
    });
  });

  describe(
    "study set name inference (title omitted)",
    { concurrent: false },
    () => {
      it("does not call inference when title is provided", async ({
        expect,
      }) => {
        const { service, studySetService } = setupService();
        const inferMock = await getInferMock();
        const pdf = new File(["fake"], "test.pdf");

        await service.createGenerate(
          {
            description: "desc",
            pdf,
            title: "My Study Set",
            visibility: "PUBLIC",
          },
          "user-1"
        );

        expect(inferMock).not.toHaveBeenCalled();
        expect(studySetService.createStudySet).toHaveBeenCalledWith(
          {
            description: "desc",
            files: ["test.pdf"],
            title: "My Study Set",
            visibility: "PUBLIC",
          },
          "user-1"
        );
      });

      it("infers name and description and uses them when title is omitted", async ({
        expect,
      }) => {
        const { service, studySetService } = setupService();
        const inferMock = await getInferMock();
        inferMock.mockResolvedValueOnce({
          description: "Core ideas of photosynthesis for high-school students.",
          name: "Photosynthesis Basics",
        });
        const pdf = new File(["fake"], "bio.pdf");

        await service.createGenerate({ pdf }, "user-1");

        expect(inferMock).toHaveBeenCalledExactlyOnceWith({
          filename: "bio.pdf",
          text: "parsed text",
        });
        expect(studySetService.createStudySet).toHaveBeenCalledWith(
          {
            description:
              "Core ideas of photosynthesis for high-school students.",
            files: ["bio.pdf"],
            title: "Photosynthesis Basics",
            visibility: undefined,
          },
          "user-1"
        );
      });

      it("keeps the user-provided description when title is omitted", async ({
        expect,
      }) => {
        const { service, studySetService } = setupService();
        const inferMock = await getInferMock();
        inferMock.mockResolvedValueOnce({
          description: "should not be used",
          name: "Cell Biology",
        });
        const pdf = new File(["fake"], "cell.pdf");

        await service.createGenerate(
          { description: "my own desc", pdf },
          "user-1"
        );

        expect(studySetService.createStudySet).toHaveBeenCalledWith(
          expect.objectContaining({
            description: "my own desc",
            title: "Cell Biology",
          }),
          "user-1"
        );
      });

      it("falls back to the sanitized filename when inference throws", async ({
        expect,
      }) => {
        const { service, studySetService } = setupService();
        const inferMock = await getInferMock();
        inferMock.mockRejectedValueOnce(new Error("boom"));
        const pdf = new File(["fake"], "Chapter 3 - Biology Notes.pdf");

        await service.createGenerate({ pdf }, "user-1");

        expect(studySetService.createStudySet).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Biology Notes" }),
          "user-1"
        );
      });

      it("falls back to the sanitized filename when inferred name is too short", async ({
        expect,
      }) => {
        const { service, studySetService } = setupService();
        const inferMock = await getInferMock();
        inferMock.mockResolvedValueOnce({
          description: "desc",
          name: "abc",
        });
        const pdf = new File(["fake"], "Chapter 1 - Mitosis.pdf");

        await service.createGenerate({ pdf }, "user-1");

        expect(studySetService.createStudySet).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Mitosis" }),
          "user-1"
        );
      });

      it("falls back to 'Untitled Study Set' when the filename is also invalid", async ({
        expect,
      }) => {
        const { service, studySetService } = setupService();
        const inferMock = await getInferMock();
        inferMock.mockRejectedValueOnce(new Error("boom"));
        const pdf = new File(["fake"], "a.pdf");

        await service.createGenerate({ pdf }, "user-1");

        expect(studySetService.createStudySet).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Untitled Study Set" }),
          "user-1"
        );
      });

      it("treats an empty string title as omitted and infers", async ({
        expect,
      }) => {
        const { service, studySetService } = setupService();
        const inferMock = await getInferMock();
        inferMock.mockResolvedValueOnce({
          description: "Inferred description",
          name: "Inferred Title",
        });
        const pdf = new File(["fake"], "bio.pdf");

        await service.createGenerate({ pdf, title: "" }, "user-1");

        expect(inferMock).toHaveBeenCalled();
        expect(studySetService.createStudySet).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Inferred Title" }),
          "user-1"
        );
      });
    }
  );

  describe("checkGenerateContent", () => {
    it("throws NOT_FOUND when generate row does not exist", async ({
      expect,
    }) => {
      const { service } = setupService();
      const err = await captureError(
        service.checkGenerateContent({ id: "gen-missing" }, "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("checks study set visibility via studySetGuard", async ({ expect }) => {
      const { repo, service, studySetGuard } = setupService();
      repo.findGenerateById.mockResolvedValue(
        createGenerateFixture({
          id: "gen-1",
          ownerId: "user-1",
          studySetId: "sts-1",
        })
      );

      await service.checkGenerateContent({ id: "gen-1" }, "user-2");

      expect(
        studySetGuard.assertStudySetVisibleByIdOrNotFound
      ).toHaveBeenCalledExactlyOnceWith("sts-1", "user-2");
    });

    it("returns chunk summaries with isInputTruncated", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findGenerateById.mockResolvedValue(
        createGenerateFixture({ id: "gen-1", status: "ONGOING" })
      );
      repo.findGenerateInputByGenerateId.mockResolvedValue({
        generateId: "gen-1",
        id: "ginp-1",
        input: "text",
        isInputTruncated: true,
      });

      const result = await service.checkGenerateContent(
        { id: "gen-1" },
        "user-1"
      );
      expect(result.isInputTruncated).toBe(true);
      expect(result.status).toBe("ONGOING");
      expect(result.chunks).toEqual([]);
    });

    it("returns maxCreatedAt from the latest chunk summary", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findGenerateById.mockResolvedValue(
        createGenerateFixture({ id: "gen-1", status: "ONGOING" })
      );
      repo.findGenerateInputByGenerateId.mockResolvedValue(null);
      repo.findChunkSummaries.mockResolvedValue([
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        {
          createdAt: 100,
          index: 0,
          kind: "success",
          payload: null,
        } as unknown as ChunkSummary,
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        {
          createdAt: 300,
          index: 1,
          kind: "success",
          payload: null,
        } as unknown as ChunkSummary,
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        {
          createdAt: 200,
          index: 2,
          kind: "failure",
          payload: null,
        } as unknown as ChunkSummary,
      ]);

      const result = await service.checkGenerateContent(
        { id: "gen-1" },
        "user-1"
      );
      expect(result.maxCreatedAt).toBe(300);
    });
  });

  describe("cleanupChunks", () => {
    it("delegates to repo.deleteOldChunks with default age", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.deleteOldChunks.mockResolvedValue(5);

      const result = await service.cleanupChunks();
      expect(result.deletedCount).toBe(5);
      expect(repo.deleteOldChunks).toHaveBeenCalledWith(30);
    });

    it("passes custom olderThanDays when provided", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.deleteOldChunks.mockResolvedValue(3);

      const result = await service.cleanupChunks(7);
      expect(result.deletedCount).toBe(3);
      expect(repo.deleteOldChunks).toHaveBeenCalledWith(7);
    });
  });

  describe("startupRecovery", () => {
    it("delegates to repo.finalizeStuckAsFailed", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.finalizeStuckAsFailed.mockResolvedValue(2);

      await service.startupRecovery();
      expect(repo.finalizeStuckAsFailed).toHaveBeenCalledOnce();
    });
  });

  describe("getLanguageStyles", () => {
    it("returns all three language styles with labels and isDefault", ({
      expect,
    }) => {
      const { service } = setupService();

      const result = service.getLanguageStyles();

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        {
          isDefault: true,
          label: "Ramah Pelajar",
          value: "student-friendly",
        },
        { isDefault: false, label: "Akademik", value: "academic" },
        { isDefault: false, label: "Dasar", value: "elementary" },
      ]);
    });

    it("has exactly one default style", ({ expect }) => {
      const { service } = setupService();

      const result = service.getLanguageStyles();
      const defaults = result.filter((s) => s.isDefault);

      expect(defaults).toHaveLength(1);
      expect(defaults[0]?.value).toBe("student-friendly");
    });

    it("every item has value, label, and isDefault properties", ({
      expect,
    }) => {
      const { service } = setupService();

      const result = service.getLanguageStyles();

      for (const item of result) {
        expect(item).toHaveProperty("value");
        expect(item).toHaveProperty("label");
        expect(item).toHaveProperty("isDefault");
        expect(typeof item.value).toBe("string");
        expect(typeof item.label).toBe("string");
        expect(typeof item.isDefault).toBe("boolean");
      }
    });
  });
});
