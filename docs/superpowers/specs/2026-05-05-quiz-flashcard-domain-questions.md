# Domain Specs Review Questions

This document captures questions for refining the Quiz & Flashcard domain specifications. Each question includes explanation, rationale, common approaches from existing services, and recommendations.

---

## 1. Flashcard Relationship Architecture

### Explanation

Currently, `Flashcard` has both `chapter_id` and `study_set_id` as foreign keys. However, since `Chapter` already belongs to `StudySet` through `Chapter.study_set_id`, having `study_set_id` directly on `Flashcard` creates redundant data storage.

### Reason for Question

We established that flashcards belong to exactly one study set (one-to-many relationship). But if flashcards already belong to a chapter, and chapters belong to study sets, is the direct relationship redundant? This affects:

- Data integrity (possibility of inconsistency)
- Storage efficiency
- Query patterns

### Common Approaches

**Approach A: Flashcard only has `chapter_id`**

- Anki, Quizlet, and most flashcard apps store cards under a parent (deck/chapter) only
- You traverse up: flashcard → chapter → study_set
- Pros: Single source of truth, no redundant data, cleaner schema
- Cons: Extra JOIN required to get study_set

**Approach B: Flashcard has both `chapter_id` AND `study_set_id`**

- Denormalized approach for read performance
- Pros: Direct access to study_set without JOIN, potential read optimization
- Cons: Data redundancy, risk of inconsistency if not enforced at DB level

### Recommendation

**Remove `study_set_id` from Flashcard (Approach A)**. The relationship is transitive and should be derived, not stored. This follows normalization principles and matches how established services handle this hierarchy.

### Answer

## we use approach B to make join simpler, we accept the redundancy

## 2. Quiz Relationship Architecture

### Explanation

Similar to Flashcard, `Quiz` currently has both `chapter_id` and `study_set_id`. The same redundancy concern applies.

### Reason for Question

Quizzes, like flashcards, are contained within chapters. The study_set relationship should be derivable through chapter, making direct storage redundant.

### Common Approaches

Same as Flashcard — established services (Anki, Quizlet, Brainscape) do not duplicate this relationship.

### Recommendation

**Remove `study_set_id` from Quiz**. Same rationale as Flashcard — derive through chapter_id.

### Answer

## use approach B

## 3. Multiple Acceptable Answers for Fill-in-the-Blank

### Explanation

Currently, `QuizQuestion.correct_answer` is a single string field. This implies only one correct answer is allowed. However, many fill-in-the-blank questions have multiple valid responses (e.g., "What is the capital of France?" → "Paris" is correct, but "paris" if case-insensitive, "PAR IS" if typo-tolerant).

### Reason for Question

This directly impacts the data model and how quiz-taking logic works. If we want flexible/lenient grading for fill-in-the-blank, we need to support multiple accepted answers.

### Common Approaches

**Approach A: Single correct answer (current spec)**

- Simple, strict matching only
- Pros: Clear, unambiguous, easy to grade
- Cons: Inflexible for real-world language variability

**Approach B: Array of acceptable answers**

- Store multiple correct answers as JSON array
- Example: `["Paris", "paris", "PARIS"]`
- Pros: Supports case variations, common misspellings
- Cons: More complex matching logic

**Approach C: Regex-based answers**

- Store pattern/regex for answers
- Example: `^paris$` (case insensitive)
- Pros: Maximum flexibility
- Cons: Complex to write, potential performance issues, security concerns with ReDoS

### Recommendation

**Support array of acceptable answers (Approach B)**. This provides a good balance between flexibility and simplicity. The UI can provide an interface to add multiple accepted answers. Implementation can support exact matching with case-insensitivity toggle.

### Answer

## correctness should be carried at option level rather than questions level

## 4. Flashcard Content Format (Rich Text vs Plain Text)

### Explanation

The current spec defines `front`, `back`, and `hint` as plain text fields. However, flashcards often benefit from formatting: bold, italic, code blocks, bullet points, etc.

### Reason for Question

Users studying technical content (programming, medicine, languages) need formatting. Plain text is limiting. But supporting rich text adds complexity in rendering, storage, and sanitization.

### Common Approaches

**Approach A: Plain text only**

- Simplest approach
- Pros: No XSS concerns, easy storage, universal compatibility
- Cons: Limited expressiveness

**Approach B: Markdown support**

- Store content as markdown, render to HTML
- Pros: User-controlled formatting, well-understood syntax, libraries available
- Cons: Slight learning curve, escape syntax needed

**Approach C: Rich text editor (WYSIWYG)**

- Store as HTML or custom format
- Pros: Familiar editing experience
- Cons: XSS sanitization required, larger payload, editor complexity

### Recommendation

**Support Markdown (Approach B)**. This is the most practical balance — widely understood, easy to implement with existing libraries, no XSS concerns, and covers most formatting needs. Most existing services support some form of rich text.

### Answer

## plain text only

## 5. Image Support for Flashcards

### Explanation

The current spec doesn't address images. Anki and Quizlet both support images on flashcards — both front and back can contain text + images.

### Reason for Question

Many subjects require visual learning: anatomy (diagrams), language learning (character images), biology (cell structures), etc. Without image support, the flashcard domain is significantly limited.

### Common Approaches

**Approach A: No images (current spec)**

- Text-only flashcards
- Pros: Simpler, smaller storage
- Cons: Limited use cases

**Approach B: Image URL reference**

- Store image URLs pointing to uploaded files
- Pros: Simple storage model
- Cons: Requires separate file storage infrastructure

**Approach C: Image upload to blob storage**

- Store actual images in object storage (S3, R2, etc.)
- Pros: Self-contained
- Cons: More infrastructure complexity, storage costs

### Recommendation

**Support image URL reference (Approach B)**. Store `image_url` (optional) on front and back. This keeps the domain simple — you handle image storage separately (user uploads → get URL → store in field). Most flashcard workflows involve existing images anyway, not creating new ones.

### Answer

no image support

---

## 6. Quiz Title Requirement

### Explanation

The current spec requires `Quiz.title`. But if a user creates a quiz within a chapter context, the chapter name could serve as the quiz title. Do we really need both?

### Reason for Question

This affects usability and data integrity. Required fields add friction. If the quiz is just a container for questions within a chapter, explicit naming might be unnecessary overhead.

### Common Approaches

**Approach A: Title required (current spec)**

- User must name every quiz
- Pros: Explicit, user knows what they're studying
- Cons: Extra friction

**Approach B: Title optional**

- Defaults to "Quiz [N]" or derived from chapter
- Pros: Less friction
- Cons: Less descriptive if user doesn't customize

### Recommendation

**Make title optional with default generation**. If user doesn't provide title, auto-generate something like "Quiz from [Chapter Title]" or "Practice Quiz". This reduces friction while maintaining usefulness when customized.

### Answer

Without title, quiz should only have questions

---

## 7. Quiz Taking: Attempts and Progress Tracking

### Explanation

The current spec only covers storing quizzes, not taking them. There's no mention of:

- Quiz attempts (who took what quiz when)
- Score/result storage
- Individual question responses
- Time spent

### Reason for Question

A quiz domain that only stores questions but not attempts is incomplete for a learning application. If users can't track their progress, the app has limited utility.

### Common Approaches

**Approach A: No attempt tracking (current spec)**

- Pure content storage
- Pros: Simple, quiz-taking is separate concern
- Cons: Missing core learning functionality

**Approach B: Full attempt tracking**

- `QuizAttempt` entity: user_id, quiz_id, started_at, completed_at, score
- `QuizResponse` entity: attempt_id, question_id, selected_option_ids / typed_answer
- Pros: Complete learning analytics
- Cons: More complex, larger scope

**Approach C: Minimal attempt tracking**

- Just `QuizAttempt` with score, no per-question responses
- Pros: Simpler, enough for basic progress
- Cons: Can't review answers later

### Recommendation

**Defer attempt tracking to a separate domain phase**. Quiz content (questions, options) is the foundation. Attempt tracking is a natural second phase — "quiz taking & results" domain. This keeps the current scope focused. We should spec quiz content completely first, then add attempt tracking later.

### Answer

## pure storage

## 8. Study Set Description Requirement

### Explanation

The current spec has `description` as optional for StudySet. This affects whether every study set must have a meaningful description or can exist with just a title.

### Reason for Question

Optional fields often result in empty, useless descriptions that clutter UI. But requiring description adds friction and may lead to low-quality placeholder text.

### Common Approaches

**Approach A: Optional description (current spec)**

- User can leave blank
- Pros: Less friction
- Cons: Empty descriptions in listings

**Approach B: Required with minimum length**

- Must have at least 10-20 characters
- Pros: Meaningful descriptions
- Cons: Friction, placeholder text

### Recommendation

**Keep description optional but encourage with UI**. Show character count, suggest what to include. Don't enforce at DB level. Users will fill in when it adds value.

### Answer

## approach A

## 9. Chapter: Page Range Support

### Explanation

When users manually create chapters by assigning page ranges from a PDF, we might want to store that range: `page_start` and `page_end`.

### Reason for Question

Since we're deferring PDF content extraction to a later domain, should we still store chapter page ranges as metadata? This could help with:

- Quick navigation reference
- Verifying content was covered
- Future PDF-to-chapter automation

### Common Approaches

**Approach A: No page range (current spec)**

- Pure content organization
- Pros: Simple, content-agnostic
- Cons: Lose PDF structure context

**Approach B: Optional page range**

- `page_start` and `page_end` as optional integers
- Pros: Useful metadata
- Cons: Tighter PDF coupling

### Recommendation

**Add optional `page_start` and `page_end` fields**. Even though PDF generation is deferred, storing page context is cheap (two integers) and useful. It future-proofs for when PDF integration comes.

### Answer

## no page range context

## 10. Study Set and Chapter Slug Uniqueness

### Explanation

Both StudySet and Chapter have `slug` fields. The spec says "unique, user-defined (URL-safe)." We need to clarify: is slug globally unique, or unique only within a parent scope?

### Reason for Question

For URLs like `/study-sets/my-slug/chapters/intro-chapter`, we need to know:

- Can two different study sets have the same chapter slug?
- Can two chapters in the same study set have the same slug?

### Common Approaches

**Approach A: Globally unique slugs**

- `/study-sets/intro/...` where `intro` is unique across entire app
- Simple, guarantees unique URLs
- Cons: Namespace collisions, harder to manage

**Approach B: Unique within parent scope**

- `/study-sets/my-set/chapters/intro` where `intro` is unique only within `my-set`
- More flexible, natural namespacing
- Cons: More complex URL construction

**Approach C: Globally unique for study set, unique within study set for chapter**

- Hybrid approach
- Matches URL patterns users expect

### Recommendation

**Globally unique for StudySet, unique within StudySet for Chapter**. This is the most natural for users — they think in terms of "what's the slug for this study set?" and "within that study set, what slug for this chapter?"

### Answer

## Approach B, chapter slug should only unique scoped to chapter, study set slug should globally unique

## 11. Cloze Deletion vs Fill-in-the-Blank

### Explanation

The current spec has `fill_in_the_blank` as a quiz type. However, Anki's "cloze deletion" is a more powerful concept where you can have text with multiple gaps: "The {{c1::capital}} of {{c2::France}} is {{c3::Paris}}."

### Reason for Question

Standard fill-in-the-blank is "one question, one answer." Cloze deletion allows multiple blanks in one card. This is very popular for language learning and complex text. Should we consider supporting it?

### Common Approaches

**Approach A: Simple fill-in-the-blank only (current spec)**

- One blank, one answer per question
- Pros: Simple implementation
- Cons: Limited expressiveness

**Approach B: Support cloze deletion syntax**

- Use `{{c1::text}}` syntax within content
- Example: Question text contains the cloze, answer is the omitted part
- Pros: Powerful, proven in Anki
- Cons: More complex parsing and UI

### Recommendation

**Start with simple fill-in-the-blank, plan for cloze deletion as future enhancement**. Keep initial scope manageable. Design QuizQuestion with extensible `question_text` field so cloze syntax could be added later.

### Answer

## Approach A

## 12. Tags/Categories for Content

### Explanation

There's no tagging system in the current spec. Flashcards and quizzes have no way to be tagged or categorized beyond chapter membership.

### Reason for Question

Users often want to study "all cards tagged 'important'" or "all questions about photosynthesis." Chapter is one axis; tags provide another dimension of organization.

### Common Approaches

**Approach A: No tags (current spec)**

- Pure hierarchical structure only
- Pros: Simple
- Cons: Limited cross-chapter grouping

**Approach B: Tags on flashcards and quizzes**

- Many-to-many relationship through junction table
- Pros: Flexible, proven pattern
- Cons: More complex, UI considerations

### Recommendation

**Defer tags to future phase**. Chapter hierarchy provides basic organization. Tags are valuable but add significant complexity (tag management UI, tag-based filtering, tag suggestions). Add once core domains are stable.

### Answer

## no tags

## Summary: Recommended Spec Refinements

| Question                           | Recommendation                               |
| ---------------------------------- | -------------------------------------------- |
| Flashcard study_set_id             | Remove — derive through chapter              |
| Quiz study_set_id                  | Remove — derive through chapter              |
| Multiple answers for fill-in-blank | Support array of acceptable answers          |
| Flashcard content format           | Support Markdown                             |
| Image support                      | Add optional image_url fields                |
| Quiz title                         | Make optional with auto-generation           |
| Attempt tracking                   | Defer to separate domain phase               |
| Study set description              | Keep optional, encourage via UI              |
| Chapter page range                 | Add optional page_start, page_end            |
| Slug uniqueness                    | Global for study set, per-parent for chapter |
| Cloze deletion                     | Defer, design for extensibility              |
| Tags                               | Defer to future phase                        |
