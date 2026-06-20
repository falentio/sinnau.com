import { describe, it } from "vitest";

import { chunkContent } from "./chunk.ts";

describe.concurrent(chunkContent, () => {
  it("throws when content is empty", ({ expect }) => {
    expect(() => chunkContent("", 100)).toThrow("content must not be empty");
  });

  it("throws when chunkSize is zero", ({ expect }) => {
    expect(() => chunkContent("hello", 0)).toThrow(
      "chunkSize must be positive"
    );
  });

  it("throws when chunkSize is negative", ({ expect }) => {
    expect(() => chunkContent("hello", -5)).toThrow(
      "chunkSize must be positive"
    );
  });

  it("returns single chunk when content is shorter than chunkSize", ({
    expect,
  }) => {
    const result = chunkContent("short text", 1000);
    expect(result).toEqual(["short text"]);
  });

  it("returns single chunk when content length equals chunkSize", ({
    expect,
  }) => {
    const text = "a".repeat(100);
    const result = chunkContent(text, 100);
    expect(result).toEqual([text]);
  });

  it("splits on newline within tolerance", ({ expect }) => {
    const prefix = "a".repeat(95);
    const suffix = "b".repeat(200);
    const text = `${prefix}\n${suffix}`;
    const result = chunkContent(text, 100);
    expect(result.length).toBeGreaterThan(1);
    const [first] = result;
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    expect(first).toContain("\n");
    expect(first.length).toBeGreaterThanOrEqual(100);
    expect(first.length).toBeLessThanOrEqual(105);
  });

  it("collapses consecutive newlines into single split point", ({ expect }) => {
    const prefix = "a".repeat(95);
    const suffix = "b".repeat(200);
    const text = `${prefix}\n\n\n${suffix}`;
    const result = chunkContent(text, 100);
    expect(result.length).toBeGreaterThan(1);
    const [first] = result;
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    expect(first).toContain("\n\n\n");
  });

  it("falls back to sentence boundary when no newline", ({ expect }) => {
    const prefix = "x".repeat(98);
    const suffix = "y".repeat(200);
    const text = `${prefix}. Baz${suffix}`;
    const result = chunkContent(text, 100);
    expect(result.length).toBeGreaterThan(1);
    const [first] = result;
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    expect(first.length).toBeGreaterThanOrEqual(100);
    expect(first.length).toBeLessThanOrEqual(103);
  });

  it("falls back to word boundary when no newline or sentence", ({
    expect,
  }) => {
    const prefix = "x".repeat(99);
    const suffix = "y".repeat(200);
    const text = `${prefix} Baz${suffix}`;
    const result = chunkContent(text, 100);
    expect(result.length).toBeGreaterThan(1);
  });

  it("hard splits at chunkSize when no boundaries found", ({ expect }) => {
    const text = "x".repeat(300);
    const result = chunkContent(text, 100);
    expect(result.length).toBe(3);
    for (const chunk of result) {
      expect(chunk.length).toBeGreaterThanOrEqual(100);
    }
  });

  it("overlaps chunks by approximately 5%", ({ expect }) => {
    const chunkSize = 100;
    const overlap = Math.floor(chunkSize * 0.05);
    const text = "x".repeat(chunkSize * 10 - overlap);
    const result = chunkContent(text, chunkSize);
    expect(result.length).toBeGreaterThanOrEqual(2);

    const [chunk0, chunk1] = result;
    expect(chunk0).toBeDefined();
    expect(chunk1).toBeDefined();
    if (chunk0 === undefined || chunk1 === undefined) {
      return;
    }
    const idx1 = text.indexOf(chunk1);
    expect(idx1).toBeLessThan(chunk0.length);
  });

  it("merges final fragment when less than 50% of chunkSize", ({ expect }) => {
    const chunkSize = 100;
    const text = "x".repeat(chunkSize + 30);
    const result = chunkContent(text, chunkSize);
    expect(result.length).toBe(1);
    const [first] = result;
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    expect(first.length).toBeGreaterThanOrEqual(chunkSize);
  });

  it("emits final fragment as-is when >= 50% of chunkSize", ({ expect }) => {
    const chunkSize = 100;
    const text = "x".repeat(chunkSize + 60);
    const result = chunkContent(text, chunkSize);
    expect(result.length).toBe(2);
  });

  it("does not merge final fragment when it is the only chunk", ({
    expect,
  }) => {
    const chunkSize = 100;
    const text = "x".repeat(30);
    const result = chunkContent(text, chunkSize);
    expect(result.length).toBe(1);
    const [first] = result;
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    expect(first).toBe(text);
  });

  it("handles sentence boundaries with question marks", ({ expect }) => {
    const prefix = "x".repeat(98);
    const suffix = "y".repeat(200);
    const text = `${prefix}? Qux${suffix}`;
    const result = chunkContent(text, 100);
    expect(result.length).toBeGreaterThan(1);
  });

  it("handles sentence boundaries with exclamation", ({ expect }) => {
    const prefix = "x".repeat(98);
    const suffix = "y".repeat(200);
    const text = `${prefix}! Qux${suffix}`;
    const result = chunkContent(text, 100);
    expect(result.length).toBeGreaterThan(1);
  });

  it("handles sentence boundary with closing quote", ({ expect }) => {
    const prefix = "x".repeat(96);
    const suffix = "y".repeat(200);
    const text = `${prefix}". Baz${suffix}`;
    const result = chunkContent(text, 100);
    expect(result.length).toBeGreaterThan(1);
  });

  it("handles sentence boundary with closing paren", ({ expect }) => {
    const prefix = "x".repeat(97);
    const suffix = "y".repeat(200);
    const text = `${prefix}.) Baz${suffix}`;
    const result = chunkContent(text, 100);
    expect(result.length).toBeGreaterThan(1);
  });

  it("newline stays with current chunk", ({ expect }) => {
    const prefix = "a".repeat(100);
    const suffix = "b".repeat(200);
    const text = `${prefix}\n${suffix}`;
    const result = chunkContent(text, 100);
    expect(result.length).toBeGreaterThanOrEqual(2);
    const [first] = result;
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    expect(first.endsWith("\n")).toBe(true);
  });

  it("whitespace at split boundary stays with current chunk", ({ expect }) => {
    const prefix = "x".repeat(100);
    const suffix = "y".repeat(200);
    const text = `${prefix}. Baz${suffix}`;
    const result = chunkContent(text, 100);
    expect(result.length).toBeGreaterThanOrEqual(2);
    const [first] = result;
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    expect(first.endsWith(" ")).toBe(true);
  });

  it("returns multiple chunks for large content", ({ expect }) => {
    const text = "The quick brown fox\n".repeat(500);
    const result = chunkContent(text, 200);
    expect(result.length).toBeGreaterThan(3);
  });

  it("all chunks except maybe last are at least chunkSize", ({ expect }) => {
    const chunkSize = 100;
    const text = "one two three four\n".repeat(200);
    const result = chunkContent(text, chunkSize);
    for (let i = 0; i < result.length - 1; i += 1) {
      const chunk = result[i];
      expect(chunk).toBeDefined();
      if (chunk === undefined) {
        continue;
      }
      expect(chunk.length).toBeGreaterThanOrEqual(chunkSize);
    }
  });
});
