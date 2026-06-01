# Domain Specs Review Questions — Phase 4

This document captures additional questions for refining the Quiz & Flashcard domain specifications.

---

## 61. Flashcard CRUD: Read Single

### Explanation
We have batch create (POST with array) and batch delete (DELETE with array). But for read operations.

### Reason for Question
How does client fetch a single flashcard to view/edit?

### Common Approaches

**Approach A: GET /flashcards/{id}**
- Standard REST
- Pros: Clear, expected
- Cons: Standard

**Approach B: GET /flashcards?id={id}**
- Query param instead of path
- Pros: Flexible
- Cons: Less RESTful

### Recommendation
**Approach A — GET /flashcards/{id}**. Standard REST pattern for single resource.

### Your Answer
Approach A

---

## 62. Flashcard CRUD: List All

### Explanation
We said no pagination - return all entities. But how does client get all flashcards for a study set?

### Reason for Question
API structure for listing resources.

### Common Approaches

**Approach A: GET /study-sets/{id}/flashcards**
- Nested under study set
- Pros: Logical hierarchy
- Cons: Different URL pattern

**Approach B: GET /flashcards?study_set_id={id}**
- Flat endpoint with filter
- Pros: Consistent URL structure
- Cons: Filter required

**Approach C: GET /flashcards (all flashcards)**
- No filter, return everything
- Pros: Simple
- Cons: No pagination (could be huge)

### Recommendation
**Approach B — Query filter with study_set_id**. Flexible, supports filtering by chapter too.

### Your Answer
Approach B

---

## 63. Quiz CRUD Operations

### Explanation
Same questions for Quiz as for Flashcard.

### Reason for Question
Need to define read/update patterns for Quiz.

### Common Approaches

**Approach A: GET /quizzes/{id}, GET /quizzes?study_set_id=X**
- Same as flashcards
- Pros: Consistent
- Cons: Standard

**Approach B: Nested under chapter**
- GET /chapters/{id}/quizzes
- Pros: Logical grouping
- Cons: Different patterns

### Recommendation
**Approach A — Consistent with Flashcard**. Query filters for study_set_id, chapter_id.

### Your Answer
Approach A

---

## 64. QuizOptions Batch Operations

### Explanation
QuizOptions are created as part of Quiz creation. Do they need separate CRUD?

### Reason for Question
QuizOptions belong to a Quiz. They are created with the quiz but can also be updated separately.

### Common Approaches

**Approach A: No separate QuizOption endpoints**
- QuizOptions only managed through Quiz create/update
- Pros: Simpler
- Cons: Can't update options without updating quiz

**Approach B: Separate CRUD for QuizOptions**
- POST /quiz-options, PATCH /quiz-options/{id}, DELETE /quiz-options
- Pros: Flexible
- Cons: More endpoints

**Approach C: Quiz owns options, expose via Quiz**
- GET /quizzes/{id}/options, PATCH /quizzes/{id}/options
- Pros: Logical ownership
- Cons: Nested routes

### Recommendation
**Approach B — Separate CRUD for QuizOptions**. Flexibility to update options without touching quiz content.

### Your Answer
creation would be same endpoint as quiz creation
update are separate endpoint

---

## 65. Chapter CRUD Operations

### Explanation
Similar questions for Chapter endpoints.

### Reason for Question
Define read/update patterns for Chapters.

### Common Approaches

**Approach A: GET /chapters/{id}, PATCH /chapters/{id}, DELETE /chapters/{id}**
- Standard CRUD
- Pros: Simple, expected
- Cons: Standard

**Approach B: GET /study-sets/{id}/chapters**
- Nested listing
- Pros: Logical hierarchy
- Cons: Different patterns

### Recommendation
**Approach A — Standard CRUD + query filter for study_set_id listing**.

### Your Answer
Approach A

---

## 66. StudySet CRUD Operations

### Explanation
Similar questions for StudySet endpoints.

### Reason for Question
Define read/update patterns for StudySet.

### Common Approaches

**Approach A: GET /study-sets, GET /study-sets/{id}, PATCH /study-sets/{id}, DELETE /study-sets/{id}**
- Standard CRUD
- Pros: Simple, expected
- Cons: Standard

**Approach B: Include nested resources**
- GET /study-sets/{id}?include=chapters,flashcards,quizzes
- Pros: Single request for related data
- Cons: Complex, potential performance issues

### Recommendation
**Approach A — Standard CRUD, separate endpoints for related resources**. Keep it simple.

### Your Answer
Approach A

---

## 67. Ownership Validation on Create

### Explanation
All entities have `owner_id`. On create, where does owner_id come from?

### Reason for Question
- User provides owner_id in request?
- Inferred from auth context (JWT)?
- Both allowed?

### Common Approaches

**Approach A: Inferred from auth context only**
- owner_id comes from authenticated user
- User cannot create resources for others
- Pros: Secure, can't impersonate
- Cons: Less flexible

**Approach B: User provides owner_id, validated against auth**
- Client can specify owner_id but must match authenticated user
- Pros: Flexible, maintains security
- Cons: Extra validation

**Approach C: No owner_id on create**
- Entities not owned (public system)
- Pros: Simple
- Cons: No ownership tracking

### Recommendation
**Approach A — owner_id inferred from auth context**. Secure, simple. Client doesn't provide owner_id.

### Your Answer
Infered from auth context

---

## 68. Authenticated User's Resources

### Explanation
How does user fetch their own study sets, chapters, etc.?

### Reason for Question
User needs to see resources they own.

### Common Approaches

**Approach A: Query filter ?owner_id=me**
- Special "me" value meaning current user
- Pros: Clear intent
- Cons: Special syntax

**Approach B: Implicit to auth context**
- All list endpoints return only user's resources
- Pros: Secure by default
- Cons: Can't view others' public resources

**Approach C: Separate /my endpoint**
- GET /my/study-sets
- Pros: Clear separation
- Cons: More endpoints

### Recommendation
**Approach B — Implicit filtering based on auth**. All list queries return only resources the user owns (for private) or can view (for public).

### Your Answer
Approach B

---

## 69. Error Response Format

### Explanation
When validation fails or error occurs, what format is the response?

### Reason for Question
Consistency in error handling across API.

### Common Approaches

**Approach A: Simple message**
```json
{ "error": "Validation failed" }
```
- Pros: Simple
- Cons: Limited details

**Approach B: Error with code and message**
```json
{ "error": { "code": "VALIDATION_FAILED", "message": "..." } }
```
- Pros: Structured
- Cons: More verbose

**Approach C: Error with details array**
```json
{ "error": { "code": "VALIDATION_FAILED", "details": [...] } }
```
- Pros: Can show multiple errors
- Cons: Complex

### Recommendation
**Approach B — Error with code and message**. Simple, structured. Include details for validation errors.

### Your Answer
Approach B

---

## 70. Validation Error Details

### Explanation
When Valibot validation fails, what details are returned?

### Reason for Question
Help client understand what went wrong.

### Common Approaches

**Approach A: Field-level errors**
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "details": [
      { "field": "front", "message": "Required" },
      { "field": "importance", "message": "Must be positive integer" }
    ]
  }
}
```
- Pros: Actionable
- Cons: Complex

**Approach B: Simple index-based**
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Item 2: front is required"
  }
}
```
- Pros: For batch operations, points to specific item
- Cons: Less structured

### Recommendation
**Approach A — Field-level errors**. For batch operations, include item index in field path (e.g., "items.2.front").

### Your Answer
Approach N

---

## 71. Batch Create Response Format

### Explanation
When batch create succeeds, what does the response look like?

### Reason for Question
Consistency with other responses.

### Common Approaches

**Approach A: Return created items**
```json
[{ "id": "...", "front": "...", ... }, ...]
```
- Pros: Complete, can use response directly
- Cons: Verbose

**Approach B: Return IDs only**
```json
{ "created": [{ "id": "..." }, ...] }
```
- Pros: Compact
- Cons: Client must request again for full data

**Approach C: Return count only**
```json
{ "created": 5 }
```
- Pros: Very compact
- Cons: No IDs for reference

### Recommendation
**Approach A — Return created items**. Consistent with having full data for client use.

### Your Answer
Approach A

---

## 72. Batch Create Partial Failure Response

### Explanation
All-or-nothing transaction. What does error response look like?

### Reason for Question
When batch fails, client needs to understand why.

### Common Approaches

**Approach A: Error with index**
```json
{
  "error": {
    "code": "BATCH_VALIDATION_FAILED",
    "message": "Item 3 failed validation",
    "item_index": 2,
    "details": [...]
  }
}
```
- Pros: Clear which item failed
- Cons: Standard

**Approach B: Error without details**
```json
{
  "error": {
    "code": "BATCH_VALIDATION_FAILED",
    "message": "Validation failed"
  }
}
```
- Pros: Simple
- Cons: No specific field info

### Recommendation
**Approach A — Include item index and validation details**. For batch, include which item failed and why.

### Your Answer
Approach B, all or nothing, if error that mean all creation failed

---

## 73. Non-Owner Update Attempts

### Explanation
What happens if user tries to update/delete resource they don't own?

### Reason for Question
Security - prevent unauthorized modifications.

### Common Approaches

**Approach A: 403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to update this resource"
  }
}
```
- Pros: Clear security issue
- Cons: Standard

**Approach B: 404 Not Found**
- Don't reveal existence of resource
- Pros: Privacy (don't tell attacker resource exists)
- Cons: Confusing for legitimate users

**Approach C: 400 Bad Request**
- Different error
- Pros: ?
- Cons: Misleading

### Recommendation
**Approach A — 403 Forbidden**. Clear and appropriate for authorization failures.

### Your Answer
Approach A

---

## 74. Updating Slug

### Explanation
Can user update the slug of a StudySet or Chapter?

### Reason for Question
User might want to change URL-friendly identifier.

### Common Approaches

**Approach A: Slug is immutable after create**
- Cannot change slug
- If user wants new slug, create new entity
- Pros: Simple, URLs stay stable
- Cons: Inflexible

**Approach B: Slug can be updated**
- PATCH to change slug
- Must check uniqueness
- Pros: Flexible
- Cons: URLs change, potential SEO impact

**Approach C: Slug can be updated only to auto-generated**
- User can reset to auto-generated but not set custom
- Pros: Ensures slug format
- Cons: Less control

### Recommendation
**Approach B — Slug can be updated**. User has control over their URLs. Enforce uniqueness on update.

### Your Answer
Slug is immutable after create

---

## 75. Slug Update Conflict

### Explanation
When updating slug to a value that already exists.

### Reason for Question
Same conflict handling as on create.

### Common Approaches

**Approach A: Return 409 Conflict**
```json
{
  "error": {
    "code": "SLUG_CONFLICT",
    "message": "Slug already in use"
  }
}
```
- Pros: Clear error
- Cons: Standard

**Approach B: Auto-append suffix**
- New slug becomes "existing-slug-a1b2c3"
- Pros: No conflict
- Cons: Unexpected result

**Approach C: Suggest alternatives**
- Return 409 with suggestions
- Pros: Helpful
- Cons: Complex

### Recommendation
**Approach A — 409 Conflict**. User must choose different slug. Clear and simple.

### Your Answer
Approach A

---

## 76. QuizOptions Delete Behavior

### Explanation
When deleting QuizOptions (individually or when updating quiz type).

### Reason for Question
QuizOptions can be added/removed. What happens on removal?

### Common Approaches

**Approach A: Hard delete on remove**
- DELETE /quiz-options/{id}
- Pros: Clean DB
- Cons: Lost forever

**Approach B: Keep for history (soft delete)**
- Mark as deleted, keep in DB
- Pros: Historical record
- Cons: Extra state

### Recommendation
**Approach A — Hard delete**. No history requirement for options. Clean deletion.

### Your Answer
Approach A

---

## 77. Reordering QuizOptions

### Explanation
No sort_order field, but UI needs to display options in a specific order.

### Reason for Question
If sort_order doesn't exist, how does UI know order?

### Common Approaches

**Approach A: Creation order**
- Options returned in order they were created
- Pros: Simple
- Cons: No control

**Approach B: Client-side ordering**
- Client provides order in request
- Pros: Client control
- Cons: Extra data

**Approach C: UI randomizes**
- UI shows in random order each time
- Pros: Good for learning
- Cons: No consistent order

### Recommendation
**Approach A — Creation order**. Client can reorder by deleting and recreating if needed.

### Your Answer
Creation Order

---

## 78. Flashcard Swap Front/Back

### Explanation
Can user swap front and back of a flashcard?

### Reason for Question
Sometimes user creates card with reversed sides.

### Common Approaches

**Approach A: Dedicated swap endpoint**
- POST /flashcards/{id}/swap
- Pros: Clear intent, single operation
- Cons: Extra endpoint

**Approach B: Update with swapped values**
- Client sends front as back, back as front
- Pros: Uses existing update mechanism
- Cons: Two-step

**Approach C: No swap operation**
- Must delete and recreate
- Pros: Simple
- Cons: Destructive

### Recommendation
**Approach B — Update with swapped values**. No dedicated endpoint needed. Client handles swap in their request.

### Your Answer
no swap operations

---

## 79. Multiple QuizOptions for Fill-in-the-Blank

### Explanation
You said FITB has exactly 1 option with is_correct=true. But what if someone tries to add more options?

### Reason for Question
Validation to enforce the constraint.

### Common Approaches

**Approach A: Allow multiple options, first correct wins**
- Multiple options allowed, grader uses first is_correct=true
- Pros: Flexible
- Cons: Confusing

**Approach B: Validate on create - only 1 allowed**
- If quiz.type is FITB, only 1 option allowed
- Pros: Enforces correct behavior
- Cons: Extra validation

**Approach C: Error on second option creation**
- Return error if trying to add 2nd option to FITB quiz
- Pros: Clear constraint
- Cons: Extra logic

### Recommendation
**Approach B — Validate on create/update**. Error if FITB quiz has != 1 correct option.

### Your Answer
validate on create/update, this should be handled by valibot

---

## 80. Accessing Public StudySets

### Explanation
Public study sets visible to any authenticated user. How do they access them?

### Reason for Question
API structure for accessing others' public resources.

### Common Approaches

**Approach A: GET /study-sets/{slug_or_id}**
- Works for any study set user has access to
- Auth check determines visibility
- Pros: Single endpoint
- Cons: Implicit auth check

**Approach B: GET /public/study-sets/{slug_or_id}**
- Separate path for public resources
- Pros: Clear intent
- Cons: Duplicated endpoints

### Recommendation
**Approach A — Single endpoint with auth check**. Visibility determined by ownership or public flag.

### Your Answer
APproach A

---

## 81. Listing Public StudySets

### Explanation
Can user browse/search public study sets?

### Reason for Question
Discovery mechanism for public content.

### Common Approaches

**Approach A: No listing/search - only direct access**
- User needs slug or ID to access
- Pros: Simple
- Cons: No discovery

**Approach B: GET /study-sets?visibility=public**
- Filter by visibility
- Pros: Simple addition
- Cons: Could be large list

**Approach C: Dedicated public listing endpoint**
- GET /public/study-sets
- Pros: Clear intent, separate from user's resources
- Cons: Extra endpoint

### Recommendation
**Approach B — Filter with ?visibility=public**. Simple addition, allows discovering public resources.

### Your Answer
Approach A

---

## Summary Table (Final Answers)

| Question | Answer |
|----------|--------|
| Flashcard read single | GET /flashcards/{id} |
| Flashcard list all | GET /flashcards?study_set_id=X |
| Quiz CRUD | Same pattern as flashcard |
| QuizOptions CRUD | Creation same as quiz, update separate |
| Chapter CRUD | Standard CRUD + query filter |
| StudySet CRUD | Standard CRUD |
| Ownership on create | Inferred from auth context |
| Auth user's resources | Implicit filter based on auth |
| Error response format | Approach B: code + message |
| Validation error details | Approach A: field-level errors |
| Batch create response | Full created items |
| Batch create failure | All or nothing (Approach B) |
| Non-owner update | 403 Forbidden |
| Updating slug | Slug is immutable after create |
| Slug update conflict | 409 Conflict |
| QuizOptions delete | Hard delete |
| Reordering QuizOptions | Creation order only |
| Flashcard swap | No dedicated endpoint |
| FITB multiple options | Validate via Valibot |
| Access public study sets | Single endpoint with auth check |
| Listing public | No listing/search - direct access only |