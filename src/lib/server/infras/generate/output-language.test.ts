import { describe, it } from "vitest";

import {
  getOutputLanguage,
  outputLanguageProfiles,
} from "./output-language.ts";

describe.concurrent(getOutputLanguage, () => {
  it("returns the profile content for a known id", ({ expect }) => {
    const profile = getOutputLanguage("detect");
    expect(profile).toContain("<output-language>");
    expect(profile).toContain("Detect the language");
  });

  it("returns the english profile", ({ expect }) => {
    const profile = getOutputLanguage("english");
    expect(profile).toContain("<output-language>");
    expect(profile).toContain("English");
  });

  it("returns the indonesian profile", ({ expect }) => {
    const profile = getOutputLanguage("indonesian");
    expect(profile).toContain("<output-language>");
    expect(profile).toContain("Bahasa Indonesia");
  });

  it("defaults to detect when no id is provided", ({ expect }) => {
    const defaultProfile = getOutputLanguage();
    expect(defaultProfile).toBe(outputLanguageProfiles.detect);
  });

  it("throws for an unknown id", ({ expect }) => {
    expect(() => getOutputLanguage("not-a-real-language")).toThrow(
      /Unknown output language/u
    );
  });

  it("throws for an empty id", ({ expect }) => {
    expect(() => getOutputLanguage("")).toThrow(/Unknown output language/u);
  });

  it("exposes every registered id as a key on outputLanguageProfiles", ({
    expect,
  }) => {
    const entries = Object.entries(outputLanguageProfiles);
    expect(entries.length).toBeGreaterThan(0);
    for (const [id, profile] of entries) {
      expect(profile).toBe(getOutputLanguage(id));
    }
  });
});
