# Last Visited StudySet Feature - Design Questions

## Q1: What is the primary purpose of tracking last visited?

**Why this question exists:**
Before designing the data model and implementation, we need to understand the core use case this feature serves. The answer affects storage strategy, query patterns, and UX.

**Common approaches:**
- **A) Recent activity sidebar** - Show recently visited study sets in a sidebar or dashboard (simple, low-frequency updates)
- **B) Smart sorting** - Sort study sets by last visited instead of creation date (requires efficient sorting)
- **C) Resume learning** - Allow users to pick up where they left off in a study set (may need additional state like position/chapter)
- **D) All of the above** - Enable all these use cases with a single data point

**Recommendation:**
Start with **Option A (Recent activity sidebar)** for simplicity. If other needs arise later, the data model can evolve. Single `lastVisitedAt` timestamp per user-study-set pair is sufficient for initial scope.

**Answer**
Option A
---

## Q2: Should last visited be stored on the StudySet entity or a separate join table?

**Why this question exists:**
A study set can be visited by many users. Storing last visited on StudySet itself only tracks ONE visitor (the most recent). A separate table is needed to track per-user visit history.

**Common approaches:**
- **A) Separate `user_study_set_visit` table** - `userId`, `studySetId`, `visitedAt`. Allows unlimited history per user, supports "recently visited" lists with multiple items.
- **B) Add `lastVisitedAt` to StudySet** - Only tracks the single most recent visit across all users. Loses individual user data, not suitable for per-user "recent" lists.

**Recommendation:**
**Option A** - Separate table. Even if we only show "recent 5 visited" today, separate storage allows future features like "visit frequency", "first visited date", or "total time spent" without schema changes.

**ASnswer**
Option A
---

## Q3: How many recent visits should be stored per user?

**Why this question exists:**
Unlimited storage grows indefinitely. We need to define a practical bound. Also impacts whether we store as array or individual rows.

**Common approaches:**
- **A) Store last N visits per user** (e.g., last 20) - Use a join table with userId+visitedAt, prune old entries periodically
- **B) Store only the most recent visit per study set** (1:1 mapping) - Simpler, but loses history if user visits many different study sets
- **C) Unbounded with periodic cleanup job** - More complex, requires background jobs

**Recommendation:**
**Option A** - Store last 20 visits per user. Sufficient for "recently visited" UI while keeping storage bounded. Prune via scheduled task or at query time with LIMIT.

**Answer**
So we will have 1 study set visit row per study set per user (unique(user id, study set id))
and have last visited at column
we will have command to refresh the last visited at
we will have command, admin only, that delete all last visited at > 90 days back then

---

## Q4: Should visiting a public study set you don't own also update last visited?

**Why this question exists:**
Users can view public study sets they don't own. Should this count as a "visit" for their recent activity? Affects authorization and data ownership.

**Common approaches:**
- **A) Yes, any study set access updates last visited** - Even non-owned public study sets appear in recent list
- **B) No, only owned study sets are tracked** - Only your own study sets appear in recent list
- **C) Configurable/conditional** - Depends on future UX needs

**Recommendation:**
**Option A** - Track any visited study set. Users may want to revisit public study sets they found useful. Authorization is straightforward (any authenticated user can record their own visit history).

**Answer**
Lets handle this manually, we only need the command, and query first, about how we act on user for refresh is deferred
---

## Q5: Should last visited update on every page view or only on specific actions?

**Why this question exists:**
Frequent writes to a shared table can be a performance concern. We need to define what counts as a "visit" worth recording.

**Common approaches:**
- **A) Every page load of the study set detail** - Maximum accuracy, higher write frequency
- **B) Only on "start studying" action** - Lower write frequency, but may miss casual browsing
- **C) Throttled/batched** - Update once per session or once per N minutes per user-study-set pair

**Recommendation:**
**Option B** - Only update on "start studying" or explicit entry action. This is more meaningful as a "visit" (user actually engaged with content) and reduces write volume significantly.

**Answer**
Option B, but we dont need to wire it up yet

---

## Q6: Should the API return last visited as part of GetStudySets or as a separate query?

**Why this question exists:**
StudySet list queries are already defined in SPECS. Adding last visited to the existing query may complicate the response shape or require versioning.

**Common approaches:**
- **A) Extend GetStudySets response** - Add `lastVisitedAt` field to each item in the list. Simple for UI but may be wasteful if only one page needs it.
- **B) Separate query/endpoint** - `GetRecentStudySets` returns visited study sets with timestamps. Keeps existing API clean.
- **C) Include conditionally via query param** - `GetStudySets?includeVisited=true` adds the field only when needed

**Recommendation:**
**Option B** - Separate query. Keeps the existing `GetStudySets` contract unchanged. New `GetRecentStudySets` (or similar) can return owned + recently visited study sets independently.

**Answer**

separate query endpoint, that have only 1 parameter property, count
that fetch exactly N count, maximum 100

---

## Q7: Should last visited affect study set ordering in GetStudySets?

**Why this question exists:**
SPECS.md specifies default ordering is `createdAt` descending. Introducing last visited may create desire for "recently visited first" sorting option.

**Common approaches:**
- **A) Keep existing `createdAt` ordering only** - No change to GetStudySets ordering. Provide separate "recent" query instead.
- **B) Add optional `sortBy` parameter** - `GetStudySets?sortBy=lastVisitedAt`. Adds complexity to query handling.
- **C) New dedicated endpoint for recent study sets** - `GetRecentStudySets` with its own ordering. Clean separation.

**Recommendation:**
**Option C** - New endpoint. Avoids modifying the existing GetStudySets contract. Recent visits are a different access pattern than "all my study sets."

**Answer**
Option C

---

## Q8: What happens when a study set is deleted - should visit history be preserved?

**Why this question exists:**
If a user has visit history for a study set that gets deleted (by owner), what happens to those visit records? Cascade delete would remove history; preserving it requires special handling.

**Common approaches:**
- **A) Cascade delete visit history** - When study set is deleted, all visitor records are deleted. No orphan data.
- **B) Preserve visit history, mark as deleted** - Keep records for analytics/auditing but mark as orphaned (studySetId points to deleted item)
- **C) Soft delete study set** - Never actually delete, just mark as deleted. Visit history preserved naturally.

**Recommendation:**
**Option A** - Cascade delete. Visit history is only meaningful while the study set exists. Orphaned visit records have no value without the study set context.

**Answer**

Cascade delete

---

## Q9: Should last visited be a UTC timestamp or stored with timezone info?

**Why this question exists:**
Storage format affects querying, display, and potential timezone-based features.

**Common approaches:**
- **A) UTC timestamp in milliseconds** - Consistent with existing `createdAt`/`updatedAt` pattern. Simple, sortable.
- **B) ISO 8601 string with timezone** - More human-readable but larger storage size
- **C) Unix epoch seconds** - Smaller but less precise than milliseconds

**Recommendation:**
**Option A** - UTC timestamp in milliseconds. Matches existing convention in the schema (`createdAt: integer('created_at', { mode: 'timestamp_ms' })`). No need to reinvent.

**Answer**
approach a

---

## Q10: Should the visit record be created on read or on first visit only?

**Why this question exists:**
If a user visits the same study set multiple times, should we create multiple records or update the existing one? Affects data volume and query complexity.

**Common approaches:**
- **A) Upsert on each visit** - Update `visitedAt` on existing row if user-study-set pair exists, otherwise insert. One row per user-study-set.
- **B) Create new row on each visit** - Append new record. Allows tracking full history but grows unbounded.
- **C) Create new row with periodic cleanup** - Append but prune to last N per user

**Recommendation:**
**Option A** - Upsert. One row per user-study-set pair with `visitedAt` updated on each visit. Supports "when did I last visit this?" query. Combined with N-visit limit on display, this is manageable.

**Answer**

Option A
---

## Q11: How does last visited interact with study set visibility (PUBLIC/PRIVATE)?

**Why this question exists:**
If a private study set becomes public (or vice versa), should the visit history be affected? Can you see visit history for study sets you don't own?

**Common approaches:**
- **A) Visit history is user-private** - Each user only sees their own visit history. No visibility issue.
- **B) Only show visits for study sets user can currently access** - If study set becomes private, visits for that set are hidden from "recent" list
- **C) Preserve all visit history regardless of current access** - Shows past visits even if study set is now private (may show broken links)

**Recommendation:**
**Option B** - Filter to accessible study sets. Query for recent visits should JOIN with accessible study sets and filter out any that are no longer accessible (private + not owner).

**Answer**

Option B

---

## Q12: Should admins see aggregate visit statistics?

**Why this question exists:**
Beyond per-user recent lists, there may be desire to see which study sets are most visited overall.

**Common approaches:**
- **A) Not in scope for MVP** - Only per-user recent visit tracking
- **B) Separate analytics table/endpoint** - Aggregated stats computed separately from visit records
- **C) Query visit table with GROUP BY** - `SELECT studySetId, COUNT(*) FROM visits GROUP BY studySetId` for owner insights

**Recommendation:**
**Option A** - Not in scope for MVP. Start simple. If analytics needed later, can add separate aggregation logic or separate analytics tables.

**Answer**
Option A

---

## Q13: Should the visit timestamp update when the study set content is updated?

**Why this question exists:**
There may be distinction between "I visited this study set" and "I saw the latest version of this study set". Current approach would not update visit on content edit.

**Common approaches:**
- **A) No, only explicit user actions update visit** - Content updates don't affect visit timestamps
- **B) Yes, any content update marks as visited for subscribers** - Users who have access see "new content" indicator
- **C) Separate "last seen content version" tracking** - Different from visit timestamp, tracks content awareness

**Recommendation:**
**Option A** - No. Visit timestamp tracks user activity, not content changes. Content updates are separate concern (could trigger notifications but not visit updates).

---

## Q14: What is the maximum number of visit records to retain per user?

**Why this question exists:**
To prevent unbounded table growth, we need a retention policy. This also affects how we query for "recent" visits.

**Common approaches:**
- **A) Fixed limit per user (e.g., 50 records)** - Simple, predictable storage. Prune on insert if over limit.
- **B) Time-based retention (e.g., last 30 days)** - Keeps records relevant, deletes old ones automatically
- **C) Study set count-based (e.g., last 20 unique study sets)** - Most relevant for "recent" use case

**Recommendation:**
**Option C** - Limit to last 20 unique study sets per user. This directly maps to the "recently visited" use case. On insert, if count exceeds 20, delete oldest records for that user.

**Answer**

Limit 100 per user
Limit 90 days age
FOr expiration clean up, we will not use cron/scheduled, we just need admin only command.
