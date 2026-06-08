import { describe, it, expect } from "vitest";

import { buildHref } from "./url";

describe(buildHref, () => {
  it('returns "." when source is empty and patch is empty', () => {
    expect(buildHref(new URLSearchParams(), {})).toBe(".");
  });

  it("sets a single value", () => {
    expect(buildHref(new URLSearchParams(), { filter: "empty" })).toBe(
      ".?filter=empty"
    );
  });

  it("preserves params not in the patch", () => {
    const source = new URLSearchParams("chapter=chp_1&filter=paginated");
    expect(buildHref(source, { page: null })).toBe(
      ".?chapter=chp_1&filter=paginated"
    );
  });

  it("does not mutate the source", () => {
    const source = new URLSearchParams("chapter=chp_1");
    buildHref(source, { filter: "empty" });
    expect(source.get("chapter")).toBe("chp_1");
    expect(source.has("filter")).toBeFalsy();
  });

  it("handles set + delete + preserve in one patch", () => {
    const source = new URLSearchParams("chapter=chp_1&page=2&filter=paginated");
    expect(buildHref(source, { filter: "empty", page: null })).toBe(
      ".?chapter=chp_1&filter=empty"
    );
  });

  it("null deletes an existing key", () => {
    const source = new URLSearchParams("page=2");
    expect(buildHref(source, { page: null })).toBe(".");
  });

  it("null on an absent key is a no-op", () => {
    const source = new URLSearchParams("chapter=chp_1");
    expect(buildHref(source, { page: null })).toBe(".?chapter=chp_1");
  });
});
