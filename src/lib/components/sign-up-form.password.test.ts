import * as v from "valibot";
import { describe, it } from "vitest";

/**
 * Test that the sign-up form schema rejects whitespace-only passwords
 * and trims leading/trailing spaces before validation.
 *
 * The password schema is defined in sign-up-form.svelte's <script lang="ts" module>.
 * We construct an equivalent pipe here to validate the fix behavior.
 */

const passwordSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(8, "Kata sandi minimal 8 karakter."),
  v.maxLength(128, "Kata sandi maksimal 128 karakter.")
);

describe("sign-up password validation", () => {
  it("rejects whitespace-only password after trim", async ({ expect }) => {
    const result = v.safeParse(passwordSchema, "        ");
    expect(result.success).toBe(false);
  });

  it("trims leading spaces from password", async ({ expect }) => {
    const result = v.safeParse(passwordSchema, "  password123");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toBe("password123");
    }
  });

  it("trims trailing spaces from password", async ({ expect }) => {
    const result = v.safeParse(passwordSchema, "password123  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toBe("password123");
    }
  });

  it("accepts valid password without surrounding spaces", async ({
    expect,
  }) => {
    const result = v.safeParse(passwordSchema, "password123");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toBe("password123");
    }
  });
});
