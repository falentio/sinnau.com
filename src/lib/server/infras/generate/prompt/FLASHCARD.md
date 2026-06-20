# Flashcard Generation Rules with Bloom's Taxonomy

Use these rules to create clear, useful flashcards that follow Bloom's Taxonomy and match the supported flashcard data structure.

Flashcards must be friendly for high school and college students. Use direct, plain sentences that help learners recall and understand important ideas without confusion.

## Supported Flashcard Structure

Each flashcard has three important content fields.

| Field   | Purpose                                                                 | Quality Rule                                                            |
| ------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `front` | The prompt, question, or cue shown first.                               | Ask for one specific idea, term, relationship, or explanation.          |
| `back`  | The answer or explanation learners should remember.                     | Give the direct answer first, then add a short clarification if useful. |
| `hint`  | An optional clue that helps the learner without giving away the answer. | Point toward the answer, but do not restate it.                         |

All flashcard content must be plain text. Do not generate markdown, rich text, images, cloze deletion, tags, or unsupported fields outside the generation schema.

Each flashcard must also include `chapterSlug`, the exact slug of the chapter this flashcard belongs to.

Each flashcard must also include `rubric`, a comma-separated importance rubric string using the rules in `FLASHCARD_IMPORTANCE.md`.

## Chapter Link Rules

Every flashcard must be linked to one extracted chapter by `chapterSlug`.

- Set `chapterSlug` to the exact `slug` value from the generated chapter list.
- Do not link flashcards by chapter title, chapter order, source page, or inferred position.
- Do not invent a `chapterSlug` that does not exist in the generated chapter list.
- If a flashcard could fit multiple chapters, choose the most specific matching chapter.
- If a flashcard covers a broad idea from the whole source, link it to the broadest relevant chapter.
- Keep the flashcard content aligned with the chapter it references.

## Bloom's Taxonomy Priority

Prioritize `Remember` and `Understand` flashcards.

| Bloom Level  | Flashcard Fit | Use                                                                                           |
| ------------ | ------------- | --------------------------------------------------------------------------------------------- |
| `Remember`   | Strong fit    | Recall a term, definition, fact, formula, step, symbol, or key detail.                        |
| `Understand` | Strong fit    | Explain meaning, summarize an idea, identify a relationship, or distinguish similar concepts. |
| `Apply`      | Limited fit   | Use only for short procedures, formulas, or direct examples that fit on one card.             |
| `Analyze`    | Limited fit   | Use only for simple comparisons or cause-effect relationships.                                |
| `Evaluate`   | Weak fit      | Avoid unless the criteria and answer are clearly stated in the source.                        |
| `Create`     | Weak fit      | Avoid because flashcards are not designed for open-ended original responses.                  |

Do not force every source detail into a high Bloom level. Most strong flashcards help learners build memory and understanding before assessment.

## Front Rules

The `front` should make the learner retrieve one clear answer.

- Ask one question or give one cue per card.
- Make the expected answer obvious in scope, not obvious in content.
- Use direct wording such as "What is...", "Why does...", "How does...", or "What is the difference between..."
- Include context when a term could mean different things in different subjects.
- Avoid vague prompts such as "Explain this concept" or "What about photosynthesis?"
- Avoid yes/no questions because they usually create weak recall.
- Avoid asking for long lists unless the list is short, fixed, and important.
- Avoid putting the answer inside the question.
- Avoid pronouns like "it", "this", or "they" unless the referent is named clearly.

Good `front` examples:

- What is the function of mitochondria in a cell?
- Why does demand usually decrease when price increases?
- What is the difference between mitosis and meiosis?
- What does the slope of a line represent in a graph?

## Back Rules

The `back` should answer the front directly and clearly.

- Put the direct answer in the first sentence.
- Keep the answer short, usually 1-4 sentences.
- Use student-friendly language without removing important technical meaning.
- Include the key term, definition, relationship, or reason from the source.
- Add one brief explanation when it helps understanding.
- Do not include unrelated extra facts.
- Do not make the learner infer the answer from a vague explanation.
- Do not copy a long paragraph when a concise answer is possible.

Good `back` example:

Front: What is the function of mitochondria in a cell?

Back: Mitochondria release usable energy from glucose. This energy helps power cell activities.

Reason: The answer starts directly and adds one helpful clarification.

## Hint Rules

The `hint` should help the learner think without giving away the answer.

- Use a hint when the front is difficult, technical, or easy to confuse with another concept.
- Give one clue only.
- Point to the category, context, first step, related idea, or contrast.
- Keep the hint shorter than the back.
- Do not include the exact answer in the hint.
- Do not make the hint so broad that it is useless.
- Leave `hint` empty when the front is already clear and fair.

Good `hint` examples:

- Think about the organelle linked to energy release.
- Focus on how price affects buyer behavior.
- Compare the number of resulting cells.
- Look at the change in y for each change in x.

## Language Rules

Use language that is clear for high school and college students.

- Prefer short, direct sentences.
- Use familiar academic wording instead of overly technical phrasing when possible.
- Keep necessary technical terms from the source.
- Define or clarify difficult terms on the back when needed.
- Avoid slang, jokes, sarcasm, and childish wording.
- Avoid unnecessary filler such as "Can you remember" or "Try to think about".
- Avoid double negatives and complicated sentence structures.
- Avoid prompts that require guessing what the card creator intended.

Better language examples:

| Weak                   | Better                                           |
| ---------------------- | ------------------------------------------------ |
| What about enzymes?    | What role do enzymes play in chemical reactions? |
| Explain cells.         | What is the basic function of a cell?            |
| Why is this important? | Why is photosynthesis important for plants?      |
| What happens here?     | What happens during evaporation?                 |

## Ambiguity Prevention

Each flashcard must have one clear target answer.

- Split broad topics into multiple cards.
- Do not ask about two unrelated facts on the same card.
- Add the subject area when the same term has different meanings.
- Avoid open-ended opinion prompts unless the source gives a specific expected answer.
- Avoid prompts where several answers could be equally correct.
- Avoid answers that depend on missing context from another card.
- Make the front and back specific enough to stand alone.
- Rewrite the card if a learner could reasonably answer it in a different valid way.

## Remember Flashcard Patterns

Use these patterns for `Remember` flashcards.

| Pattern            | Front                                                   | Back                                                                                                             |
| ------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Term to definition | What is photosynthesis?                                 | Photosynthesis is the process plants use to convert sunlight, water, and carbon dioxide into glucose and oxygen. |
| Definition to term | What is the term for water changing from liquid to gas? | Evaporation.                                                                                                     |
| Fact recall        | What is the capital city of France?                     | Paris.                                                                                                           |
| Formula recall     | What is the formula for the area of a rectangle?        | Area = length x width.                                                                                           |

## Understand Flashcard Patterns

Use these patterns for `Understand` flashcards.

| Pattern             | Front                                                   | Back                                                                                                                   |
| ------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Why                 | Why is photosynthesis important for plants?             | Photosynthesis lets plants make glucose, which stores energy they need to grow and survive.                            |
| How                 | How does insulation help reduce heat loss?              | Insulation slows the transfer of heat from a warmer area to a cooler area.                                             |
| Compare             | What is one key difference between mitosis and meiosis? | Mitosis produces two identical body cells, while meiosis produces sex cells with half the usual number of chromosomes. |
| Example recognition | Why is solar power considered renewable?                | Solar power is renewable because sunlight is naturally replenished.                                                    |

## Quality Checklist

Before accepting a flashcard, verify these points.

- The card has a clear `front`, `back`, and optional `hint`.
- The card focuses on one idea only.
- The Bloom level is usually `Remember` or `Understand`.
- The language is friendly for high school or college students.
- The `chapterSlug` exactly matches an existing generated chapter `slug`.
- The `rubric` follows the `RuleName:point` format from `FLASHCARD_IMPORTANCE.md`.
- The `front` has enough context to stand alone.
- The `back` answers directly and concisely.
- The `hint` helps without revealing the answer.
- The card avoids ambiguity, unsupported assumptions, and unnecessary complexity.
