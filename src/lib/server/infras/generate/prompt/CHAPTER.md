# Chapter Extraction Rules

Use these rules to extract chapters from source content before generating quizzes and flashcards.

Assume the input is not structured. It may come from notes, copied web pages, PDFs, transcripts, slides, OCR output, or mixed text. Do not trust formatting alone. Infer chapters only when the content clearly needs separate learning sections.

## Supported Chapter Structure

Each extracted chapter must use these fields:

- `title`: a short plain-text title for the chapter.
- `slug`: a generation-time identifier used to link quizzes and flashcards to the chapter.

Do not generate unsupported chapter fields unless the output schema explicitly asks for them.

## Extraction Goal

Chapters should organize learning content into a small number of meaningful sections.

- Extract chapters only when they help group related quizzes and flashcards.
- Prefer fewer, broader chapters over many tiny chapters.
- Preserve the source's main learning structure when it is clear.
- If the input is short, focused, or covers one topic, create one chapter only.
- If the input has no useful section boundaries, create one chapter that represents the whole content.
- Do not create a chapter for every paragraph, bullet list, sentence, example, figure label, page break, or repeated heading.

## When To Create A Chapter

Create a chapter when at least one of these is true:

- The source has a clear section heading with enough content beneath it.
- The topic changes to a new major concept, process, event, or skill.
- A group of details belongs together and would produce several related quizzes or flashcards.
- The source explicitly separates units, modules, lessons, or chapters.

Do not create a chapter when the text is only:

- A short transition sentence.
- A single isolated fact.
- A list item that belongs under a larger topic.
- A sub-point, example, note, warning, or definition inside a larger section.
- A repeated header, footer, page number, navigation label, citation, or decorative title.

## Overextraction Prevention

Avoid overextracting chapters.

- Merge adjacent small sections when they explain the same topic.
- Merge headings that have little or no learning content under them.
- Merge examples with the concept they demonstrate.
- Merge definitions with the section where the term is taught.
- Split only when the learner would reasonably study the sections separately.
- Split only when each chapter can support meaningful flashcards or quizzes.
- Do not split just because the source has many visual breaks or inconsistent formatting.

Good extraction behavior:

- A five-paragraph explanation of photosynthesis becomes one chapter: `Photosynthesis`.
- A biology lesson with clear sections on cells, tissues, and organs becomes three chapters.
- A copied PDF page with headers, footers, and page numbers ignores those repeated elements.
- A short mixed note about one lecture becomes one broad chapter, not many micro-chapters.

## Title Rules

Chapter titles must be useful to students.

- Use concise, descriptive titles.
- Use title case or natural academic wording.
- Keep titles focused on the topic, not the source formatting.
- Prefer `Cell Structure` over `Section 1`.
- Prefer `Supply And Demand` over `Important Notes`.
- Avoid vague titles such as `Overview`, `Introduction`, or `Key Points` unless the source is genuinely introductory.
- Avoid titles based only on page numbers, slide numbers, or list numbers.

## Slug Rules

The `slug` is the stable generation-time link between chapters, quizzes, and flashcards.

- Generate one slug for every extracted chapter.
- Use lowercase letters, numbers, and underscores only.
- Do not use spaces, hyphens, punctuation, accents, or special characters.
- Make the slug meaningfully match the chapter title.
- Make each slug unique across all generated chapters.
- Keep slugs short but descriptive.
- If two titles would produce the same slug, add a short numeric suffix such as `_2`.

Examples:

| Title                   | Slug                      |
| ----------------------- | ------------------------- |
| Introduction to Algebra | `introduction_to_algebra` |
| Cell Structure          | `cell_structure`          |
| Supply And Demand       | `supply_and_demand`       |
| Photosynthesis          | `photosynthesis`          |

## Linking Rules

Every generated quiz and flashcard must reference one extracted chapter by `chapterSlug`.

- The `chapterSlug` value must exactly match one generated chapter `slug`.
- Do not link by chapter title, chapter order, source page, or inferred position.
- Do not invent a `chapterSlug` that is missing from the chapter list.
- If content could fit multiple chapters, choose the most specific matching chapter.
- If content applies to the whole source, link it to the broadest relevant chapter.

## Quality Checklist

Before accepting extracted chapters, verify these points.

- The input was treated as potentially unstructured.
- Chapters were created only where useful learning boundaries exist.
- The output avoids overextracting tiny or formatting-based sections.
- Every chapter has a clear `title` and unique `slug`.
- Every quiz and flashcard can link to an existing chapter by exact `chapterSlug`.
