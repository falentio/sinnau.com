import { ORPCError } from "@orpc/server";
import { describe, it, expect } from "vitest";

import { StudySetSearchGuard } from "./study-set-search.guard.ts";

describe.concurrent(StudySetSearchGuard, () => {
  describe.concurrent("requireUser", () => {
    it("returns the userId when provided", () => {
      const guard = new StudySetSearchGuard();
      expect(guard.requireUser("user-1")).toBe("user-1");
    });

    it("throws UNAUTHORIZED when userId is null", () => {
      const guard = new StudySetSearchGuard();
      expect(() => guard.requireUser(null)).toThrow(ORPCError);
    });

    it("throws UNAUTHORIZED when userId is undefined", () => {
      const guard = new StudySetSearchGuard();
      // oxlint-disable-next-line unicorn/no-useless-undefined
      expect(() => guard.requireUser(undefined)).toThrow(ORPCError);
    });

    it("throws UNAUTHORIZED with the standard message", () => {
      const guard = new StudySetSearchGuard();
      let thrown: unknown;
      try {
        guard.requireUser(null);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(ORPCError);
      expect(thrown).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});
