import { describe, it } from "vitest";

import { config } from "./config.ts";

describe("auth config", () => {
  it("has autoSignIn enabled for direct login after signup", async ({
    expect,
  }) => {
    expect(config.emailAndPassword?.autoSignIn).toBe(true);
  });
});
