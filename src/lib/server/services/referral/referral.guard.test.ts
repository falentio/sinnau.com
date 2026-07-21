import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { ReferralGuard } from "./referral.guard.ts";
import { captureError, createMockRepository } from "./referral.testing.ts";

const setupGuard = () => {
  const repo = createMockRepository();
  const guard = new ReferralGuard(repo);
  return { guard };
};

describe.concurrent(ReferralGuard, () => {
  describe("requireUser", () => {
    it("returns the userId when it is a non-empty string", ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireUser("user-1")).toBe("user-1");
    });

    it("throws UNAUTHORIZED when userId is null", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError(
        Promise.resolve().then(() => guard.requireUser(null))
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws UNAUTHORIZED when userId is undefined", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError(
        Promise.resolve().then(() => guard.requireUser(null))
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});
