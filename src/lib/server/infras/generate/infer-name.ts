import { getDefaultModel } from "$lib/server/infras/ai";
import { valibotSchema } from "@ai-sdk/valibot";
import { getLogger } from "@logtape/logtape";
import { generateText, tool } from "ai";
import { string, object } from "valibot";

export interface InferStudyNameAndDescriptionInput {
  text: string;
  filename: string;
}

export interface InferStudyNameAndDescriptionOutput {
  name: string;
  description: string;
}

const studySetSchema = object({
  description: string(),
  name: string(),
});

const SYSTEM_PROMPT = `You infer a human-facing name and description for a study set from an uploaded document. You receive the document's filename and the first portion of its text.

# Language
Preserve the language of the document. Write the name and description in that same language and never mix languages.

# Name
The name is primarily filename-driven.
- Strip the file extension and decorative prefixes such as "Chapter 1", "Bab 3", "Lecture", or leading numbers.
- Turn separators (underscores, hyphens) into spaces and form a concise title-case topic label.
- Keep the name under 50 characters.
- Do not add a "Chapter N:" or source-style prefix.
- If the filename is generic or uninformative (for example "document", "untitled", "file", an empty name, or only an extension), derive the name from the document content instead.
- The name must stand on its own; never name or reference the source file.

# Description
Write one to two sentences, under 500 characters, in the document's language, covering:
- Scope: the topics or subjects the study set covers.
- Audience: who the set is for (for example high-school students, exam preparation, or self-study).
Keep it factual and free of marketing tone. Do not reveal or refer to the source document or its filename.

# Output
Return only the object with \`name\` and \`description\`.
`;

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength);
};

const logger = getLogger(["sinnau.com", "generate", "infra"]);

export const inferStudyNameAndDescription = async ({
  text,
  filename,
}: InferStudyNameAndDescriptionInput): Promise<InferStudyNameAndDescriptionOutput> => {
  const truncated = truncateText(text, 6000);
  const output = {
    description: "",
    name: "",
  } as InferStudyNameAndDescriptionOutput;

  const setStudySetNameAndDescription = tool({
    description: "Set the name and description of the study set",
    execute: (input) => {
      output.name = input.name;
      output.description = input.description;
    },
    inputSchema: valibotSchema(studySetSchema),
  });

  await generateText({
    messages: [
      {
        content: `Filename is ${filename}.\nHere is the content of first few chars \n\n---\n${truncated}`,
        role: "user",
      },
    ],
    model: getDefaultModel(),
    system: SYSTEM_PROMPT,
    tools: { setStudySetNameAndDescription },
  });

  logger.debug("Infer study name and description result", {
    input: { filename },
    output,
  });

  return output;
};
