import academic from "./prompt/language-style/academic.md?raw";
import elementary from "./prompt/language-style/elementary.md?raw";
import studentFriendly from "./prompt/language-style/student-friendly.md?raw";
import SYSTEM_PROMPT from "./prompt/system-generate-content-v2.md?raw";

export type LanguageStyleId = "student-friendly" | "academic" | "elementary";

export const languageStyleProfiles = {
  academic,
  elementary,
  "student-friendly": studentFriendly,
} as const satisfies Record<string, string>;

const DEFAULT_LANGUAGE_STYLE: LanguageStyleId = "student-friendly";

const isLanguageStyleId = (id: string): id is LanguageStyleId =>
  Object.hasOwn(languageStyleProfiles, id);

export const getLanguageStyle = (
  id: string = DEFAULT_LANGUAGE_STYLE
): string => {
  if (!isLanguageStyleId(id)) {
    throw new Error(
      `Unknown language style: "${id}". Available: ${Object.keys(languageStyleProfiles).join(", ")}`
    );
  }
  return languageStyleProfiles[id];
};

const LANGUAGE_STYLE_PLACEHOLDER = "{{LANGUAGE_STYLE}}";

export const composeSystemPrompt = (
  id: string = DEFAULT_LANGUAGE_STYLE
): string => {
  const profile = getLanguageStyle(id);
  const composed = SYSTEM_PROMPT.replace(LANGUAGE_STYLE_PLACEHOLDER, profile);
  if (composed === SYSTEM_PROMPT) {
    throw new Error(
      `System prompt is missing the ${LANGUAGE_STYLE_PLACEHOLDER} placeholder`
    );
  }
  return composed;
};
