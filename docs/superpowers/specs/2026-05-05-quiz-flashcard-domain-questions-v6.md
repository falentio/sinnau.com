# Domain Specs Review Questions — Phase 6

This document captures additional questions for the Quiz & Flashcard domain specifications.

---

## 102. Database Schema: Drizzle ORM Configuration

### Explanation

We use Drizzle ORM with SQLite. How should tables be configured?

### Reason for Question

Drizzle has specific features for schema definition that affect the data model.

### Common Approaches

**Approach A: Standard Drizzle schema**

- Define tables with `.table()` builder
- Standard field types
- Pros: Simple, well-documented
- Cons: Standard

**Approach B: Drizzle with generated types**

- Use Drizzle's type inference
- Pros: Type-safe queries
- Cons: More setup

### Recommendation

**Approach A — Standard Drizzle schema**. Use standard field types, let Drizzle handle SQL generation.

### Your Answer

Approach A

---

## 103. Database Indexes

### Explanation

What indexes should be created for performance?

### Reason for Question

Query optimization for common access patterns.

### Common Approaches

**Approach A: Primary keys only**

- Only auto-generated UUID indexes
- Pros: Minimal storage
- Cons: Slow queries on filters

**Approach B: Add indexes on foreign keys**

- Index chapter_id, study_set_id, owner_id
- Pros: Faster joins and filters
- Cons: Extra storage

**Approach C: Add indexes on commonly filtered fields**

- Index owner_id, study_set_id, visibility
- Pros: Optimized common queries
- Cons: More complex

### Recommendation

**Approach B — Index foreign keys**. Common queries filter by owner_id and study_set_id. Index them for performance.

### Your Answer

Approach C

---

## 104. Unique Constraints at DB Level

### Explanation

We have uniqueness constraints. Where enforced at DB level?

### Reason for Question

Data integrity enforcement location.

### Common Approaches

**Approach A: DB-level unique indexes**

- Use Drizzle's `.unique()` on field
- Pros: Enforced at storage level
- Cons: PostgreSQL-specific features may not translate

**Approach B: Application-level only**

- Check in Valibot/service layer
- Pros: Portable
- Cons: Not enforced at DB

**Approach C: Hybrid**

- Simple uniqueness at DB, complex at app
- Pros: Best of both
- Cons: More complex

### Recommendation

**Approach A — DB-level unique indexes where possible**. SQLite/Drizzle supports unique constraints.

### Your Answer

Approach A

---

## 105. Query Filters: Supported Fields

### Explanation

We support filtering by study_set_id, chapter_id, owner_id. Anything else?

### Reason for Question

What other filters are needed?

### Common Approaches

**Approach A: Only defined filters**

- study_set_id, chapter_id for lists
- Pros: Simple
- Cons: Limited

**Approach B: Search filters**

- Filter by title (LIKE)
- Filter by created_at range
- Pros: Flexible
- Cons: More complex

**Approach C: No filters, return all**

- GET /flashcards returns all for user
- Pros: Simplest
- Cons: May be large dataset

### Recommendation

**Approach A — Only defined filters**. Keep it simple. Add filters as needed.

### Your Answer

Approach C

---

## 106. QuizOptions: Access Via Quiz or Separate Endpoint

### Explanation

QuizOptions can be fetched via GET /quizzes/{id}/options or separate endpoint.

### Reason for Question

Consistency in API design.

### Common Approaches

**Approach A: GET /quizzes/{id}/options**

- Nested resource
- Pros: Logical grouping
- Cons: Extra route

**Approach B: GET /quiz-options?quiz_id={id}**

- Query filter
- Pros: Consistent pattern
- Cons: Less RESTful

**Approach C: Both supported**

- Either works
- Pros: Flexible
- Cons: Duplicated logic

### Recommendation

**Approach A — GET /quizzes/{id}/options**. Logical grouping of sub-resource.

### Your Answer

Returned along with quiz itself

---

## 107. Authentication: JWT Structure

### Explanation

We infer owner_id from auth context. What does the JWT contain?

### Reason for Question

Authorization needs user ID from JWT.

### Common Approaches

**Approach A: JWT contains user_id**

- Standard JWT with sub claim
- Pros: Simple
- Cons: Standard

**Approach B: JWT contains full user object**

- Larger token, more claims
- Pros: Contains needed data
- Cons: Larger token size

**Approach C: Separate token introspection**

- opaque token, server lookup
- Pros: Revocable
- Cons: Extra round-trip

### Recommendation

**Approach A — JWT with user_id in sub claim**. Standard approach, token is small.

### Your Answer

We use better auth, use context7 for docs

---

## 108. Authentication: Middleware Location

### Explanation

Where does auth middleware run?

### Reason for Question

Route protection design.

### Common Approaches

**Approach A: Global middleware**

- All routes protected by default
- Public routes explicitly marked
- Pros: Secure by default
- Cons: Extra config for public

**Approach B: Per-route middleware**

- Each route specifies auth requirement
- Pros: Flexible
- Cons: Easy to forget

**Approach C: Route groups**

- Protected group, public group
- Pros: Organized
- Cons: Group management

### Recommendation

**Approach A — Global middleware with public exceptions**. StudySet visibility=PUBLIC allows access without ownership check.

### Your Answer

We use better auth

---

## 109. QuizOptions: Quiz ID Required on Create

### Explanation

When creating QuizOptions, quiz_id is required. But how does client know the quiz ID?

### Reason for Question

Creation flow - client creates quiz first, gets ID, then creates options.

### Common Approaches

**Approach A: Quiz created first, ID returned**

- Client creates quiz, response contains ID
- Client uses that ID to create options
- Pros: Clear flow
- Cons: Two requests

**Approach B: Combined creation**

- POST /quizzes with options embedded
- Creates quiz and options atomically
- Pros: Single request
- Cons: Complex

### Recommendation

**Approach A — Two-step creation**. Quiz created first, options added separately. Clear separation.

### Your Answer

approach B, one step creation

---

## 110. Flashcard Creation Flow

### Explanation

Flashcards can be created in batch. But chapter_id is required.

### Reason for Question

How does client know the chapter ID?

### Common Approaches

**Approach A: Create chapter first**

- Client creates chapter, gets ID
- Uses that ID for flashcards
- Pros: Clear flow
- Cons: Multiple requests

**Approach B: Create chapter with flashcards**

- Batch create with chapter and flashcards
- Pros: Single request
- Cons: Complex nesting

**Approach C: Chapter ID must exist**

- Client fetches existing chapters first
- Pros: Simple
- Cons: Extra step

### Recommendation

**Approach A — Sequential creation**. Create chapter first, then flashcards. Simpler mental model.

### Your Answer

Approach A
_(pending)_

---

## 111. StudySet Slug: Expose to Clients

### Explanation

Slugs are auto-generated. Should clients know the slug on create?

### Reason for Question

User may want to share the URL after creation.

### Common Approaches

**Approach A: Return slug in create response**

- POST /study-sets response includes generated slug
- Pros: Client immediately knows URL
- Cons: Extra field in response

**Approach B: Slug available via GET**

- Client fetches resource after creation
- Pros: Standard
- Cons: Extra request

### Recommendation

**Approach A — Include slug in create response**. Client needs slug for sharing immediately.

### Your Answer

Approach A

---

## 112. Resource Versioning / ETags

### Explanation

Should API support ETags for caching?

### Reason for Question

HTTP caching best practices.

### Common Approaches

**Approach A: No ETags**

- Simpler, no caching headers
- Pros: Simple
- Cons: Clients may cache stale data

**Approach B: ETag on response**

- Include ETag header based on updated_at
- Pros: Proper caching
- Cons: Extra logic

### Recommendation

**Approach A — No ETags for now**. Simpler. Add caching headers later if needed.

### Your Answer

Approach A

---

## 113. API Versioning Strategy

### Explanation

How to handle API versioning as the API evolves?

### Reason for Question

Breaking changes不可避免.

### Common Approaches

**Approach A: URL versioning**

- /v1/study-sets, /v2/study-sets
- Pros: Clear, explicit
- Cons: More complex routing

**Approach B: Header versioning**

- Accept: application/vnd.api+json; version=1
- Pros: Clean URLs
- Cons: Less visible

**Approach C: No versioning yet**

- Single version, evolve carefully
- Pros: Simple
- Cons: Breaking changes hard

### Recommendation

**Approach C — No versioning yet**. Start simple, version when breaking changes needed.

### Your Answer

Appproach C

---

## 114. CORS Configuration

### Explanation

Cross-Origin Resource Sharing for API access.

### Reason for Question

Browser-based clients need CORS.

### Common Approaches

**Approach A: Restrictive CORS**

- Only allow specific origins
- Pros: Secure
- Cons: Deployment complexity

**Approach B: Open CORS**

- Allow all origins (\*)
- Pros: Simple
- Cons: Less secure

**Approach C: Environment-based**

- Dev open, prod restrictive
- Pros: Dev-friendly
- Cons: Configuration needed

### Recommendation

**Approach B — Open CORS for now**. API will be consumed by first-party clients. Tighten as needed.

### Your Answer

this is out of scope

---

## 115. Rate Limiting

### Explanation

Should API implement rate limiting?

### Reason for Question

Prevent abuse, ensure fair usage.

### Common Approaches

**Approach A: No rate limiting**

- Simpler, trust users
- Pros: Simple
- Cons: Abuse possible

**Approach B: Global rate limit**

- All endpoints same limit
- Pros: Simple
- Cons: May affect legitimate use

**Approach C: Per-endpoint limits**

- Different limits for different endpoints
- Pros: Fine-grained
- Cons: Complex

### Recommendation

**Approach A — No rate limiting initially**. Start simple, add if abuse occurs.

### Your Answer

this is out of scope

---

## 116. Logging and Monitoring

### Explanation

What should be logged for debugging/monitoring?

### Reason for Question

Production observability.

### Common Approaches

**Approach A: Request logs only**

- Log method, path, status, duration
- Pros: Minimal
- Cons: Limited debugging

**Approach B: Include errors**

- Log errors with stack traces
- Pros: Debugable
- Cons: Sensitive data

**Approach C: Structured logging**

- JSON logs with correlation IDs
- Pros: Searchable, analysable
- Cons: More complex

### Recommendation

**Approach B — Include errors with stack traces**. For errors, include enough context to debug.

### Your Answer

this is out of scope

---

## 117. Health Check Endpoint

### Explanation

Should API expose a health check endpoint?

### Reason for Question

Infrastructure monitoring (load balancers, etc).

### Common Approaches

**Approach A: No health check**

- No /health endpoint
- Pros: Simpler
- Cons: Harder to monitor

**Approach B: Basic /health**

- Returns 200 if server alive
- Pros: Simple
- Cons: Minimal info

**Approach C: /health with DB check**

- Checks database connectivity
- Pros: Real health status
- Cons: More complex

### Recommendation

**Approach B — Basic /health**. Simple, tells if server is running.

### Your Answer

this is out of scope

---

## 118. Default Values: StudySet Visibility

### Explanation

What is the default visibility when creating a study set?

### Reason for Question

New records need sensible defaults.

### Common Approaches

**Approach A: Default to PRIVATE**

- Most private by default
- Pros: Secure by default
- Cons: User must explicitly make public

**Approach B: Default to PUBLIC**

- Most open by default
- Pros: Easier sharing
- Cons: Less private

### Recommendation

**Approach A — Default to PRIVATE**. Secure by default. User opts into sharing.

### Your Answer

Public

---

## 119. Default Values: Importance Field

### Explanation

Importance defaults to 0. But what does 0 mean?

### Reason for Question

Interpretation of default importance.

### Common Approaches

**Approach A: 0 means "unset/default"**

- 0 is valid, represents normal priority
- Pros: Simple
- Cons: No distinction

**Approach B: 0 means "lowest"**

- Importance scale starts at 1
- Pros: 0 means "unset"
- Cons: Arbitrary

### Recommendation

**Approach A — 0 is valid value**. Any positive integer allowed. 0 is lowest.

### Your Answer

0 means lowest, user can make it 0 as explicitly

---

## 120. Empty States: API Responses

### Explanation

When list is empty, what does response look like?

### Reason for Question

Client handling of empty responses.

### Common Approaches

**Approach A: Empty array**

- `[]` for empty lists
- Pros: Simple, consistent type
- Cons: None

**Approach B: Null**

- `null` for empty lists
- Pros: None
- Cons: Inconsistent type

### Recommendation

**Approach A — Empty array `[]`**. Consistent JSON array type.

### Your Answer

Approach A

---

## 121. Unknown Fields in Requests

### Explanation

What happens if client sends unknown fields in request?

### Reason for Question

Request validation handling.

### Common Approaches

**Approach A: Ignore unknown fields**

- Silently discard
- Pros: Forward compatible
- Cons: Client errors unnoticed

**Approach B: Return error**

- Unknown field = 400
- Pros: Catch client errors
- Cons: Breaking change on field rename

### Recommendation

**Approach A — Ignore unknown fields**. Forward compatible. Client can upgrade without errors.

### Your Answer

Approach A

---

## 122. Case Sensitivity: Slug Comparisons

### Explanation

Slugs are lowercase. But what about comparisons?

### Reason for Question

Case handling in queries.

### Common Approaches

**Approach A: Case-sensitive comparisons**

- Exact match required
- Pros: Simple
- Cons: May cause issues

**Approach B: Case-insensitive in DB**

- SQLite LIKE/collation handles it
- Pros: User-friendly
- Cons: May have edge cases

### Recommendation

**Approach A — Case-sensitive**. All slugs normalized to lowercase on creation. Comparisons are exact.

### Your Answer

Case insensitive, auto lowered case, no DB check

---

## 123. Number Precision: Importance Field

### Explanation

Importance is integer. Should decimals be allowed?

### Reason for Question

Scale granularity.

### Common Approaches

**Approach A: Integer only**

- No decimals
- Pros: Simple
- Cons: Limited precision

**Approach B: Decimal allowed**

- 1.5, 2.3, etc
- Pros: Granular
- Cons: More complex

### Recommendation

**Approach A — Integer only**. Simple, enough granularity with large integers.

### Your Answer

Approach A, vvalidated by valibot

---

## Summary Table (Final Answers)

| Question                 | Answer                                                |
| ------------------------ | ----------------------------------------------------- |
| DB schema Drizzle config | Approach A - Standard Drizzle schema                  |
| DB indexes               | Approach C - Index owner_id, study_set_id, visibility |
| Unique constraints       | Approach A - DB-level unique indexes                  |
| Query filters            | Approach C - No filters, return all                   |
| QuizOptions access       | Returned along with quiz itself                       |
| JWT structure            | Use better auth (context7 for docs)                   |
| Auth middleware          | Use better auth                                       |
| QuizOptions creation     | One step creation (embedded in quiz)                  |
| Flashcard creation       | Sequential (chapter first, then flashcards)           |
| Slug in create response  | Include in response                                   |
| ETags                    | No ETags                                              |
| API versioning           | No versioning                                         |
| CORS                     | Out of scope                                          |
| Rate limiting            | Out of scope                                          |
| Logging                  | Out of scope                                          |
| Health check             | Out of scope                                          |
| Default visibility       | PUBLIC                                                |
| Default importance       | 0 means lowest, can be set explicitly                 |
| Empty states             | Empty array []                                        |
| Unknown fields           | Ignore unknown fields                                 |
| Slug case sensitivity    | Case insensitive, auto lowered case, no DB check      |
| Importance decimals      | Integer only, validated by Valibot                    |
