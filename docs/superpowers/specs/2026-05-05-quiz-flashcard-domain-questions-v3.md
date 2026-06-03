# Domain Specs Review Questions — Phase 3

This document captures additional questions for refining the Quiz & Flashcard domain specifications.

---

## 46. FK Cascade on Delete (Answered: Block if children exist)

### Explanation (from Q32)

We need to define what happens when a parent entity is deleted while children still exist.

### Common Approaches

- **Approach A: Cascade delete** — deleting parent deletes all children
- **Approach B: Block delete if children exist** — cannot delete parent if children exist
- **Approach C: Set null** — children get null parent reference

### Your Answer

Cascade delete to all children

---

## 47. Study Set Slug Auto-Generation Edge Cases

### Explanation

When auto-generating slug from title, what if:

- Title is empty or very short?
- Title has only special characters?
- Generated slug conflicts with existing slug?

### Reason for Question

Auto-generation can produce invalid or undesirable slugs in edge cases.

### Common Approaches

**Approach A: Fallback to UUID-based slug**

- If title produces invalid slug, use "ss-{uuid}" prefix
- Pros: Always valid
- Cons: Less readable

**Approach B: Require manual slug if title too short**

- If title < 3 chars, must provide slug
- Pros: Ensures meaningful slugs
- Cons: Extra step when needed most

**Approach C: Use transliteration + sanitization**

- "Mötivätiön" → "motivation"
- Handle unicode, remove special chars, replace spaces
- Pros: Good UX for non-English titles
- Cons: More complex implementation

### Recommendation

**Approach C with fallback** — Transliterate unicode to ASCII, sanitize, then fallback to UUID if result is empty or conflicts.

### Your Answer

Auto generated slug will have additional random entropy, the random are base32 6 chars, added to end, example "-foasd2"
if slug length < 5 the slug would be random base32 12 char without dash
each slug should transliteration + sanitized

this should be enough to make the slug collosion less often appears
if collosion, then we try with new random entropy

---

## 48. Slug Conflict Resolution

### Explanation

When auto-generating slug from title, the generated slug might already exist in the system.

### Reason for Question

Need to handle collision gracefully.

### Common Approaches

**Approach A: Append number**

- "my-slug" exists → "my-slug-1", "my-slug-2"
- Pros: Human readable
- Cons: Complex uniqueness check

**Approach B: Append random suffix**

- "my-slug-a1b2"
- Pros: Simpler uniqueness
- Cons: Less readable

**Approach C: Error + suggest**

- Return error, suggest available slug
- Pros: User chooses
- Cons: Extra friction

### Recommendation

**Approach A — Append number**. Increment until unique. Common pattern, familiar to users.

### Your Answer

slug will always have random entropy on it (6 chars last)

---

## 49. Study Set Public/Private Visibility

### Explanation

StudySet has `visibility` enum with `public` and `private` values.

### Reason for Question

What exactly does "public" mean?

- Visible to everyone including unauthenticated users?
- Visible to authenticated users only?
- Visible in search/marketplace?

### Common Approaches

**Approach A: Public means everyone**

- Anyone can view study set (with ID/slug)
- Pros: Open, shareable
- Cons: No privacy control

**Approach B: Public means authenticated users**

- Only logged-in users can view public study sets
- Pros: Some exclusivity
- Cons: Still not truly "public"

**Approach C: Private visible only to owner**

- Only owner can see private study sets
- Public study sets visible to others
- Pros: Clear semantics
- Cons: Limited use case

### Recommendation

**Approach C — Private means owner-only, public means other authenticated users can view.** Simple owner-based model.

### Your Answer

Approach C
public can be viewed by any authenticated user
private mean can be viewed by only owner

---

## 50. Chapter Slug Auto-Generation

### Explanation

Chapter also needs slug auto-generation from title (same as study set).

### Reason for Question

Same edge cases as study set.

### Common Approaches

Same as study set - transliteration, fallback, append number on conflict.

### Recommendation

**Same as study set.** Shared logic for slug generation.

### Your Answer

same as study set

---

## 51. Delete StudySet Cascade Behavior

### Explanation

If a user deletes a study set, what happens to chapters, flashcards, and quizzes within it?

### Reason for Question

We blocked delete when children exist for chapters. But study set is the top-level container.

### Common Approaches

**Approach A: Cascade delete all**

- Deleting study set deletes all chapters, flashcards, quizzes
- Pros: Clean up, no orphans
- Cons: Destructive

**Approach B: Block if not empty**

- Cannot delete study set if it has any content
- Must delete all children first
- Pros: Prevents accidental data loss
- Cons: Extra steps

**Approach C: Soft delete with archive**

- "Move to trash" instead of hard delete
- Can restore within X days
- Pros: Recovery possible
- Cons: More complex

### Recommendation

**Approach A — Cascade delete all.** Study set is the root; deleting it implies deleting everything within. User should be warned before confirming.

### Your Answer

Cascade delete all

---

## 52. Delete Chapter Cascade Behavior

### Explanation

If a user deletes a chapter, what happens to flashcards and quizzes?

### Reason for Question

Chapters contain flashcards and quizzes. We said chapter is required for flashcards/quizzes.

### Common Approaches

**Approach A: Block if has content**

- Cannot delete chapter if it has flashcards or quizzes
- Must move or delete content first
- Pros: Safe
- Cons: Extra steps

**Approach B: Delete content too**

- Deleting chapter deletes all flashcards and quizzes in it
- Pros: Clean
- Cons: Destructive

**Approach C: Move to "Uncategorized"**

- Flashcards/quizzes moved to a default chapter
- Pros: Preserve content
- Cons: Unexpected behavior

### Recommendation

**Approach A — Block if has content.** Same as before. Prevent accidental deletion of content.

### Your Answer

Approach A

---

## 53. Unique Constraint Enforcement

### Explanation

We have uniqueness constraints:

- StudySet.slug globally unique
- Chapter.slug unique within StudySet

### Reason for Question

How are these enforced at the database level?

### Common Approaches

**Approach A: Unique index on field**

- Standard unique index
- Pros: Simple, native support
- Cons: Standard

**Approach B: Unique index + partial filter**

- For Chapter, index is (study_set_id, slug) with unique
- Pros: Enforces scoped uniqueness
- Cons: More complex

### Recommendation

**Approach B** — Composite unique index on (study_set_id, slug) for Chapter. Standard unique index for StudySet.slug.

### Your Answer

Approach B

---

## 54. Quiz Type Enum Values

### Explanation

Quiz has `type` field with enum values: `multiple_choice`, `multiple_select`, `fill_in_the_blank`.

### Reason for Question

Are these the exact string values? Case sensitivity?

### Common Approaches

**Approach A: snake_case strings**

- `multiple_choice`, `multiple_select`, `fill_in_the_blank`
- Pros: Readable, consistent
- Cons: Standard

**Approach B: UPPERCASE**

- `MULTIPLE_CHOICE`, etc.
- Pros: Distinct from values
- Cons: Less readable

**Approach C: Abbreviated**

- `mc`, `ms`, `fib`
- Pros: Compact
- Cons: Not self-documenting

### Recommendation

**Approach A — snake_case strings.** Consistent with naming conventions, readable in database.

### Your Answer

approach B

---

## 55. Validation Layer: Valibot Schema Location

### Explanation

We use Valibot for validation. Where do schemas live?

### Reason for Question

Organization of validation code affects maintainability.

### Common Approaches

**Approach A: Co-located with routes**

- Validation schemas in route files
- Pros: Easy to find, contextually relevant
- Cons: Scattered

**Approach B: Shared validation directory**

- `/lib/validations/` or `/schemas/`
- Pros: Centralized, reusable
- Cons: Extra directory

**Approach C: Near database schema (Drizzle)**

- Define in same file as DB schema
- Pros: Single source of truth
- Cons: Couples DB to validation

### Recommendation

**Approach B — Shared `/lib/validations/` directory.** Grouped by entity: `study-set.ts`, `chapter.ts`, etc.

### Your Answer

Approach B

---

## 56. Batch Delete: Request Format

### Explanation

DELETE /flashcards accepts array. But what's the request format?

### Reason for Question

DELETE requests typically don't have body in some HTTP clients. Need clear spec.

### Common Approaches

**Approach A: Request body with array**

- `DELETE /flashcards` with body `{ ids: [...] }`
- Pros: Flexible, clear
- Cons: Non-standard for some clients

**Approach B: Query parameter**

- `DELETE /flashcards?ids=uuid1,uuid2,uuid3`
- Pros: Standard URL pattern
- Cons: URL length limits

**Approach C: Path parameter**

- `DELETE /flashcards/{id1},{id2},{id3}`
- Pros: RESTful
- Cons: Complex routing

### Recommendation

**Approach A — Request body with array.** Most flexible. Use content-type header to indicate JSON body.

### Your Answer

Approach A

---

## 57. Batch Delete Response Format

### Explanation

When batch delete succeeds, what does the response look like?

### Reason for Question

Consistency in API responses.

### Common Approaches

**Approach A: Return deleted count**

- `{ deleted: 5 }`
- Pros: Simple
- Cons: No details

**Approach B: Return deleted IDs**

- `{ deleted: [{ id: "..." }, ...] }`
- Pros: Clear what was deleted
- Cons: Verbose

**Approach C: Return 204 No Content**

- No body
- Pros: Minimal
- Cons: No confirmation

### Recommendation

**Approach B — Return deleted items with IDs.** Same as batch create returning created items.

### Your Answer

Approach C

---

## 58. Update Single Flashcard

### Explanation

PATCH /flashcards accepts single item. What fields can be updated?

### Reason for Question

Can user update only `front`? Only `importance`? All fields?

### Common Approaches

**Approach A: Full replace**

- Must provide all fields, missing fields set to null/default
- Pros: Predictable
- Cons: Verbose

**Approach B: Partial update**

- Only provided fields are updated
- Pros: Flexible
- Cons: Implicit behavior

**Approach C: Explicit field list**

- Define exactly which fields can be updated per endpoint
- Pros: Clear contract
- Cons: More spec work

### Recommendation

**Approach B — Partial update.** Only provided fields are updated. Common REST pattern.

### Your Answer

front, back, hint

---

## 59. Flashcard Front/Back Update

### Explanation

Can user update `front` without `back`? Can they swap them?

### Reason for Question

Content update patterns.

### Common Approaches

**Approach A: All content fields required on update**

- If updating content, must provide both front and back
- Pros: Consistent
- Cons: Extra data

**Approach B: Each field independently optional**

- Can update front only
- Pros: Minimal
- Cons: Possible invalid states (empty)

### Recommendation

**Approach A — All content fields required if any content field is updated.** Prevents accidentally setting one side to empty.

### Your Answer

update are replace from the body, so the request must provided by client

---

## 60. Chapter Delete With Content

### Explanation

What if chapter has flashcards and user tries to delete it?

### Reason for Question

We said block delete if children exist. But what error is returned?

### Common Approaches

**Approach A: Clear error message**

- `400 Bad Request: Cannot delete chapter. It contains 15 flashcards and 3 quizzes.`
- Pros: Informative
- Cons: Complex message

**Approach B: Error code only**

- `400 Bad Request: CHAPTER_NOT_EMPTY`
- Pros: Simple
- Cons: Client must look up meaning

**Approach C: List children IDs**

- Error includes IDs of dependent records
- Pros: Can programatically handle
- Cons: Verbose

### Recommendation

**Approach A — Clear error message with counts.** Informative, helps user understand what to clean up.

### Your Answer

Approach B

---

## Summary Table (Final Answers)

| Question                    | Answer                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| FK cascade                  | Cascade delete to all children                                                                                                        |
| Slug generation edge cases  | Transliteration + sanitization, random entropy base32 6 chars suffix (dash + 6), if < 5 chars use 12 char no dash, retry on collision |
| Slug conflict               | Slug always has random entropy (6 chars suffix)                                                                                       |
| Visibility semantics        | Public: any authenticated user; Private: owner only                                                                                   |
| Chapter slug auto-gen       | Same as study set                                                                                                                     |
| Delete StudySet cascade     | Cascade delete all children                                                                                                           |
| Delete Chapter cascade      | Block if has content                                                                                                                  |
| Unique constraint DB        | Composite unique index on (study_set_id, slug) for Chapter                                                                            |
| Quiz type enum format       | UPPERCASE strings (MULTIPLE_CHOICE, MULTIPLE_SELECT, FILL_IN_THE_BLANK)                                                               |
| Valibot schema location     | /lib/validations/                                                                                                                     |
| Batch delete request        | Body with array                                                                                                                       |
| Batch delete response       | 204 No Content                                                                                                                        |
| Update single flashcard     | front, back, hint fields only                                                                                                         |
| Flashcard front/back update | Replace from body (full update)                                                                                                       |
| Delete with content error   | Error code only (e.g., CHAPTER_NOT_EMPTY)                                                                                             |
