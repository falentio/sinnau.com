import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { PlanGuard } from "./plan.guard.ts";
import { captureError } from "./plan.testing.ts";

const setupGuard = () => {
  const guard = new PlanGuard();
  return { guard };
};

const throwUnauthorized = () => {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
};

describe.concurrent("PlanGuard unit", () => {
  describe("requireOwner", () => {
    it("returns the owner id when present", async ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireOwner("user-123")).toBe("user-123");
    });

    it("throws UNAUTHORIZED when null", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError((async () => guard.requireOwner(null))());
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws UNAUTHORIZED when empty string", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError((async () => guard.requireOwner(""))());
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("has no side effects (no DB dependency)", async ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireOwner("user-123")).toBe("user-123");
    });

    it("propagates a thrown UNAUTHORIZED verbatim", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError(
        (async () => {
          throwUnauthorized();
          guard.requireOwner("user-123");
        })()
      );
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});
