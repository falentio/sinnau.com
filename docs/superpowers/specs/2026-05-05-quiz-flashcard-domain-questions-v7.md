# Domain Specs Review Questions — Phase 7

This document captures additional questions for the Quiz & Flashcard domain specifications.

---

## 124. StudySet List: Default Order

### Explanation

When listing study sets, what is the default sort order?

### Reason for Question

Consistent ordering for client expectations.

### Common Approaches

**Approach A: By created_at DESC**

- Newest first
- Pros: Common pattern, recent first
- Cons: Standard

**Approach B: By title ASC**

- Alphabetical
- Pros: Easy to scan
- Cons: May miss newest

**Approach C: By updated_at DESC**

- Most recently updated first
- Pros: Shows activity
- Cons: May hide old content

### Recommendation

**Approach A — By created_at DESC**. Most recent first is intuitive for study sets.

### Your Answer

Approach A

---

## 125. Chapter List: Default Order

### Explanation

When listing chapters within a study set, what is the default sort order?

### Reason for Question

Same as study set ordering.

### Common Approaches

Same options as study set list.

### Recommendation

**Approach A — By created_at DESC**. Consistent with study set.

### Your Answer

Approach A

---

## 126. Flashcard List: Default Order

### Explanation

When listing flashcards, what is the default sort order?

### Reason for Question

User expects consistent ordering.

### Common Approaches

**Approach A: By created_at DESC**

- Newest first
- Pros: Standard
- Cons: Not grouped

**Approach B: By chapter_id grouping**

- Grouped by chapter
- Pros: Logical organization
- Cons: Complex

**Approach C: By importance DESC**

- Most important first
- Pros: Shows priority
- Cons: May miss context

### Recommendation

**Approach A — By created_at DESC**. Simple, consistent.

### Your Answer

Approach A

---

## 127. Quiz List: Default Order

### Explanation

When listing quizzes, what is the default sort order?

### Reason for Question

Same as flashcards.

### Recommendation

**Approach A — By created_at DESC**. Consistent with other lists.

### Your Answer

## Approach A

## 128. Slug Uniqueness: Case Handling

### Explanation

We said slugs are auto-lowercased. But how is uniqueness checked?

### Reason for Question

If user somehow bypasses lowercase (shouldn't be possible), how do we handle case?

### Common Approaches

**Approach A: Case-insensitive uniqueness check**

- "MySet" and "myset" considered duplicate
- Pros: Prevents confusion
- Cons: Extra collation

**Approach B: Exact case-sensitive check**

- "MySet" and "myset" could both exist
- Pros: Simpler
- Cons: Confusing

### Recommendation

**Approach A — Case-insensitive uniqueness check**. All slugs normalized, so uniqueness check should be too.

### Your Answer

Approach A

---

## 129. Quiz Options: Returned With Quiz

### Explanation

Quiz response should include options. But are options always returned?

### Reason for Question

Complete quiz data vs optimization.

### Common Approaches

**Approach A: Always include options**

- GET /quizzes/{id} always returns options array
- Pros: Complete data
- Cons: Extra data

**Approach B: Separate options fetch**

- GET /quizzes/{id} returns quiz, GET /quizzes/{id}/options returns options
- Pros: Lighter response
- Cons: Multiple requests

### Recommendation

**Approach A — Always include options**. Simpler for client.

### Your Answer

Approach A

---

## 130. Validation: Quiz with No Options Valid

### Explanation

Quiz can be created without options. But if we return options with quiz, empty array for options.

### Reason for Question

Quiz without options - how does this look?

### Common Approaches

**Approach A: Return empty options array**

- `{ id: "...", options: [], ... }`
- Pros: Consistent structure
- Cons: May indicate incomplete quiz

**Approach B: Return null options**

- `{ id: "...", options: null, ... }`
- Pros: Distinguishes empty from none
- Cons: Inconsistent type

### Recommendation

**Approach A — Return empty options array `[]`**. Consistent JSON array type.

### Your Answer

Approach A

---

## 131. Bulk Create: Response Order

### Explanation

When creating flashcards in batch, what order is the response array?

### Reason for Question

Client needs to correlate request to response.

### Common Approaches

**Approach A: Same order as request**

- Response array order matches request array order
- Pros: Easy correlation
- Cons: Standard

**Approach B: Order by created_at**

- Sorted by creation time
- Pros: Natural order
- Cons: Hard to correlate

### Recommendation

**Approach A — Same order as request**. Client can zip request and response.

### Your Answer

Approach A

---

## 132. Update Quiz: Include Options

### Explanation

When updating quiz (PATCH), should options be updatable too?

### Reason for Question

Can options be modified in same request?

### Common Approaches

**Approach A: Options separate**

- PATCH /quizzes only updates quiz fields
- Options updated via /quiz-options endpoint
- Pros: Clear separation
- Cons: Multiple requests

**Approach B: Options included**

- PATCH /quizzes can include options array
- Options created/replaced/updated
- Pros: Single request
- Cons: Complex

### Recommendation

**Approach A — Options separate**. Quiz update only affects quiz fields. Options managed separately.

### Your Answer

Approach A

---

## 133. Delete Quiz: Options Cascade

### Explanation

When deleting a quiz, what happens to its options?

### Reason for Question

Options belong to quiz. Cascade behavior.

### Common Approaches

**Approach A: Cascade delete options**

- Deleting quiz deletes all its options
- Pros: Clean
- Cons: Destructive

**Approach B: Block if has options**

- Cannot delete quiz if it has options
- Pros: Safe
- Cons: Extra steps

**Approach C: Options deleted separately first**

- Must delete options before deleting quiz
- Pros: Explicit
- Cons: Extra steps

### Recommendation

**Approach A — Cascade delete options**. Quiz deletion includes its options. Simple.

### Your Answer

Approach A

---

## 134. Quiz Type: String Values in Response

### Explanation

Quiz type enum values are UPPERCASE. How are they returned in JSON?

### Reason for Question

Consistency in response format.

### Common Approaches

**Approach A: Uppercase string**

- `"type": "MULTIPLE_CHOICE"`
- Pros: Clear enum representation
- Cons: Standard

**Approach B: PascalCase**

- `"type": "MultipleChoice"`
- Pros: JSON-friendly
- Cons: Less standard

### Recommendation

**Approach A — Uppercase string**. Keep as defined: `MULTIPLE_CHOICE`, `MULTIPLE_SELECT`, `FILL_IN_THE_BLANK`.

### Your Answer

Approach A

---

## 135. Visibility: Stored as String or Enum

### Explanation

Visibility is PUBLIC/PRIVATE. How stored?

### Reason for Question

Type consistency.

### Recommendation

**String enum** — Stored as string `"PUBLIC"` or `"PRIVATE"`. Same as quiz type.

### Your Answer

Same as quiz type

---

## 136. Timestamps: Updated on Batch Operations

### Explanation

When batch creating, do all items get same timestamp?

### Reason for Question

created_at values.

### Common Approaches

**Approach A: Same timestamp for all**

- All items in batch get same created_at
- Pros: Consistent
- Cons: Artificial

**Approach B: Individual timestamps**

- Each item gets its own creation timestamp
- Pros: Accurate
- Cons: Slightly different times

### Recommendation

**Approach B — Individual timestamps**. Each record gets its own timestamp at time of insert.

### Your Answer

Approach B

---

## 137. Error Codes: Naming Convention

### Explanation

We return error codes like `VALIDATION_FAILED`, `FORBIDDEN`. Naming convention?

### Reason for Question

Consistent error code naming.

### Common Approaches

**Approach A: SCREAMING_SNAKE_CASE**

- `VALIDATION_FAILED`, `PARTIAL_FORBIDDEN`
- Pros: Clear, standard for error codes
- Cons: All caps

**Approach B: kebab-case**

- `validation-failed`, `partial-forbidden`
- Pros: Readable
- Cons: Less standard

### Recommendation

**Approach A — SCREAMING_SNAKE_CASE**. Standard convention for error codes.

### Your Answer

Approach A

---

## 138. Validation: Title Trimmed

### Explanation

Title has min length. Does whitespace-only count?

### Reason for Question

Validation edge case.

### Common Approaches

**Approach A: Trim before validation**

- " " becomes "" before length check
- Pros: User-friendly
- Cons: Extra processing

**Approach B: Error on whitespace**

- " " fails non-empty check
- Pros: Simple
- Cons: May frustrate users

### Recommendation

**Approach A — Trim before validation**. Remove leading/trailing whitespace before length checks.

### Your Answer

Approach A

---

## 139. Validation: Slug Auto-Generated Format

### Explanation

We defined slug generation. But what's the exact character set?

### Reason for Question

Validation needs to know valid slugs.

### Common Approaches

**Approach A: Alphanumeric + hyphen only**

- `[a-z0-9]+(-[a-z0-9]+)*`
- Pros: Simple
- Cons: Limited

**Approach B: Allow underscore**

- `[a-z0-9]+(-[a-z0-9]+)*`
- Actually, underscores problematic historically
- Pros: ?
- Cons: ?

### Recommendation

**Alphanumeric + hyphen only**. No underscore, no special chars. Hyphen as separator.

### Your Answer

Apporach A

---

## 140. Quiz Options: Max Count

### Explanation

Any limit on how many options a quiz can have?

### Reason for Question

Practical limits.

### Common Approaches

**Approach A: No limit**

- Any number of options
- Pros: Unlimited
- Cons: May be abused

**Approach B: Max 10 options**

- Limit reasonable for MCQ
- Pros: Prevents abuse
- Cons: Arbitrary

**Approach C: Min/Max bounds**

- MC: 2-6 options typical
- Select: 2-10 options
- Pros: Reasonable bounds
- Cons: More complex

### Recommendation

**Approach C — Min/Max bounds**. MC: 2-6 options. Select: 2-10 options. FITB: exactly 1.

### Your Answer

Approach C

---

## Summary Table (Final Answers)

| Question             | Answer                                                  |
| -------------------- | ------------------------------------------------------- |
| StudySet list order  | By created_at DESC                                      |
| Chapter list order   | By created_at DESC                                      |
| Flashcard list order | By created_at DESC                                      |
| Quiz list order      | By created_at DESC                                      |
| Slug uniqueness case | Case-insensitive check                                  |
| Quiz with options    | Always include in response                              |
| Quiz no options      | Empty array []                                          |
| Bulk create order    | Same as request                                         |
| Quiz update options  | Separate endpoint only                                  |
| Delete quiz cascade  | Cascade delete options                                  |
| Quiz type response   | UPPERCASE string                                        |
| Visibility response  | String enum (same as quiz type)                         |
| Batch timestamps     | Individual timestamps                                   |
| Error code naming    | SCREAMING_SNAKE_CASE                                    |
| Title trim           | Trim before validation                                  |
| Slug format          | Alphanumeric + hyphen only                              |
| Quiz options max     | Min/max bounds (MC: 2-6, Select: 2-10, FITB: exactly 1) |
