import { describe, it } from "vitest";

import { config } from "./config.ts";

describe("auth config", () => {
  it("has autoSignIn disabled to prevent email enumeration", async ({
    expect,
  }) => {
    expect(config.emailAndPassword?.autoSignIn).toBe(false);
  });
});
