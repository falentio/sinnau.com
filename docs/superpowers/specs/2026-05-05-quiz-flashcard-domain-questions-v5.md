# Domain Specs Review Questions — Phase 5 (Business Logic)

This document captures business logic questions for the Quiz & Flashcard domain specifications.

---

## 82. QuizOptions Creation After Quiz Creation

### Explanation
QuizOptions can be created separately (separate endpoint from quiz creation). But what if user creates a quiz with 0 options?

### Reason for Question
Quiz creation doesn't require options to be created at the same time. User could create an empty quiz and add options later. But we have minimum 2 options rule for MC/Select.

### Common Approaches

**Approach A: Quiz valid without options**
- Quiz can be created with 0 options
- User must add options before quiz is usable
- Pros: Flexible creation flow
- Cons: Incomplete state temporarily

**Approach B: Options required on quiz creation**
- Quiz and options created in one batch
- If options not provided, error
- Pros: Always complete
- Cons: Less flexible

**Approach C: Quiz not usable until options added**
- Quiz can be created empty but returns error if accessed without options
- Pros: Clear state
- Cons: Extra validation on access

### Recommendation
**Approach A — Quiz valid without options**. Flexible creation flow. Client can create quiz first, then add options. Just validate at usage time.

### Your Answer
Approach A

---

## 83. Quiz Type Change Validation

### Explanation
Can user change quiz type after creation? e.g., from multiple_choice to fill_in_the_blank?

### Reason for Question
Quiz type determines how options are interpreted. Changing type mid-life could create inconsistent state:
- MC with 0 or >1 correct options
- FITB with multiple options

### Common Approaches

**Approach A: Type is immutable**
- Cannot change type after creation
- Must delete and recreate quiz
- Pros: No inconsistent states
- Cons: Inflexible

**Approach B: Type change triggers validation**
- If type changes, existing options validated against new type
- Error if invalid
- Pros: Allows type change with proper data
- Cons: Complex validation

**Approach C: Type change auto-adjusts options**
- If MC becomes FITB, keep only the first correct option
- If FITB becomes MC, add dummy wrong options to reach 2
- Pros: Always valid
- Cons: Unexpected data manipulation

### Recommendation
**Approach A — Type is immutable**. Simpler mental model. If user wants different type, recreate quiz.

### Your Answer
Approach A

---

## 84. Deleting Last Correct Option

### Explanation
For multiple_choice, there must be exactly 1 correct option. What if user tries to delete the only correct option?

### Reason for Question
This would leave a quiz with 0 correct answers, which is invalid for MC.

### Common Approaches

**Approach A: Prevent deletion**
- If would result in 0 correct options, return error
- Pros: Always valid state
- Cons: Extra validation

**Approach B: Allow but quiz becomes invalid**
- Let deletion happen, quiz now has 0 correct options
- Error when trying to use quiz
- Pros: Simple deletion
- Cons: Inconsistent state

**Approach C: Auto-promote another option**
- If deleting only correct, auto-mark another as correct
- Pros: Always valid
- Cons: Unexpected behavior

### Recommendation
**Approach A — Prevent deletion of last correct option**. Clear error message.

### Your Answer
Approach A

---

## 85. Flashcard Importance Update

### Explanation
Can user update importance at any time? Any constraints?

### Reason for Question
Importance is used for sorting/prioritization. Can user set any positive integer?

### Common Approaches

**Approach A: Any positive integer**
- No bounds, user can set any value
- Pros: Maximum flexibility
- Cons: UI may need to handle very large values

**Approach B: Bounded scale**
- Must be 0-100 or similar
- Pros: Consistent UI
- Cons: Arbitrary limit

**Approach C: Auto-normalize on display**
- Store raw values, display as percentile
- Pros: Flexible storage, consistent display
- Cons: Complexity

### Recommendation
**Approach A — Any positive integer**. Store raw value, display as percentile (0-100 scale based on relative ranking).

### Your Answer
Approach A, can be updated at any time, without bounded scale

---

## 86. Slug Manual Input on Create

### Explanation
When creating a study set or chapter, user can provide custom slug or let it auto-generate.

### Reason for Question
What if user provides a slug that already exists?

### Common Approaches

**Approach A: Error if slug exists**
- Return validation error
- User must choose different slug
- Pros: Clear conflict
- Cons: Extra step

**Approach B: Auto-append entropy**
- If slug exists, add random suffix automatically
- User doesn't need to retry
- Pros: No retry friction
- Cons: Unexpected slug

**Approach C: Append number**
- If exists, try slug-1, slug-2, etc.
- Pros: Readable
- Cons: Complex

### Recommendation
**Approach A — Error if slug exists**. User should choose another slug. Auto-generation handles collision with entropy.

### Your Answer
We remove the ability of user to customize the slug 

---

## 87. Chapter Slug Same Rules as StudySet

### Explanation
Same slug generation rules for chapter as study set.

### Reason for Question
Confirm same behavior.

### Common Approaches
Same as study set - transliteration + sanitization + random entropy suffix.

### Recommendation
**Same as study set**.

### Your Answer
Same as study set, we remove user ability to customize the slug

---

## 88. QuizOptions Update: Changing Correct Answer

### Explanation
When updating a QuizOption's is_correct value, what happens?

### Reason for Question
For MC quiz, can user mark a different option as correct? Should the previous correct be auto-unmarked?

### Common Approaches

**Approach A: Auto-uncheck previous correct**
- For MC, marking new option as correct auto-unchecks previous
- Pros: Always exactly 1 correct
- Cons: Unexpected state change

**Approach B: User must explicitly uncheck first**
- Two operations required: uncheck old, check new
- Error if two correct
- Pros: Explicit intent
- Cons: Extra steps

**Approach C: Only one operation per request**
- Client sends both old unmark and new mark in same request
- Pros: Explicit
- Cons: Complex client

### Recommendation
**Approach A — Auto-uncheck previous correct for MC**. Simpler for user. Single operation to change correct answer.

### Your Answer
Approach B

---

## 89. QuizOptions: Exactly One Correct for MC

### Explanation
Enforce exactly one correct option for multiple_choice quizzes.

### Reason for Question
We said this is validated by application (Valibot). Where exactly does this validation happen?

### Common Approaches

**Approach A: In Valibot schema for QuizOption create**
- When creating option, check other options for same quiz
- Pros: Centralized validation
- Cons: Cannot validate in isolation

**Approach B: On Quiz itself**
- When quiz is finalized (all options created), validate
- Pros: Can validate full state
- Cons: Not at option creation

**Approach C: At both levels**
- Option create validates if already has correct
- Quiz finalize validates has exactly one
- Pros: Comprehensive
- Cons: Complex

### Recommendation
**Approach B — Validate on quiz when checking completeness**. Option creation can track if quiz already has correct option, but final validation is when quiz is "used".

### Your Answer
Approach A

---

## 90. Flashcard Chapter Transfer

### Explanation
Can user move a flashcard from one chapter to another?

### Reason for Question
Organization may change over time.

### Common Approaches

**Approach A: Dedicated move endpoint**
- POST /flashcards/{id}/move { chapter_id: "..." }
- Pros: Clear intent
- Cons: Extra endpoint

**Approach B: Update chapter_id via PATCH**
- PATCH /flashcards/{id} { chapter_id: "..." }
- Pros: Uses existing update
- Cons: Hidden capability

**Approach C: Not supported**
- Must delete and recreate in new chapter
- Pros: Simple
- Cons: Destructive

### Recommendation
**Approach B — Update via PATCH**. Chapter ID is just another field. No special endpoint needed.

### Your Answer
Approach C

---

## 91. Quiz Chapter Transfer

### Explanation
Same as flashcard - can user move quiz between chapters?

### Reason for Question
Same as above.

### Common Approaches
Same as flashcard.

### Recommendation
**Same as flashcard — Update via PATCH**.

### Your Answer
Same as flashcard - prohibit

---

## 92. Study Set Ownership Transfer

### Explanation
Can user transfer ownership of a study set to another user?

### Reason for Question
Collaboration or account changes may require transfer.

### Common Approaches

**Approach A: Not supported**
- Cannot change owner
- Must delete and recreate under new owner
- Pros: Simple
- Cons: Destructive for content

**Approach B: Dedicated transfer endpoint**
- POST /study-sets/{id}/transfer { new_owner_id: "..." }
- Pros: Clear intent
- Cons: Extra logic

**Approach C: Update owner_id via PATCH**
- PATCH /study-sets/{id} { owner_id: "..." }
- Pros: Uses existing mechanism
- Cons: Risky operation

### Recommendation
**Approach A — Not supported**. Ownership transfer is a complex operation (permissions, visibility, etc.). Keep simple.

### Your Answer
Approach A

---

## 93. Public to Private Conversion

### Explanation
Can user change visibility from public to private?

### Reason for Question
User may want to restrict access.

### Common Approaches

**Approach A: Allowed**
- User can toggle visibility anytime
- Pros: Flexible
- Cons: Others may lose access

**Approach B: Not allowed once public**
- Once public, cannot go back to private
- Pros: Prevents "surprise" access removal
- Cons: Inflexible

**Approach C: Allowed with confirmation**
- Must confirm the action
- Pros: Prevent accidents
- Cons: Extra step

### Recommendation
**Approach A — Allowed**. User controls visibility. If they make private, others lose access.

### Your Answer
Approach A

---

## 94. Private to Public Conversion

### Explanation
Can user change visibility from private to public?

### Reason for Question
Same as above, opposite direction.

### Common Approaches

**Approach A: Allowed**
- Can make private content public
- Pros: Flexible
- Cons: May expose unintended content

**Approach B: Not allowed**
- Once private, cannot make public
- Pros: Privacy by default
- Cons: Inflexible

### Recommendation
**Approach A — Allowed**. User controls. Can always make private content public.

### Your Answer
Approach A

---

## 95. Batch Delete: Permission Check

### Explanation
When deleting multiple items, when is permission checked?

### Reason for Question
If deleting 10 flashcards and user owns 8 but not 2, what happens?

### Common Approaches

**Approach A: Check all first**
- Validate ownership of all before deleting any
- Pros: All-or-nothing
- Cons: Extra check

**Approach B: Delete owned, error for unowned**
- Delete what user owns, return partial success error
- Pros: Useful partial operation
- Cons: Inconsistent result

**Approach C: Error immediately on first unowned**
- Stop at first unauthorized item
- Pros: Simple, secure
- Cons: May leave partial state

### Recommendation
**Approach A — Check all first, then delete all if authorized**. All-or-nothing for batch delete too.

### Your Answer
Check all, and All or nothing

---

## 96. Batch Delete Response for Partial Authorization

### Explanation
If batch delete is blocked due to authorization (some items not owned), what response?

### Reason for Question
Part of all-or-nothing handling.

### Common Approaches

**Approach A: 403 with list**
- Return 403 with IDs user doesn't own
```json
{
  "error": {
    "code": "PARTIAL_FORBIDDEN",
    "message": "You do not own these resources",
    "ids": ["...", "..."]
  }
}
```
- Pros: Clear
- Cons: Standard

**Approach B: 403 with count only**
- Just say some items not owned
- Pros: Simple
- Cons: Less actionable

### Recommendation
**Approach A — 403 with IDs**. User knows which resources they can't delete.

### Your Answer
Approach A

---

## 97. Slug Regeneration on Title Change

### Explanation
If user changes title of study set, does slug auto-regenerate?

### Reason for Question
Slug is immutable per Q74, but if user provides new slug on update, it should be validated.

### Common Approaches

**Approach A: Title change doesn't affect slug**
- Slug stays the same even if title changes
- Pros: Stable URL
- Cons: Slug may not match title

**Approach B: Cannot change title if slug was auto-generated**
- If slug was auto-generated, cannot change title without changing slug
- Pros: Keeps slug in sync
- Cons: Complex rule

### Recommendation
**Approach A — Title change doesn't affect slug**. Slug is independent once set. User can manually update slug if needed.

### Your Answer
Approach A

---

## 98. Validation: Front/Back Same Content

### Explanation
Can flashcard have same content for front and back?

### Reason for Question
Potentially valid (synonyms, same word in different languages) but may indicate error.

### Common Approaches

**Approach A: Allowed**
- No restriction
- Pros: Flexibility
- Cons: May be accidental

**Approach B: Warning only**
- Allow but warn user
- Pros: Catch potential errors
- Cons: Extra logic

**Approach C: Not allowed**
- Return error if front == back
- Pros: Catches mistakes
- Cons: Over restrictive

### Recommendation
**Approach A — Allowed**. Not our place to judge content validity. User may have valid use case.

### Your Answer
Approach A

---

## 99. Validation: Empty Option Text

### Explanation
Can QuizOption have empty option_text?

### Reason for Question
Should we allow empty strings?

### Common Approaches

**Approach A: Not allowed**
- Must have at least 1 character
- Pros: Prevents meaningless options
- Cons: Standard validation

**Approach B: Allowed**
- Empty string accepted
- Pros: Flexibility
- Cons: Invalid state

### Recommendation
**Approach A — Not allowed**. Non-empty required.

### Your Answer
Approach A

---

## 100. Validation: Option Text Max Length

### Explanation
How long can option_text be?

### Reason for Question
Need to prevent abuse and store reasonable data.

### Common Approaches

**Approach A: Same as flashcard front/back**
- ~4 sentences max
- Pros: Consistent
- Cons: May be short for complex options

**Approach B: Shorter limit**
- ~100 chars
- Pros: Simpler options
- Cons: May not be enough

**Approach C: No limit**
- Any length
- Pros: Maximum flexibility
- Cons: Storage concerns

### Recommendation
**Approach B — ~500 characters**. Similar to flashcard hint. Enough for detailed options without abuse.

### Your Answer
Approach A

---

## 101. Option Text Uniqueness Within Quiz

### Explanation
Can two options in the same quiz have the same text?

### Reason for Question
May cause confusion in UI.

### Common Approaches

**Approach A: Allowed**
- No restriction
- Pros: Flexibility
- Cons: Confusing UI

**Approach B: Warning only**
- Allow but flag for review
- Pros: Catch duplicates
- Cons: Extra logic

**Approach C: Not allowed**
- All options must have unique text within quiz
- Pros: Clear, distinct options
- Cons: Restrictive

### Recommendation
**Approach A — Allowed**. May be valid use case (e.g., "None of the above" appearing once is fine, but duplicate would be weird). We can add uniqueness later if needed.

### Your Answer
Approach A

---

## Summary Table (Final Answers)

| Question | Answer |
|----------|--------|
| QuizOptions optional on create | Approach A - Quiz valid without options |
| Quiz type change | Type is immutable |
| Delete last correct option | Prevent deletion (approach A) |
| Flashcard importance bounds | Any positive integer, unbounded |
| Slug manual input | Removed - auto-generated only |
| Chapter slug rules | Same as study set, auto-generated only |
| MC correct change | Approach B - User must explicitly uncheck first |
| MC exactly one correct validation | Approach A - Valibot schema on option create |
| Flashcard chapter transfer | Approach C - Not supported (prohibited) |
| Quiz chapter transfer | Same as flashcard - prohibited |
| Ownership transfer | Not supported |
| Public to private | Allowed |
| Private to public | Allowed |
| Batch delete permission | Check all first, all-or-nothing |
| Batch delete partial auth response | 403 with IDs |
| Slug on title change | Title change doesn't affect slug |
| Front/back same | Allowed |
| Option empty text | Not allowed |
| Option text max length | ~4 sentences (same as flashcard front/back) |
| Option text uniqueness | Allowed |