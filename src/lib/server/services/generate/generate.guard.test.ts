import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { GenerateGuard } from "./generate.guard.ts";
import { createMockRepository } from "./generate.testing";

const setupGuard = () => {
  const repo = createMockRepository();
  repo.findGenerateById.mockResolvedValue(null);
  const guard = new GenerateGuard(repo);
  return { guard, repo };
};

describe.concurrent(GenerateGuard, () => {
  describe("requireOwner", () => {
    it("returns the ownerId when it is a string", ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireOwner("user-1")).toBe("user-1");
    });

    it("throws UNAUTHORIZED when ownerId is null", ({ expect }) => {
      const { guard } = setupGuard();
      expect(() => guard.requireOwner(null)).toThrow(ORPCError);
      expect(() => guard.requireOwner(null)).toThrow(
        "Authentication is required"
      );
    });

    it("throws UNAUTHORIZED when ownerId is undefined", ({ expect }) => {
      const { guard } = setupGuard();
      // oxlint-disable-next-line unicorn/no-useless-undefined
      expect(() => guard.requireOwner(undefined)).toThrow(ORPCError);
      // oxlint-disable-next-line unicorn/no-useless-undefined
      expect(() => guard.requireOwner(undefined)).toThrow(
        "Authentication is required"
      );
    });
  });
});
