import { AI_LIMIT_ID_PREFIX } from "$lib/schemas/ai-limit.constant";
import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { generateId } from "../../utils/nanoid.ts";
import { AiLimitGuard } from "./ai-limit.guard.ts";
import {
  captureError,
  createAiUsageLogFixture,
  createMockRepository,
} from "./ai-limit.testing.ts";

const setupGuard = () => {
  const repo = createMockRepository();
  repo.findUsageLogById.mockResolvedValue(null);
  const guard = new AiLimitGuard(repo);
  return { guard, repo };
};

const syncCaptureError = (fn: () => void): unknown => {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
};

describe.concurrent(AiLimitGuard, () => {
  describe("requireOwner", () => {
    it("returns the ownerId when it is a non-empty string", ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireOwner("owner-1")).toBe("owner-1");
    });

    it("throws UNAUTHORIZED when ownerId is null", ({ expect }) => {
      const { guard } = setupGuard();
      const err = syncCaptureError(() => {
        guard.requireOwner(null);
      });
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws UNAUTHORIZED when ownerId is an empty string", ({ expect }) => {
      const { guard } = setupGuard();
      const err = syncCaptureError(() => {
        guard.requireOwner("");
      });
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws UNAUTHORIZED when ownerId is undefined", ({ expect }) => {
      const { guard } = setupGuard();
      const err = syncCaptureError(() => {
        guard.requireOwner(undefined);
      });
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("assertLogOwnerOrForbidden", () => {
    it("returns the log when the caller is the owner", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      const log = createAiUsageLogFixture({
        ownerId: "owner-1",
      });
      // eslint-disable-next-line promise-function-async
      repo.findUsageLogById.mockImplementation((_id, ownerId) =>
        Promise.resolve(ownerId === "owner-1" ? log : null)
      );

      const result = await guard.assertLogOwnerOrForbidden(log.id, "owner-1");
      expect(repo.findUsageLogById).toHaveBeenCalledWith(log.id, "owner-1");
      expect(result).toBe(log);
    });

    it("throws FORBIDDEN when the log does not exist", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      const missingId = generateId(AI_LIMIT_ID_PREFIX);
      const err = await captureError(
        guard.assertLogOwnerOrForbidden(missingId, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
      expect(repo.findUsageLogById).toHaveBeenCalledWith(missingId, "owner-1");
    });

    it("throws FORBIDDEN when caller is not the owner", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      const log = createAiUsageLogFixture({
        ownerId: "owner-1",
      });
      // eslint-disable-next-line promise-function-async
      repo.findUsageLogById.mockImplementation((_id, ownerId) =>
        Promise.resolve(ownerId === "owner-1" ? log : null)
      );

      const err = await captureError(
        guard.assertLogOwnerOrForbidden(log.id, "someone-else")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
