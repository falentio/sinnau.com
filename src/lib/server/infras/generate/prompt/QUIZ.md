# Quiz Generation Rules with Bloom's Taxonomy

Use these rules to create clear, useful quiz items that follow Bloom's Taxonomy and match the supported quiz data structure.

Quiz items must be friendly for high school and college students. Use direct, plain sentences that test learning without sounding childish, vague, or unnecessarily formal.

## Supported Quiz Structure

Generate only the quiz types supported by the quiz service.

| Type              | Use When                                                                 | Required Answer Shape                                                          |
| ----------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `MULTIPLE_CHOICE` | The learner must choose exactly one correct answer.                      | 2-6 options, exactly one correct option.                                       |
| `MULTIPLE_SELECT` | The learner must choose every correct answer from several valid answers. | 2-10 options, at least one correct option. Prefer two or more correct options. |

Each quiz must use these fields:

- `questionText`: the plain-text question or prompt.
- `options`: answer options for the quiz.
- `optionText`: the plain-text answer option.
- `isCorrect`: whether the option is correct.
- `explanation`: plain-text reason for why the option is correct or incorrect. Generated quiz options must include this field, even though the service supports it as optional.
- `chapterSlug`: the exact slug of the chapter this quiz belongs to.

Do not generate unsupported quiz formats such as true/false, matching, ordering, essay, image-based questions, cloze deletion with multiple blanks, or free-response questions.

## Chapter Link Rules

Every quiz must be linked to one extracted chapter by `chapterSlug`.

- Set `chapterSlug` to the exact `slug` value from the generated chapter list.
- Do not link quizzes by chapter title, chapter order, source page, or inferred position.
- Do not invent a `chapterSlug` that does not exist in the generated chapter list.
- If a quiz could fit multiple chapters, choose the most specific matching chapter.
- If a quiz covers a broad idea from the whole source, link it to the broadest relevant chapter.
- Keep the quiz content aligned with the chapter it references.

## Bloom's Taxonomy Usage

Classify each quiz by the highest cognitive skill required to answer it correctly.

| Bloom Level  | Good Quiz Use                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| `Remember`   | Ask for facts, terms, definitions, names, dates, formulas, or direct details from the source.                    |
| `Understand` | Ask the learner to identify meaning, explain a concept, choose a summary, or recognize an example.               |
| `Apply`      | Ask the learner to use a rule, formula, process, or concept in a specific situation.                             |
| `Analyze`    | Ask the learner to compare, separate parts, identify causes, recognize patterns, or inspect relationships.       |
| `Evaluate`   | Ask the learner to choose the strongest, most accurate, or most justified option using stated criteria.          |
| `Create`     | Avoid for current quiz types unless the task can be answered by selecting one clearly correct generated product. |

Use `Remember` and `Understand` for foundational concepts. Use `Apply`, `Analyze`, and `Evaluate` when the source text gives enough information to support the reasoning. Do not force a higher Bloom level if the source only supports recall.

## Language Rules

Use language that is clear for high school and college students.

- Write one focused task per question.
- Use plain, active sentences.
- Keep the question short enough to understand on the first read.
- Use course terms from the source, but explain or contextualize uncommon terms when needed.
- Prefer concrete wording over abstract wording.
- Ask what the learner should do, not what the test writer is thinking.
- Avoid jokes, sarcasm, trick wording, and intentionally confusing phrasing.
- Avoid double negatives such as "Which option is not incorrect?"
- Avoid vague words like "best", "main", "important", or "effective" unless the criteria are stated in the question.
- Avoid absolutes like "always" and "never" unless the source clearly supports them.
- Avoid "all of the above" and "none of the above" because they reduce the quality of reasoning.

Good question wording examples:

- What is the main function of mitochondria in a cell?
- Which sentence best explains why supply decreases when production costs rise?
- A rectangle has a length of 8 cm and a width of 5 cm. What is its area?
- Select all statements that are supported by the passage.
- What is the term for the process by which plants convert sunlight into chemical energy?

## Ambiguity Prevention

Each quiz must have a clearly defensible answer.

- Include enough context so the question has only one reasonable interpretation.
- State the topic, condition, timeframe, unit, or scenario when it affects the answer.
- Make sure every correct option is fully correct, not only partially correct.
- Make sure every incorrect option is clearly incorrect based on the source.
- Make sure correct and incorrect options are not easy to distinguish by length, grammar, detail level, certainty, or wording style.
- Do not create questions that depend on personal opinion unless the criteria are explicitly stated.
- Do not ask about information that is missing from the source.
- Do not combine multiple unrelated facts into one question.
- Do not make two options overlap so much that both could be correct for the same reason.
- If a question can be answered in multiple valid ways, rewrite it or use a different quiz type.

## Multiple Choice Rules

Use `MULTIPLE_CHOICE` when exactly one answer should be selected.

- Create 2-6 options.
- Mark exactly one option as `isCorrect: true`.
- Make all incorrect options plausible but clearly wrong.
- Keep options similar in length, grammar, and level of detail.
- Avoid making the correct option obviously longer, more specific, or more formal than the others.
- Make options mutually exclusive whenever possible.
- Use the same sentence style across all options.
- Add an explanation to every option that describes why the option is correct or incorrect.
- Keep explanations specific to the source and avoid generic statements such as "This is wrong" or "This is correct."

Good multiple-choice example:

Question: Which organelle releases energy from glucose for the cell to use?

Correct option: Mitochondrion

Reason: The question has one clear correct answer and the wording is direct.

## Multiple Select Rules

Use `MULTIPLE_SELECT` when more than one option may be correct.

- Create 2-10 options.
- Prefer two or more correct options so the quiz type is meaningfully different from multiple choice.
- Use wording such as "Select all statements that apply" or "Select all answers supported by the source."
- Make each option independently true or false.
- Avoid options that depend on another option being selected.
- Avoid vague options that are only sometimes correct unless the condition is stated.
- Do not reveal the number of correct answers unless the learning goal requires it.
- Add an explanation to every option that describes why the option is correct or incorrect.

Good multiple-select example:

Question: Select all statements that describe renewable energy sources.

Correct options: They can be naturally replenished; Solar power is an example.

Reason: Each option can be judged independently.

## Quality Checklist

Before accepting a quiz item, verify these points.

- The quiz uses one of the supported types.
- The question has one clear learning goal.
- The Bloom level matches the thinking required.
- The language is friendly for high school or college students.
- The `chapterSlug` exactly matches an existing generated chapter `slug`.
- The answer is supported by the source text.
- The options follow the constraints for the quiz type.
- The correct answer is not obvious from option length, grammar, wording style, specificity, or confidence level.
- Every option includes an explanation for why it is correct or incorrect.
- The item avoids ambiguity, unsupported assumptions, and trick wording.
