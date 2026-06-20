import { describe, it } from "vitest";

import {
  composeSystemPrompt,
  getLanguageStyle,
  languageStyleProfiles,
} from "./language-style.ts";

describe.concurrent(getLanguageStyle, () => {
  it("returns the profile content for a known id", ({ expect }) => {
    const profile = getLanguageStyle("student-friendly");
    expect(profile).toContain("<style-guide>");
    expect(profile).toContain("high school and college students");
  });

  it("returns the academic profile", ({ expect }) => {
    const profile = getLanguageStyle("academic");
    expect(profile).toContain("<style-guide>");
    expect(profile).toContain("university students");
  });

  it("returns the elementary profile", ({ expect }) => {
    const profile = getLanguageStyle("elementary");
    expect(profile).toContain("<style-guide>");
    expect(profile).toContain("elementary school learners");
  });

  it("defaults to student-friendly when no id is provided", ({ expect }) => {
    const defaultProfile = getLanguageStyle();
    expect(defaultProfile).toBe(languageStyleProfiles["student-friendly"]);
  });

  it("throws for an unknown id", ({ expect }) => {
    expect(() => getLanguageStyle("not-a-real-style")).toThrow(
      /Unknown language style/u
    );
  });

  it("throws for an empty id", ({ expect }) => {
    expect(() => getLanguageStyle("")).toThrow(/Unknown language style/u);
  });

  it("exposes every registered id as a key on languageStyleProfiles", ({
    expect,
  }) => {
    const entries = Object.entries(languageStyleProfiles);
    expect(entries.length).toBeGreaterThan(0);
    for (const [id, profile] of entries) {
      expect(profile).toBe(getLanguageStyle(id));
    }
  });
});

describe.concurrent(composeSystemPrompt, () => {
  it("substitutes the placeholder with the default profile", ({ expect }) => {
    const prompt = composeSystemPrompt();
    expect(prompt).not.toContain("{{LANGUAGE_STYLE}}");
    expect(prompt).toContain("<style-guide>");
    expect(prompt).toContain("high school and college students");
  });

  it("substitutes the placeholder with the academic profile", ({ expect }) => {
    const prompt = composeSystemPrompt("academic");
    expect(prompt).not.toContain("{{LANGUAGE_STYLE}}");
    expect(prompt).toContain("university students");
    expect(prompt).not.toContain("high school and college students");
  });

  it("substitutes the placeholder with the elementary profile", ({
    expect,
  }) => {
    const prompt = composeSystemPrompt("elementary");
    expect(prompt).not.toContain("{{LANGUAGE_STYLE}}");
    expect(prompt).toContain("elementary school learners");
  });

  it("preserves surrounding sections of the base prompt", ({ expect }) => {
    const prompt = composeSystemPrompt();
    expect(prompt).toContain("<role>");
    expect(prompt).toContain("<core-principles>");
    expect(prompt).toContain("<summary>");
  });

  it("throws for an unknown language style id", ({ expect }) => {
    expect(() => composeSystemPrompt("not-a-real-style")).toThrow(
      /Unknown language style/u
    );
  });

  it("inserts the profile exactly once per composition", ({ expect }) => {
    const prompt = composeSystemPrompt("student-friendly");
    const occurrences = prompt.split("<style-guide>").length - 1;
    expect(occurrences).toBe(1);
  });
});
