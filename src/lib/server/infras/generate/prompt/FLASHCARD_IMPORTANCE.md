# Flashcard Importance Rubric Rules

Use these rules to decide how important a flashcard is for study and review. The rubric is based on the Pareto principle: a small number of flashcards should produce most of the learning gain.

Every generated flashcard must include a compact rubric string in `flashcard.rubric`. The rubric records which importance rules apply and how many points each rule contributes.

## Rubric Format

Assign `flashcard.rubric` as comma-separated `RuleName:point` pairs.

Format:

```text
RuleName:2,OtherRule:3,OtherOtherRule:-5
```

Rules:

- Use exact rule names from the rubric table.
- Separate pairs with commas.
- Separate each rule name and point with a colon.
- Do not add spaces around commas or colons.
- Use integer points only.
- Points may be positive, zero, or negative.
- Write positive points without a plus sign, such as `5`, not `+5`.
- Write negative points with a minus sign, such as `-3`.
- Do not include explanations, sentences, JSON, markdown, or extra text inside `flashcard.rubric`.

Good examples:

```text
CoreConcept:5,Prerequisite:4,Terminology:2
ContextOnly:0
TooNarrow:-2,LowStudyValue:-3
```

Bad examples:

```text
CoreConcept +5, Terminology +2
{"CoreConcept": 5}
CoreConcept: important because it appears often
CoreConcept:+5
```

## Pareto Scoring Meaning

The total importance score is the sum of all rubric points. Use the score to rank flashcards by learning gain.

- Higher total score means the flashcard is more important.
- After scoring a batch, sorting by total score should put the highest-gain 20% of flashcards at the top.
- The top 20% should be cards that unlock repeated use, recurring theory, prerequisite knowledge, or concepts needed across many later questions.
- Do not make every card high importance. Most flashcards should have moderate, neutral, or low importance so the top 20% is meaningful.
- Zero means the flashcard has neutral study value.
- Negative total score means the flashcard is probably weak, too narrow, duplicated, unsupported, or should be removed.
- If a flashcard receives a strong negative rule, revise it or drop it unless it also has strong positive value.
- If a persisted `importance` number is needed, sum the rubric points and clamp negative totals to `0` because flashcard importance must not be negative.

## Importance Decision Criteria

Judge importance by how much future learning value the flashcard creates.

- Use frequency: how often the theory, concept, formula, or term will be reused in later study or problems.
- Dependency value: whether other ideas become easier or possible only after knowing this card.
- Transfer value: whether the idea applies across examples, chapters, subjects, or problem types.
- Error reduction: whether knowing the card prevents common mistakes or misconceptions.
- Assessment value: whether the card is likely to be tested, practiced, or needed for assignments.
- Specificity: whether the card teaches one precise reusable idea instead of vague background.
- Source emphasis: whether the source presents the idea as central, repeated, defined, summarized, or required.

## Positive Rules

Use positive rules when the flashcard is valuable for learning.

| Rule Name             | Points | Apply When                                                                                                         |
| --------------------- | -----: | ------------------------------------------------------------------------------------------------------------------ |
| `ParetoTop20`         |      8 | The card is likely in the top 20% by learning gain after comparing it with other generated flashcards. Use rarely. |
| `FrequentUseTheory`   |      6 | The theory, concept, formula, or rule will be reused often across later explanations, problems, or chapters.       |
| `CoreConcept`         |      5 | The card teaches a central idea needed to understand the topic.                                                    |
| `LearningObjective`   |      5 | The source clearly presents this as a main learning goal, section objective, or required takeaway.                 |
| `TransferableConcept` |      5 | The card applies across multiple examples, contexts, subjects, or problem types.                                   |
| `Prerequisite`        |      4 | The learner needs this card before understanding later concepts, steps, formulas, or examples.                     |
| `AssessmentHighYield` |      4 | The card covers knowledge likely to appear in practice questions, assignments, exams, or checks for understanding. |
| `CommonMisconception` |      3 | The card prevents a likely confusion or common incorrect understanding.                                            |
| `HighYieldFact`       |      3 | The card covers a frequently used fact, definition, formula, date, term, or relationship.                          |
| `SourceEmphasis`      |      3 | The source repeats, defines, summarizes, labels, or otherwise emphasizes this idea.                                |
| `ProcessStep`         |      2 | The card covers an important step in a process, sequence, method, or workflow.                                     |
| `CauseEffect`         |      2 | The card explains why something happens or how one idea affects another.                                           |
| `Terminology`         |      2 | The card teaches an important term, symbol, abbreviation, or label.                                                |
| `ExampleBridge`       |      1 | The card uses or explains an example that helps connect an abstract idea to a concrete case.                       |

## Neutral Rules

Use neutral rules when the flashcard is acceptable but not especially important.

| Rule Name     | Points | Apply When                                                                               |
| ------------- | -----: | ---------------------------------------------------------------------------------------- |
| `ContextOnly` |      0 | The card gives useful background, but it is not central to the topic.                    |
| `NiceToKnow`  |      0 | The card is interesting or supportive, but learners can understand the topic without it. |

## Negative Rules

Use negative rules when the flashcard has low study value or should be revised.

| Rule Name             | Points | Apply When                                                                                                                     |
| --------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------ |
| `DuplicateOverlap`    |     -4 | The card repeats another flashcard without adding a distinct learning target.                                                  |
| `RarelyUsedDetail`    |     -3 | The card covers information that is unlikely to be reused in later study, problems, or explanations.                           |
| `TooBroad`            |     -3 | The card asks for too many ideas at once or cannot be answered clearly in 1-4 sentences.                                       |
| `TooNarrow`           |     -2 | The card focuses on a minor detail that is unlikely to help the learner understand the topic.                                  |
| `OneOffExample`       |     -2 | The card memorizes a single example without teaching the reusable concept behind it.                                           |
| `UnclearTarget`       |     -4 | The front, back, or hint does not make the expected answer clear enough.                                                       |
| `UnsupportedBySource` |     -5 | The card includes information not supported by the source content.                                                             |
| `LowStudyValue`       |     -3 | The card tests trivia, formatting, navigation text, metadata, or a detail with little learning value.                          |
| `FormattingArtifact`  |     -5 | The card was created from page numbers, headers, footers, captions without context, OCR noise, or repeated document artifacts. |

## Assignment Rules

Assign rubric rules based on the final flashcard content, not only the source text.

- Apply every rule that meaningfully affects importance.
- Do not add rules just to inflate or reduce the score.
- Do not use the same rule more than once on one flashcard.
- Prefer specific rules over vague scoring.
- Assign `ParetoTop20:8` only after comparing the card against other generated flashcards in the same batch, chapter, or study set.
- Use `ParetoTop20:8` for roughly one out of every five flashcards at most.
- Prefer `FrequentUseTheory:6`, `TransferableConcept:5`, and `Prerequisite:4` for cards that will be used repeatedly.
- Use negative rules for precise demotion when a card is rare, narrow, duplicated, or low value.
- If no positive or negative rule clearly applies, use `ContextOnly:0`.
- If a card has `UnsupportedBySource:-5` or `FormattingArtifact:-5`, remove or rewrite the flashcard instead of keeping it.
- If a card has `TooBroad:-3` or `UnclearTarget:-4`, split or rewrite the flashcard before accepting it.

## Examples

High-importance flashcard:

```text
front: What is photosynthesis?
back: Photosynthesis is the process plants use to convert sunlight, water, and carbon dioxide into glucose and oxygen.
rubric: ParetoTop20:8,FrequentUseTheory:6,CoreConcept:5,LearningObjective:5,Terminology:2
```

Medium-importance flashcard:

```text
front: What happens during evaporation?
back: Evaporation happens when liquid water changes into water vapor.
rubric: HighYieldFact:3,ProcessStep:2,CauseEffect:2
```

Neutral flashcard:

```text
front: What background detail helps explain where the experiment took place?
back: The experiment took place in a classroom setting.
rubric: ContextOnly:0
```

Low-quality flashcard that should be revised or removed:

```text
front: What is on page 4?
back: Page 4 contains the lesson header.
rubric: FormattingArtifact:-5,LowStudyValue:-3
```

Low-importance flashcard about a rarely reused detail:

```text
front: What color was the chart border in the example?
back: The chart border was blue.
rubric: RarelyUsedDetail:-3,LowStudyValue:-3
```

## Quality Checklist

Before accepting a flashcard rubric, verify these points.

- `flashcard.rubric` uses only comma-separated `RuleName:point` pairs.
- Every rule name exists in this document.
- Every point matches the point value for that rule.
- Positive, zero, and negative points are allowed when applicable.
- The rubric reflects the actual learning value and reuse frequency of the flashcard.
- The highest totals identify a meaningful top 20% of high-gain cards.
- `ParetoTop20:8` is used sparingly and only for the strongest cards.
- Strong negative rules cause the card to be revised or removed when possible.
