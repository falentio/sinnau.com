# Domain Specs Review Questions — Phase 2

This document captures additional questions for refining the Quiz & Flashcard domain specifications. Each question includes explanation, rationale, common approaches from existing services, and recommendations.

---

## 29. Slug Generation Strategy

### Explanation

We defined slug format (alphanumeric + hyphens, lowercase, max 64 chars) and uniqueness rules, but not how slugs are created.

### Reason for Question

Users may want to create a study set without manually specifying a slug. We need to know:

- Is slug required (must provide)?
- Or can it be auto-generated from title?
- If auto-generated, what happens if title has special characters?

### Common Approaches

**Approach A: Slug required from user**

- User must provide slug on create
- Pros: User controls URL, predictable
- Cons: Extra friction, potential conflicts

**Approach B: Auto-generate from title, user can override**

- If slug not provided, generate from title
- "My Study Set" → "my-study-set"
- Remove special chars, replace spaces with hyphens
- Pros: Less friction, always has slug
- Cons: Generated slugs may not be ideal

**Approach C: Auto-generate only, no manual input**

- Slug fully derived from title
- If user wants custom slug, they rename title
- Pros: Simplest
- Cons: Less control

### Recommendation

**Approach B — Auto-generate from title with override**. Provide both convenience and flexibility. If user provides slug, use it. If not, derive from title.

### Your Answer

## Approach B

## 30. Chapter and Flashcard/Quiz Relationship

### Explanation

We have `chapter_id` on Flashcard and Quiz, and `study_set_id` on all three. But can flashcards or quizzes exist without a chapter?

### Reason for Question

The original spec says flashcards and quizzes are "categorized by chapter". But we also allow direct `study_set_id`. This creates ambiguity:

- Can I create a flashcard that belongs to a study set but no chapter?
- Is chapter required or optional?

### Common Approaches

**Approach A: Chapter required for all**

- Every flashcard and quiz must have a chapter_id
- No orphan content
- Pros: Complete organization
- Cons: Inflexible

**Approach B: Chapter optional**

- Flashcard/Quiz can exist at study_set level without chapter
- Pros: Flexible
- Cons: Inconsistent structure

**Approach C: Chapter required, but can create "uncategorized" chapter**

- System auto-creates "Uncategorized" chapter if needed
- Pros: Always organized
- Cons: Hidden default

### Recommendation

**Approach A — Chapter required**. Keep the model simple. Every flashcard and quiz belongs to exactly one chapter. If user wants to group everything together, they create one chapter.

### Your Answer

Chapter required

---

## 31. Visibility Inheritance for Child Entities

### Explanation

StudySet has `visibility` enum (`public`, `private`). But what about chapters, flashcards, and quizzes? Do they inherit from parent or have their own visibility?

### Reason for Question

If a study set is public, do all its contents automatically become public? Or can individual chapters be marked private? This affects:

- API authorization checks
- UI showing locked/unlocked content
- Consistency of permissions

### Common Approaches

**Approach A: Inherit from parent only**

- Chapters/flashcards/quizzes don't have visibility field
- Always check parent chain: flashcard → chapter → study_set
- Pros: Single source of truth
- Cons: Always need to traverse parent for permission

**Approach B: Each entity has its own visibility**

- Override parent visibility
- Study set public, but specific chapter private
- Pros: Fine-grained control
- Cons: Complex permission system

**Approach C: Only study set has visibility**

- All children inherit public/private from study set
- No per-entity override
- Pros: Simple, predictable
- Cons: Less flexibility

### Recommendation

**Approach C — Only StudySet has visibility**. Simpler model. Children inherit from parent. If user wants different visibility for subset, they create separate study sets.

### Your Answer

## Approach C

## 32. Foreign Key Cascade Behavior

### Explanation

We have foreign keys between entities (e.g., Flashcard.chapter_id → Chapter.id). When a parent is deleted, what happens to children?

### Reason for Question

Currently we only have hard delete (no soft delete). If a user deletes a chapter:

- Should flashcards in that chapter also be deleted (cascade)?
- Should deletion be blocked if children exist?
- Should flashcards be moved to another chapter or orphan?

### Common Approaches

**Approach A: Cascade delete**

- Deleting parent deletes all children
- Deleting chapter deletes all flashcards/quizzes in it
- Pros: No orphaned records
- Cons: Accidental deletion is destructive

**Approach B: Block delete if children exist**

- Cannot delete chapter if it has flashcards
- Must delete children first
- Pros: Prevents accidental data loss
- Cons: Extra steps for cleanup

**Approach C: Set null (move to root)**

- Children get chapter_id = null
- Flashcard now belongs to study_set only
- Pros: Never lose data
- Cons: Orphaned records

### Recommendation

**Approach B — Block delete if children exist**. Safer default. User must explicitly delete children first. This prevents accidental mass deletion.

### Your Answer

Cascade delete if children exists

---

## 33. Batch Create: Partial Failure Handling

### Explanation

We said POST /flashcards accepts array only. But what if the array has 10 items and item #5 fails validation?

### Reason for Question

This affects:

- Transaction handling — should we rollback all or commit valid ones?
- Response format — what do we return if some succeed?
- Idempotency — if retry, do we get duplicates?

### Common Approaches

**Approach A: All or nothing transaction**

- If any item fails, rollback entire batch
- Return error with index of failure
- Pros: Consistent state
- Cons: All fail if one fails

**Approach B: Partial success with errors**

- Valid items are created, invalid ones reported
- Return both created items and error list
- Pros: More useful, don't waste valid data
- Cons: Complex response format

**Approach C: Process in order, stop on first failure**

- Create items until one fails
- Return created count and failed item
- Pros: Simple
- Cons: Don't create remaining items

### Recommendation

**Approach A — All or nothing transaction**. Simpler to reason about. If user wants partial success, they can batch in smaller chunks. Also simplifies idempotency.

### Your Answer

Approach A

---

## 34. Batch Update and Delete

### Explanation

We defined batch create (POST with array). But what about update and delete operations?

### Reason for Question

Full CRUD needs:

- Batch update (PATCH /flashcards with array)
- Batch delete (DELETE /flashcards with array)

### Common Approaches

**Approach A: No batch operations**

- Only single item update/delete
- Batch requires loop of individual calls
- Pros: Simple API
- Cons: Inefficient for bulk changes

**Approach B: Same as create — array accepted**

- PATCH /flashcards accepts array
- DELETE /flashcards accepts array
- Pros: Consistent, flexible
- Cons: More complex logic

**Approach C: Separate batch endpoints**

- POST /flashcards/batch
- PATCH /flashcards/batch
- DELETE /flashcards/batch
- Pros: Clear intent, can have different auth
- Cons: More endpoints

### Recommendation

**Approach B — Same endpoint, array accepted**. Consistent with create. Single items also use array (single-item array). Simpler mental model.

### Your Answer

Update are single
Delete are batch

---

## 35. Client-Generated IDs

### Explanation

We specified UUIDs are auto-generated (server-side). But should clients be allowed to provide their own IDs?

### Reason for Question

Client-generated IDs can help with:

- Offline-first apps (sync with known IDs)
- Import/export (preserve original IDs)
- Reducing round-trips (create with known ID)

### Common Approaches

**Approach A: Server-generated only (current spec)**

- POST without id, server creates UUID
- Pros: Always unique, no conflicts
- Cons: Client must wait for response to know ID

**Approach B: Client may provide ID**

- If client provides id, use it; otherwise generate
- Conflict if ID already exists → error
- Pros: More flexibility
- Cons: Conflict handling needed

**Approach C: Client-generated UUIDs only**

- Client MUST provide UUID on create
- Server never generates IDs
- Pros: Full client control
- Cons: Trust issues, potential conflicts

### Recommendation

**Approach B — Client may provide ID**. Add `id` field to create payload. If provided, use it; if not, server generates. Conflict returns error.

### Your Answer

No, client should not provide uuid, the uuid generated on server side

---

## 36. Flashcard Hint Constraints

### Explanation

Flashcard has `hint` field marked as optional. But should there be any content constraints?

### Reason for Question

- Max length? (hints could be very long)
- Same plain text requirement? (no markdown/images?)
- Can hint be same as front/back? (duplicate content)

### Common Approaches

**Approach A: No constraints**

- Any text, any length
- Pros: Maximum flexibility
- Cons: No quality control

**Approach B: Max length only**

- Limit hint to 500 chars or similar
- Pros: Prevent abuse
- Cons: Arbitrary limit

**Approach C: Content guidelines only**

- No explicit limit, but UI can suggest/validate
- Pros: Flexible
- Cons: Inconsistent enforcement

### Recommendation

**Approach B — Max 500 characters**. Simple constraint. Prevents excessively long hints without being overly restrictive.

### Your Answer

APproach B

---

## 37. Flashcard Front/Back Constraints

### Explanation

Flashcard has `front` and `back` as required fields. But should there be constraints on content?

### Reason for Question

- Min/max length?
- Empty string allowed?
- Same content allowed (front == back)?

### Common Approaches

**Approach A: Required, non-empty**

- front and back must have at least 1 character
- Can be same content
- Pros: Simple
- Cons: No real validation

**Approach B: Min length required**

- At least 3-5 characters
- Prevents single-character cards
- Pros: Meaningful content
- Cons: Arbitrary limit

### Recommendation

**Approach A — Required, non-empty**. Keep it simple. Single character front/back is technically valid, even if not useful.

### Your Answer

Non empty, max length is 4 setnences(estimate)

---

## 38. Quiz Type Storage

### Explanation

Quiz has `type` enum. But how is this stored in the database?

### Reason for Question

Options for enum storage:

- String column with check constraint
- Separate type table with FK
- Integer mapping

### Common Approaches

**Approach A: String enum**

- Type stored as `varchar` with values `multiple_choice`, etc.
- Check constraint ensures valid values
- Pros: Readable in DB, simple
- Cons: No type safety at DB level

**Approach B: PostgreSQL enum type**

- CREATE TYPE quiz_type AS ENUM (...)
- Pros: Type safety, constraints
- Cons: PostgreSQL-specific

**Approach C: Integer with lookup**

- Store as int, have separate table
- Pros: Performance
- Cons: Extra join for readability

### Recommendation

**Approach B — PostgreSQL enum type**. Type-safe, constraint-enforced, still readable. We're using PostgreSQL based on project setup.

### Your Answer

Free text and database level, we use sqlite
validated at validation and typescript layer, we will use valibot

---

## 39. QuizOption Validation: Multiple Choice Exactly One Correct

### Explanation

We said `multiple_choice` quiz must have exactly one option with `is_correct = true`. Who enforces this?

### Reason for Question

If a user creates a multiple choice quiz with:

- 0 options marked correct
- 2+ options marked correct

Is this an error? How is it caught?

### Common Approaches

**Approach A: Database constraint**

- Partial unique index or exclusion constraint
- Only one row per quiz where is_correct = true
- Pros: Enforced at DB level
- Cons: PostgreSQL-specific, complex

**Approach B: Application validation**

- Check on create/update
- Return error if invalid
- Pros: Clear error messages
- Cons: Not enforced at DB level

**Approach C: Trigger-based**

- Database trigger prevents invalid state
- Pros: Always enforced
- Cons: Hidden logic, harder to debug

### Recommendation

**Approach B — Application validation**. Simpler to implement and debug. Document the rule clearly. Can add DB constraint later if needed.

### Your Answer

Application validation
if 0 correct, then it error, this also apply for multiple select

---

## 40. QuizOptions Not Allowed for Fill-in-the-Blank

### Explanation

We said fill_in_the_blank quizzes don't use QuizOption (answer is stored as `correct_answer` on Quiz). But what if someone tries to create QuizOptions for a fill_in_the_blank quiz?

### Reason for Question

Invalid states should be prevented. Creating QuizOptions for fill_in_the_blank quiz is meaningless but technically possible without validation.

### Common Approaches

**Approach A: No validation**

- QuizOptions can be created for any quiz type
- Client responsibility to not do this
- Pros: No extra logic
- Cons: Invalid data possible

**Approach B: Application validation**

- Return error if creating QuizOption for fill_in_the_blank quiz
- Pros: Prevents invalid data
- Cons: Extra check

**Approach C: Database constraint**

- Only allow QuizOption creation for MC/Select types
- Complex constraint
- Pros: Enforced at DB level
- Cons: Complex

### Recommendation

**Approach B — Application validation**. When creating QuizOption, check quiz.type. If fill_in_the_blank, return error.

### Your Answer

Nevermind, we will store the correct answer in the quiz option, so if the question type is fill_in_the_blank, then it must ne have only one quiz option with correct true, this will unify the schema for all question type

---

## 41. Chapter Title and Description Constraints

### Explanation

Chapter has `title` (required) and `description` (optional). Are there any content constraints?

### Reason for Question

- Min/max length for title?
- Max length for description?
- Same constraints as flashcard front/back?

### Common Approaches

**Approach A: No constraints**

- Any text, any length
- Pros: Maximum flexibility
- Cons: No quality control

**Approach B: Title min 1 char, description max 1000 chars**

- Reasonable limits
- Pros: Prevents abuse
- Cons: Arbitrary

### Recommendation

**Approach B — Title required (non-empty), description max 1000 chars**. Similar to other entities. Keep it simple.

### Your Answer

title: non-empty min length 5 max length 50
description: optional max 1000

---

## 42. StudySet Title and Description Constraints

### Explanation

Similar to Chapter — StudySet has `title` (required) and `description` (optional). Any constraints?

### Recommendation

**Same as Chapter** — Title required (non-empty), description max 2000 chars. Slightly larger limit for description since study set may need more context.

### Your Answer

same as chapter

---

## 43. API Date/Time Format

### Explanation

All entities have `created_at` and `updated_at` timestamps. But what's the format?

### Reason for Question

ISO 8601 vs Unix timestamp vs other formats affects:

- Client parsing
- Consistency
- Timezone handling

### Common Approaches

**Approach A: ISO 8601 with timezone**

- `"2026-05-05T12:30:00Z"` or `"2026-05-05T12:30:00+07:00"`
- Pros: Human readable, standard
- Cons: More bytes

**Approach B: Unix timestamp (seconds)**

- `1704364200`
- Pros: Compact, easy to parse
- Cons: Not human readable

**Approach C: Unix timestamp (milliseconds)**

- `1704364200000`
- Pros: Precise, standard for JS
- Cons: Even less readable

### Recommendation

**Approach A — ISO 8601 with timezone (UTC, Z suffix)**. Standard, human-readable, widely supported. Store in UTC, display with Z suffix.

### Your Answer

Unixx timestamp miliseconds

---

## 44. Import/Export Support

### Explanation

No mention of import/export in current spec. PDF import was mentioned as a future domain.

### Reason for Question

For a learning app, import/export is often needed:

- Backup study sets
- Migrate between instances
- Share study sets (Anki .apkg export)
- Bulk create from external sources

### Common Approaches

**Approach A: No import/export (current spec)**

- Only API access
- Pros: Simpler, focus on core
- Cons: Missing useful feature

**Approach B: JSON export/import**

- Export study set as JSON file
- Import JSON to create study set
- Pros: Simple, programmatic
- Cons: Not human friendly

**Approach C: Full file format (Anki compatible)**

- Export to .apkg or similar
- Pros: Compatibility with existing tools
- Cons: Complex to implement

### Recommendation

**Defer to future phase**. This is content management, not core domain. JSON import/export can be added later as a utility feature.

### Your Answer

No export import

---

## 45. Spaced Repetition Metadata

### Explanation

No fields for spaced repetition (next review date, interval, ease factor, etc.)

### Reason for Question

Anki and other flashcard apps track:

- Last reviewed date
- Next review date
- Ease factor (how easy the card is)
- Interval (days between reviews)
- Review count

This enables intelligent scheduling.

### Common Approaches

**Approach A: No spaced repetition (current spec)**

- Pure content storage
- Scheduling handled by external system or UI
- Pros: Focused scope
- Cons: Incomplete for actual study

**Approach B: Store scheduling metadata on Flashcard**

- fields: last_reviewed, next_review, interval, ease_factor, review_count
- Pros: Self-contained
- Cons: Complex, opinionated

**Approach C: Separate ReviewLog entity**

- Track reviews separately
- Flashcard has base data, ReviewLog tracks history
- Pros: Flexible, historical data
- Cons: More complex

### Recommendation

**Defer to future phase**. Spaced repetition is a study session feature, not content storage. Separate domain for "study sessions and scheduling."

### Your Answer

this will stored by other domain, we dont need this

---

## Summary Table (Final Answers)

| Question               | Answer                                                                         |
| ---------------------- | ------------------------------------------------------------------------------ |
| Slug generation        | Auto-generate from title, user can override                                    |
| Chapter required       | Chapter required for flashcards/quizzes                                        |
| Visibility inheritance | Only study_set has visibility (approach C)                                     |
| FK cascade             | _(pending)_                                                                    |
| Batch partial failure  | All-or-nothing (approach A)                                                    |
| Batch update/delete    | Update single, Delete batch                                                    |
| Client IDs             | No - server generates UUID                                                     |
| Hint constraints       | Max 500 characters                                                             |
| Front/back constraints | Non-empty, max ~4 sentences                                                    |
| Quiz type storage      | String, validated at app layer with Valibot                                    |
| MC exactly one correct | Application validation, error if 0 correct                                     |
| FITB storage           | Unified - use QuizOption for all types; FITB has 1 option with is_correct=true |
| Chapter constraints    | title: non-empty, 5-50 chars; description: optional, max 1000                  |
| StudySet constraints   | Same as chapter                                                                |
| Date format            | Unix timestamp milliseconds                                                    |
| Import/export          | No import/export                                                               |
| Spaced repetition      | Deferred to other domain                                                       |
