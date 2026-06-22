import { describe, it } from "vitest";

import { sanitizeFts5Query } from "./study-set-search.utils.ts";

describe.concurrent("sanitizeFts5Query (FTS5 phrase escaping)", () => {
  it("wraps a plain query in double quotes", ({ expect }) => {
    expect(sanitizeFts5Query("biology")).toBe('"biology"');
  });

  it("trims surrounding whitespace before quoting", ({ expect }) => {
    expect(sanitizeFts5Query("  biology  ")).toBe('"biology"');
  });

  it("doubles embedded double quotes per FTS5 phrase syntax", ({ expect }) => {
    expect(sanitizeFts5Query('biology "101"')).toBe('"biology ""101"""');
  });

  it("doubles a lone double quote", ({ expect }) => {
    expect(sanitizeFts5Query('"')).toBe('""""');
  });

  it("returns just the wrapping quotes for a single non-space char", ({
    expect,
  }) => {
    expect(sanitizeFts5Query("  a  ")).toBe('"a"');
  });

  it("returns an empty quoted string when the input is empty", ({ expect }) => {
    // Characterization: the schema layer rejects this before we get
    // here, but the utility itself does not throw. The downstream
    // FTS5 MATCH against an empty phrase returns no rows, which is
    // the intended fail-safe.
    expect(sanitizeFts5Query("")).toBe('""');
  });

  it("returns an empty quoted string when the input is only whitespace", ({
    expect,
  }) => {
    expect(sanitizeFts5Query("   \t\n  ")).toBe('""');
  });
});
