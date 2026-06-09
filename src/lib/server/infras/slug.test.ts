import { describe, it, vi } from "vitest";

import { generateSlug, sanitize, SlugConflictError } from "./slug.ts";

describe.concurrent(sanitize, () => {
  it("lowercases the title", ({ expect }) => {
    expect(sanitize("HELLO WORLD")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", ({ expect }) => {
    expect(sanitize("hello  world")).toBe("hello-world");
  });

  it("collapses multiple hyphens", ({ expect }) => {
    expect(sanitize("hello---world")).toBe("hello-world");
  });

  it("trims leading and trailing hyphens", ({ expect }) => {
    expect(sanitize("-hello-world-")).toBe("hello-world");
  });

  it("removes non-alphanumeric characters except hyphens", ({ expect }) => {
    expect(sanitize("hello!@#world")).toBe("helloworld");
  });

  it("normalizes accented characters", ({ expect }) => {
    expect(sanitize("café résumé")).toBe("cafe-resume");
  });

  it("removes combining marks from decomposed characters", ({ expect }) => {
    expect(sanitize("ñoño")).toBe("nono");
  });

  it("returns empty string for text with only special characters", ({
    expect,
  }) => {
    expect(sanitize("!@#$%^&*()")).toBe("");
  });

  it("preserves numbers", ({ expect }) => {
    expect(sanitize("course 101")).toBe("course-101");
  });

  it("handles mixed case and spaces", ({ expect }) => {
    expect(sanitize("  Hello   World 2024!  ")).toBe("hello-world-2024");
  });
});

describe.concurrent(generateSlug, () => {
  it("generates a slug with base prefix when title has >= 5 chars after sanitize", async ({
    expect,
  }) => {
    const exists = vi
      .fn<(slug: string) => Promise<boolean>>()
      .mockResolvedValue(false);
    const slug = await generateSlug("Biology 101", exists);

    expect(slug).toMatch(/^biology-101-[0-9A-Za-z]{8}$/u);
    expect(exists).toHaveBeenCalledOnce();
  });

  it("generates a slug without base prefix when title has < 5 chars after sanitize", async ({
    expect,
  }) => {
    const exists = vi
      .fn<(slug: string) => Promise<boolean>>()
      .mockResolvedValue(false);
    const slug = await generateSlug("ab", exists);

    expect(slug).toMatch(/^[0-9A-Za-z]{12}$/u);
    expect(exists).toHaveBeenCalledOnce();
  });

  it("retries when first candidate conflicts, succeeds on second", async ({
    expect,
  }) => {
    const exists = vi
      .fn<(slug: string) => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);

    const slug = await generateSlug("Biology 101", exists);

    expect(slug).toMatch(/^biology-101-[0-9A-Za-z]{8}$/u);
    expect(exists).toHaveBeenCalledTimes(2);
  });

  it("throws SlugConflictError after max retries", async ({ expect }) => {
    const exists = vi
      .fn<(slug: string) => Promise<boolean>>()
      .mockResolvedValue(true);

    await expect(generateSlug("Biology 101", exists)).rejects.toThrow(
      SlugConflictError
    );
    expect(exists).toHaveBeenCalledTimes(5);
  });

  it("calls exists with lowercased candidate", async ({ expect }) => {
    const exists = vi
      .fn<(slug: string) => Promise<boolean>>()
      .mockResolvedValue(false);
    await generateSlug("BIOLOGY 101", exists);

    // oxlint-disable-next-line no-non-null-assertion, no-non-null-asserted-optional-chain
    const candidate = exists.mock.calls[0]?.[0]!;
    expect(candidate).toBe(candidate.toLowerCase());
  });

  it("generates different slugs on successive calls", async ({ expect }) => {
    const exists = vi
      .fn<(slug: string) => Promise<boolean>>()
      .mockResolvedValue(false);
    const slug1 = await generateSlug("Biology 101", exists);
    const slug2 = await generateSlug("Biology 101", exists);

    expect(slug1).not.toBe(slug2);
  });

  it("handles title that sanitizes to empty string", async ({ expect }) => {
    const exists = vi
      .fn<(slug: string) => Promise<boolean>>()
      .mockResolvedValue(false);
    const slug = await generateSlug("!@#$%", exists);

    expect(slug).toMatch(/^[0-9A-Za-z]{12}$/u);
  });

  it("slug total length is at least 12 for long titles", async ({ expect }) => {
    const exists = vi
      .fn<(slug: string) => Promise<boolean>>()
      .mockResolvedValue(false);
    const slug = await generateSlug("Hello", exists);

    expect(slug.length).toBeGreaterThanOrEqual(12);
  });
});
