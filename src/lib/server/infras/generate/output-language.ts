import detect from "./prompt/output-language/detect.md?raw";
import english from "./prompt/output-language/english.md?raw";
import indonesian from "./prompt/output-language/indonesian.md?raw";

export type OutputLanguageId = "detect" | "english" | "indonesian";

export const outputLanguageProfiles = {
  detect,
  english,
  indonesian,
} as const satisfies Record<string, string>;

const DEFAULT_OUTPUT_LANGUAGE: OutputLanguageId = "detect";

const isOutputLanguageId = (id: string): id is OutputLanguageId =>
  Object.hasOwn(outputLanguageProfiles, id);

export const getOutputLanguage = (
  id: string = DEFAULT_OUTPUT_LANGUAGE
): string => {
  if (!isOutputLanguageId(id)) {
    throw new Error(
      `Unknown output language: "${id}". Available: ${Object.keys(outputLanguageProfiles).join(", ")}`
    );
  }
  return outputLanguageProfiles[id];
};
