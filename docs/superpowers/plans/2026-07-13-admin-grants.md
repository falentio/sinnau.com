# Admin Grants for the Plan Service — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Source of truth:** the three closed wayfinder tickets under issue **Admin grants for the plan service** hold every decision. Read each ticket body before starting the matching task — the plan only restates the shape, not the rationale.
>
> - [Data model and repository for `admin_grant`](https://github.com/falentio/sinnau.com/issues/24) → Tasks 2, 3, 4, 5, 6, 11
> - [Service, guard, and derivation update for admin grants](https://github.com/falentio/sinnau.com/issues/25) → Tasks 7, 8, 9, 10, 11, 12
> - [API surface and SPECS update for admin grants](https://github.com/falentio/sinnau.com/issues/26) → Tasks 13, 14, 15

**Goal:** Add two admin-only procedures — `admin.grantPlan` (write) and `admin.listGrants` (read) — to `planRouter`, backed by a new `admin_grant` table that participates in `applyDerivedPlan` (L1 union-append). Audit is row-level (`grantedBy`, `grantedAt`, optional `note`). No payment rows, no order rows.

**Architecture:** Three new schema artifacts (Drizzle table, valibot input/output, repository interface methods), one new tiny `user/` domain (`UserRepository.findUserById` only), an extension of `PlanGuard` (`requireAdmin`, `assertUserExistsOrNotFound`), two new `PlanService` methods (`grantPlan`, `listGrants`), an L1 change to `applyDerivedPlan` (union `findActiveAdminGrantsForUser` with `findPaidOrdersForUser` and run the derivation once with `alwaysApply: true` on grant rows), and a new `admin: { grantPlan, listGrants }` nested object on `planRouter`. SPECS.md gains an "Admin" section and rule 7 in "Lifecycle Rules". Revoke is explicitly out of scope.

**Tech Stack:** SvelteKit, oRPC (`adminProcedure` from `$lib/server/api/base`), valibot 1.x, Drizzle ORM + better-sqlite3, vitest, LogTape.

**Conventions:** mirror `src/lib/server/services/AGENTS.md` (three-layer service pattern, singleton wiring only in `index.ts`, kebab-case action filenames) and `src/lib/server/infras/db/schema/AGENTS.md` (`pnpm db:generate` after every schema change). The pre-existing admin-command pattern lives at `src/lib/server/services/study-set/commands/study-set.admin-cleanup-visits.ts` — mirror it for the new command/query. Run `pnpm run format`, `pnpm run lint:agent`, `pnpm run check` before any commit; `pnpm run test:unit` is scoped to one test file at a time (not the full suite) to keep iteration fast.

---

## Locked decisions (do not re-litigate)

These are the destination-grilling choices baked into issue #23 and tightened inside the three child tickets. The implementation must follow them verbatim.

| #   | Decision                     | Value (locked)                                                                                                                                                                                                       |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2  | Data model                   | Separate `admin_grant` table; no columns on `user_plan`.                                                                                                                                                             |
| L1  | Lifecycle                    | Union/append. Active grants are added to `applyDerivedPlan`; they never cut short an active paid plan and are never silently skipped on tier mismatch. Implemented by an `alwaysApply: true` flag on `AppliedOrder`. |
| D3  | Duration                     | `durationMonths: number`, validated 1-24 at the application layer (valibot), no DB CHECK constraint, no `PLAN_DURATIONS` picklist.                                                                                   |
| R3  | Reason field                 | Optional `note: string                                                                                                                                                                                               | null`, max 500 chars, validated at the application layer. |
| S2  | Scope                        | `admin.grantPlan` + `admin.listGrants`. `admin.revokeGrant` is deferred to a future map.                                                                                                                             |
| P2  | Target policy                | Reject non-existent target user with `NOT_FOUND`. Allow banned users. Allow self-grant.                                                                                                                              |
| T1' | List filter                  | `listAdminGrants` and `listGrantsInputSchema` MUST NOT include a `status` field. Deferred to the revoke map.                                                                                                         |
| T2' | `requireAdmin`               | Throws `FORBIDDEN` on null/undefined admin id. No role re-fetch — `adminProcedure` owns the role check; the guard is defense in depth.                                                                               |
| T2' | `assertUserExistsOrNotFound` | Returns the user row, throws `NOT_FOUND` if missing. Adds a new `UserRepository` interface + Drizzle impl because the guard must not import `PlanRepository` for cross-domain access.                                |
| T2' | Derivation                   | Modify `deriveUserPlan` to accept `{ appliedAt, planKey, durationMonths, alwaysApply }` — smallest change, clearest L1 invariant.                                                                                    |
| F1  | Transactions                 | No transaction between `insertAdminGrant` and `applyDerivedPlan`. The grant is the audit record; a failed derivation does not roll it back.                                                                          |

---

## File map

| File                                                             | Action  | Purpose                                                                                                                                   |
| ---------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/schemas/plan.constant.ts`                               | Modify  | Add `ADMIN_GRANT_*` constants (id prefix, min/max months, note max, page limit).                                                          |
| `src/lib/schemas/plan.ts`                                        | Modify  | Add `grantPlanInputSchema`, `adminGrantSchema`, `listGrantsInputSchema`, `listGrantsOutputSchema` + inferred types. Re-export the entity. |
| `src/lib/server/infras/db/schema/plan.ts`                        | Modify  | Add `adminGrant` sqliteTable + `AdminGrant`, `NewAdminGrant` type exports. Re-export from `index.ts` (already covered by `export *`).     |
| `drizzle/00XX_*.sql`                                             | Create  | Generated by `pnpm db:generate`; applied via `pnpm db:migrate`.                                                                           |
| `src/lib/server/infras/db/schema/auth-schema.ts`                 | (no-op) | `user` is already the FK target; no change.                                                                                               |
| `src/lib/server/services/plan/plan.repository.ts`                | Modify  | Add `ListAdminGrantsFilters`, `AdminGrantListResult`, three new methods to `PlanRepository`.                                              |
| `src/lib/server/services/plan/plan.repository.drizzle.ts`        | Modify  | Implement `insertAdminGrant`, `findActiveAdminGrantsForUser`, `listAdminGrants` with the `INTERNAL_SERVER_ERROR` wrapper.                 |
| `src/lib/server/services/plan/plan.repository.drizzle.test.ts`   | Modify  | Add the admin-grant integration tests inside a new `describe.concurrent` block.                                                           |
| `src/lib/server/services/user/user.repository.ts`                | Create  | New `UserRepository` interface with `findUserById`.                                                                                       |
| `src/lib/server/services/user/user.repository.drizzle.ts`        | Create  | Drizzle impl against the existing `user` table from `auth-schema.ts`.                                                                     |
| `src/lib/server/services/user/index.ts`                          | Create  | Construct the default `UserDrizzleRepository` and export it.                                                                              |
| `src/lib/server/services/plan/plan.guard.ts`                     | Modify  | Add `requireAdmin`, `assertUserExistsOrNotFound`; constructor takes `(planRepo, userRepo)`.                                               |
| `src/lib/server/services/plan/plan.guard.test.ts`                | Modify  | Add a `requireAdmin` block and an `assertUserExistsOrNotFound` block to the existing `describe.concurrent`.                               |
| `src/lib/server/services/plan/plan.service.ts`                   | Modify  | Add `grantPlan`, `listGrants`; rewrite `applyDerivedPlan` to union grants and orders; widen `deriveUserPlan` to honor `alwaysApply`.      |
| `src/lib/server/services/plan/plan.service.test.ts`              | Modify  | Add the `grantPlan` / `listGrants` describe blocks; add the new repository methods to the mock factory at the top.                        |
| `src/lib/server/services/plan/plan.testing.ts`                   | Modify  | Add `createAdminGrantFixture` and `seedAdminGrant`; add the new repository methods to `createMockRepository` and `createMockGuard`.       |
| `src/lib/server/services/plan/index.ts`                          | Modify  | Wire `userRepo` into `planGuard`; no service-constructor change.                                                                          |
| `src/lib/server/services/plan/commands/plan.admin.grant-plan.ts` | Create  | `adminProcedure` + `grantPlanInputSchema` + `grantPlanOutputSchema` → `planService.grantPlan(input, context.user.id)`.                    |
| `src/lib/server/services/plan/queries/plan.admin.list-grants.ts` | Create  | `adminProcedure` + `listGrantsInputSchema` + `listGrantsOutputSchema` → `planService.listGrants(input, context.user.id)`.                 |
| `src/lib/server/services/plan/plan.router.ts`                    | Modify  | Add `admin: { grantPlan, listGrants }` to the router object.                                                                              |
| `src/lib/server/services/plan/SPECS.md`                          | Modify  | Add the "Admin" section, rule 7 in "Lifecycle Rules", authorize the new procedures, document the table, add the new validation constants. |
| `drizzle/00XX_*.sql`                                             | Create  | The migration produced by `pnpm db:generate`.                                                                                             |

**No changes to**: client code (`$lib/orpc.ts`, SvelteKit routes), other services' schemas, the auth config, or the study-set reference implementation.

---

## Required Skills (Mandatory)

Before working on **Task 3** (valibot schemas) or **Task 13** (router/valibot again), the engineer MUST load the `valibot` skill so the schemas follow the project's idioms (`v.pipe`, `v.picklist`, `v.optional(... default)`, `v.InferOutput`, `createPrefixedIdSchema`).

Before working on **Task 2** (Drizzle schema) or **Task 4** (migration), load the Drizzle docs via `context7_resolve-library-id` → `context7_query-docs` for `drizzle-orm` and `drizzle-kit` (`pnpm db:generate` flow, sqlite-core indexes, `references(...).onDelete("set null")`).

Before any commit, run **all** of the following in order and treat a non-zero exit as a blocker:

```sh
pnpm run format
pnpm run lint:agent
pnpm run check
pnpm run test:unit -- --run src/lib/server/services/plan/
```

Per project `AGENTS.md`, the test run is **scoped to the plan service** — not the full suite — to keep iteration under 30s. The new admin-grant test blocks (Tasks 6, 12) are part of that scoped run.

---

## Task 1: Add the `ADMIN_GRANT_*` constants

**Files:**

- Modify: `src/lib/schemas/plan.constant.ts`

> **Read first:** the current contents of `plan.constant.ts` for the surrounding style (`PLAN_ID_PREFIX`, `PLAN_PAGE_LIMIT`, etc.), then ticket #24's "Columns" and "Definition of done" sections.

### Step 1.1: Append the new constants

Open `src/lib/schemas/plan.constant.ts` and append at the bottom (after `PLAN_QRIS_EXPIRY_MINUTES`):

```typescript
// Admin-grant constants (issue #23 / ticket #24)
export const ADMIN_GRANT_ID_PREFIX = "agr";
export const ADMIN_GRANT_MIN_MONTHS = 1;
export const ADMIN_GRANT_MAX_MONTHS = 24;
export const ADMIN_GRANT_NOTE_MAX_LENGTH = 500;
export const ADMIN_GRANT_PAGE_LIMIT = 20;
```

### Step 1.2: Verify

```sh
pnpm run check
```

A clean exit means the constants compile. There are no runtime users yet.

---

## Task 2: Add the `adminGrant` Drizzle table

**Files:**

- Modify: `src/lib/server/infras/db/schema/plan.ts`

> **Read first:** ticket #24's "Columns", "Indexes", and "Do NOT add `revokedAt`" sections. The existing `user_plan` and `order` tables in `plan.ts` are the in-file pattern to mirror (timestamp_ms columns, `references(() => user.id, ...)`).

### Step 2.1: Append the table and types

After the `payment` table in `src/lib/server/infras/db/schema/plan.ts`, append:

```typescript
export const adminGrant = sqliteTable(
  "admin_grant",
  {
    durationMonths: integer("duration_months").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    grantedAt: integer("granted_at", { mode: "timestamp_ms" }).notNull(),
    grantedBy: text("granted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    id: text("id").primaryKey(),
    note: text("note"),
    planKey: text("plan_key", { enum: PLAN_KEYS }).$type<PlanKey>().notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("admin_grant_userId_expiresAt_idx").on(table.userId, table.expiresAt),
    index("admin_grant_grantedBy_grantedAt_idx").on(
      table.grantedBy,
      table.grantedAt
    ),
  ]
);
```

Then at the bottom of the file (after the existing `Payment` type exports), add:

```typescript
export type AdminGrant = typeof adminGrant.$inferSelect;
export type NewAdminGrant = typeof adminGrant.$inferInsert;
```

### Step 2.2: Verify the barrel still re-exports

`src/lib/server/infras/db/schema/index.ts` already does `export * from "./plan.ts";` — nothing to change.

```sh
pnpm run check
```

---

## Task 3: Generate and apply the migration

**Files:**

- Create: `drizzle/<timestamp>_<random>.sql`
- Create: `drizzle/meta/<snapshot>.json` and `drizzle/meta/<journal>.json` (drizzle-kit writes these)

> **Read first:** `drizzle.config.ts` (output dir is `./drizzle`, dialect `sqlite`, schema `./src/lib/server/infras/db/schema/index.ts`).

### Step 3.1: Generate

```sh
pnpm db:generate
```

The output should be a single `CREATE TABLE \`admin_grant\` (...)`migration followed by the two`CREATE INDEX` statements. If the diff includes anything else (e.g. an unintended change to an unrelated table), stop and investigate — do not apply.

### Step 3.2: Inspect the SQL

Open the new file under `drizzle/` and confirm:

- `expires_at`, `started_at`, `granted_at` are `integer NOT NULL` (timestamp_ms).
- `duration_months` is `integer NOT NULL` with no CHECK constraint (validation lives in valibot, per R3).
- `granted_by` has `ON DELETE set null`; `user_id` has `ON DELETE cascade`.
- The two indexes match the spec: `(user_id, expires_at)` and `(granted_by, granted_at)`.

### Step 3.3: Apply locally

```sh
pnpm db:migrate
```

(Equivalent to `drizzle-kit migrate`; reads from `drizzle/meta/_journal.json` and applies the new migration against `DB_FILE_NAME=.data/data.db`.)

### Step 3.4: Verify with sqlite3

```sh
sqlite3 .data/data.db ".schema admin_grant"
sqlite3 .data/data.db ".indexes admin_grant"
```

Both commands must list the table and the two indexes. Exit sqlite3 with `.quit`.

---

## Task 4: Add the valibot input/output schemas

**Files:**

- Modify: `src/lib/schemas/plan.ts`

> **Read first:** the valibot skill before touching this file. The existing `listOrdersInputSchema` / `listOrdersOutputSchema` block in `plan.ts` is the closest precedent (it composes `pageSchema`, uses `v.optional(... default)`, and pairs an input schema with a paginated output).

### Step 4.1: Append the admin-grant schemas

At the end of `src/lib/schemas/plan.ts` (after the `getAiLimitPlanForUserOutputSchema` block and before the re-export block), append:

```typescript
// ─── Admin grants (issue #23) ────────────────────────────────────────

import {
  ADMIN_GRANT_ID_PREFIX,
  ADMIN_GRANT_MAX_MONTHS,
  ADMIN_GRANT_MIN_MONTHS,
  ADMIN_GRANT_NOTE_MAX_LENGTH,
} from "./plan.constant.ts";

const adminGrantIdSchema = createPrefixedIdSchema(ADMIN_GRANT_ID_PREFIX);

const adminGrantDurationMonthsSchema = v.pipe(
  v.number(),
  v.integer("Duration must be an integer number of months"),
  v.minValue(
    ADMIN_GRANT_MIN_MONTHS,
    `Duration must be at least ${ADMIN_GRANT_MIN_MONTHS} month(s)`
  ),
  v.maxValue(
    ADMIN_GRANT_MAX_MONTHS,
    `Duration must be at most ${ADMIN_GRANT_MAX_MONTHS} months`
  )
);

export const grantPlanInputSchema = v.object({
  durationMonths: adminGrantDurationMonthsSchema,
  note: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(
        ADMIN_GRANT_NOTE_MAX_LENGTH,
        `Note must be at most ${ADMIN_GRANT_NOTE_MAX_LENGTH} characters`
      )
    )
  ),
  planKey: planKeySchema,
  userId: v.string(),
});
export type GrantPlanInput = v.InferOutput<typeof grantPlanInputSchema>;

export const adminGrantSchema = v.object({
  durationMonths: adminGrantDurationMonthsSchema,
  expiresAt: v.date(),
  grantedAt: v.date(),
  grantedBy: v.nullable(v.string()),
  id: adminGrantIdSchema,
  note: v.nullable(v.string()),
  planKey: planKeySchema,
  startedAt: v.date(),
  userId: v.string(),
});
export type AdminGrant = v.InferOutput<typeof adminGrantSchema>;

export const grantPlanOutputSchema = adminGrantSchema;
export type GrantPlanOutput = v.InferOutput<typeof grantPlanOutputSchema>;

export const listGrantsInputSchema = v.object({
  grantedBy: v.optional(v.string()),
  page: pageSchema,
  planKey: v.optional(planKeySchema),
  userId: v.optional(v.string()),
});
export type ListGrantsInput = v.InferOutput<typeof listGrantsInputSchema>;

export const listGrantsOutputSchema = v.object({
  data: v.array(adminGrantSchema),
  pagination: v.object({
    limit: v.number(),
    page: v.number(),
    total: v.number(),
    totalPages: v.number(),
  }),
});
export type ListGrantsOutput = v.InferOutput<typeof listGrantsOutputSchema>;
```

> **Note on import order:** the valibot schemas import from `./plan.constant.ts`, but that file is already imported at the top of `plan.ts`. Consolidate the new constant imports into the existing `import { ... } from "./plan.constant.ts"` block instead of declaring a second import line — the example above is a snippet, not a literal diff.

### Step 4.2: Verify

```sh
pnpm run check
```

The new inferred types (`GrantPlanInput`, `AdminGrant`, `ListGrantsInput`, `ListGrantsOutput`, `GrantPlanOutput`) are exported and the `agr_` id prefix compiles against `createPrefixedIdSchema`.

---

## Task 5: Extend `PlanRepository` and `PlanDrizzleRepository`

**Files:**

- Modify: `src/lib/server/services/plan/plan.repository.ts`
- Modify: `src/lib/server/services/plan/plan.repository.drizzle.ts`
- Modify: `src/lib/server/services/plan/plan.testing.ts` (add the three new methods to the mock factory + fixture/seed helpers)

> **Read first:** ticket #24's "Repository interface methods" and "Drizzle integration tests" sub-decisions. Mirror the `try/catch → ORPCError('INTERNAL_SERVER_ERROR')` wrapper from `plan.repository.drizzle.ts:64-90` (`findActiveUserPlan`) and the pagination pattern from `findOrdersByUser` (`:147-189`).

### Step 5.1: Extend the interface

In `src/lib/server/services/plan/plan.repository.ts`, add to the imports:

```typescript
import type {
  AdminGrant,
  NewAdminGrant,
  NewOrder,
  NewPayment,
  NewUserPlan,
  Order,
  OrderStatus,
  Payment,
  PaymentGateway,
  UserPlan,
} from "../../infras/db/schema/plan.ts";
```

Then append the new shared types after `OrderListResult`:

```typescript
export interface AdminGrantListPagination {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

export interface AdminGrantListResult {
  data: AdminGrant[];
  pagination: AdminGrantListPagination;
}

export interface ListAdminGrantsFilters {
  grantedBy?: string;
  page: number;
  planKey?: (typeof PLAN_KEYS)[number];
  userId?: string;
}
```

(Add `import { PLAN_KEYS } from "$lib/schemas/plan.constant";` at the top if not already present.)

Then add to the `PlanRepository` interface:

```typescript
  // ── admin_grant ──
  insertAdminGrant(row: NewAdminGrant): Promise<AdminGrant>;
  findActiveAdminGrantsForUser(
    userId: string,
    nowMs: number
  ): Promise<AdminGrant[]>;
  listAdminGrants(filters: ListAdminGrantsFilters): Promise<AdminGrantListResult>;
```

### Step 5.2: Implement in the Drizzle repository

In `src/lib/server/services/plan/plan.repository.drizzle.ts`:

1. Add to the imports:

```typescript
import {
  ADMIN_GRANT_ID_PREFIX,
  ADMIN_GRANT_PAGE_LIMIT,
  PLAN_KEYS,
  PLAN_PAGE_LIMIT,
} from "$lib/schemas/plan.constant";
import { and, desc, eq, gt, gte, lte, notInArray, sql } from "drizzle-orm";
```

(`gt` is the new operator; `desc` already imported.)

2. Add `adminGrant` to the `import { order, payment, userPlan } from "../../infras/db/schema/plan.ts";` line.

3. Add `AdminGrant`, `NewAdminGrant` to the schema type imports.

4. Add `AdminGrantListResult`, `ListAdminGrantsFilters` to the local type imports.

5. Append the three new methods inside the class (after `updatePayment`):

```typescript
  async insertAdminGrant(row: NewAdminGrant): Promise<AdminGrant> {
    try {
      const [created] = await this.dbInstance
        .insert(adminGrant)
        .values(row)
        .returning();
      if (!created) {
        throw new Error("Failed to insert admin grant");
      }
      return created;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findActiveAdminGrantsForUser(
    userId: string,
    nowMs: number
  ): Promise<AdminGrant[]> {
    try {
      return await this.dbInstance
        .select()
        .from(adminGrant)
        .where(
          and(eq(adminGrant.userId, userId), gt(adminGrant.expiresAt, new Date(nowMs)))
        )
        .orderBy(sql`${adminGrant.startedAt} asc`);
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async listAdminGrants(
    filters: ListAdminGrantsFilters
  ): Promise<AdminGrantListResult> {
    try {
      const limit = ADMIN_GRANT_PAGE_LIMIT;
      const page = filters.page;
      const offset = (page - 1) * limit;
      const conditions = [];
      if (filters.userId !== undefined) {
        conditions.push(eq(adminGrant.userId, filters.userId));
      }
      if (filters.grantedBy !== undefined) {
        conditions.push(eq(adminGrant.grantedBy, filters.grantedBy));
      }
      if (filters.planKey !== undefined) {
        conditions.push(eq(adminGrant.planKey, filters.planKey));
      }
      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await this.dbInstance
        .select()
        .from(adminGrant)
        .where(whereClause)
        .orderBy(desc(adminGrant.grantedAt))
        .limit(limit)
        .offset(offset);

      const [{ total } = { total: 0 }] = await this.dbInstance
        .select({ total: sql<number>`count(*)` })
        .from(adminGrant)
        .where(whereClause);
      const totalCount = total;

      return {
        data: rows,
        pagination: {
          limit,
          page,
          total: totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        },
      };
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }
```

> **Note on `PLAN_KEYS` import:** it's only referenced via the `ListAdminGrantsFilters` type (typed as `(typeof PLAN_KEYS)[number]`). If TypeScript complains about an unused import, drop it — the type re-exports the literal union through the interface signature.

### Step 5.3: Extend the mock factory and fixtures in `plan.testing.ts`

In `src/lib/server/services/plan/plan.testing.ts`:

1. Add `ADMIN_GRANT_ID_PREFIX` to the constant imports.
2. Add `AdminGrant` to the schema type imports.
3. Add `AdminGrantListResult` to the local type imports.
4. Inside `createMockRepository()`, register the three new methods:

```typescript
  findActiveAdminGrantsForUser: vi.fn<PlanRepository["findActiveAdminGrantsForUser"]>(),
  insertAdminGrant: vi.fn<PlanRepository["insertAdminGrant"]>(),
  listAdminGrants: vi.fn<PlanRepository["listAdminGrants"]>(),
```

(alphabetical; insertAdminGrant between insertOrder and insertPayment).

5. Append the fixture + seed helpers after `createPaymentFixture`:

```typescript
export const createAdminGrantFixture = (
  overrides: Partial<AdminGrant> = {}
): AdminGrant => ({
  durationMonths: 1,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  grantedAt: new Date(),
  grantedBy: "admin-1",
  id: generateId(ADMIN_GRANT_ID_PREFIX),
  note: null,
  planKey: "LITE",
  startedAt: new Date(),
  userId: "owner-1",
  ...overrides,
});

export const EMPTY_ADMIN_GRANT_LIST: AdminGrantListResult = {
  data: [],
  pagination: { limit: 20, page: 1, total: 0, totalPages: 1 },
};
```

6. Inside the `PlanTestEnv` class, after `seedPayment`, add:

```typescript
  async seedAdminGrant(overrides: Partial<AdminGrant> = {}): Promise<AdminGrant> {
    return await this.repo.insertAdminGrant({
      durationMonths: 1,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      grantedAt: new Date(),
      grantedBy: "admin-1",
      id: generateId(ADMIN_GRANT_ID_PREFIX),
      note: null,
      planKey: "LITE",
      startedAt: new Date(),
      userId: this.ownerId,
      ...overrides,
    });
  }
```

### Step 5.4: Verify

```sh
pnpm run check
```

Then narrow the test sweep to confirm nothing else broke:

```sh
pnpm run test:unit -- --run src/lib/server/services/plan/plan.repository.drizzle.test.ts
```

It will fail at the `MockedFunction` lines (the three new methods) until Task 6 adds the tests, but it must **compile**.

---

## Task 6: Drizzle integration tests for the admin-grant repository

**Files:**

- Modify: `src/lib/server/services/plan/plan.repository.drizzle.test.ts`

> **Read first:** ticket #24's "Drizzle integration tests" block. Mirror the seed-and-assert style of the existing "order table" and "user_plan" describes (`:11-188`, `:235-308`).

### Step 6.1: Append the `admin_grant` describe block

After the existing "schema constraints" describe (which ends at line 350), append:

```typescript
describe("admin_grant table", () => {
  it("insertAdminGrant returns the inserted row with the agr_ id prefix", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    const row = await env.seedAdminGrant({ id: "agr_test1" });
    expect(row.id).toBe("agr_test1");
    expect(row.planKey).toBe("LITE");
    expect(row.userId).toBe(env.ownerId);
  });

  it("insertAdminGrant with a non-existent userId surfaces INTERNAL_SERVER_ERROR", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    const error = await captureError(
      env.repo.insertAdminGrant({
        durationMonths: 1,
        expiresAt: new Date(Date.now() + MONTH_MS),
        grantedAt: new Date(),
        grantedBy: null,
        id: "agr_orphan",
        note: null,
        planKey: "LITE",
        startedAt: new Date(),
        userId: "user-does-not-exist",
      })
    );
    expect(error).toBeInstanceOf(ORPCError);
    expect(error).toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("findActiveAdminGrantsForUser returns only grants where expiresAt > nowMs", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    const now = Date.now();
    await env.seedAdminGrant({
      expiresAt: new Date(now + MONTH_MS),
      id: "agr_active",
      startedAt: new Date(now - 1000),
    });
    await env.seedAdminGrant({
      expiresAt: new Date(now - MONTH_MS),
      id: "agr_expired",
      startedAt: new Date(now - 2 * MONTH_MS),
    });
    const active = await env.repo.findActiveAdminGrantsForUser(
      env.ownerId,
      now
    );
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe("agr_active");
  });

  it("findActiveAdminGrantsForUser returns rows sorted by startedAt asc", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    const now = Date.now();
    await env.seedAdminGrant({
      expiresAt: new Date(now + MONTH_MS),
      id: "agr_late",
      startedAt: new Date(now - 1000),
    });
    await env.seedAdminGrant({
      expiresAt: new Date(now + 2 * MONTH_MS),
      id: "agr_early",
      startedAt: new Date(now - 10_000),
    });
    const rows = await env.repo.findActiveAdminGrantsForUser(env.ownerId, now);
    expect(rows.map((r) => r.id)).toEqual(["agr_early", "agr_late"]);
  });

  it("listAdminGrants with no filters returns all rows paginated", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    for (let i = 0; i < 25; i += 1) {
      await env.seedAdminGrant({ id: `agr_${i.toString().padStart(2, "0")}` });
    }
    const page1 = await env.repo.listAdminGrants({ page: 1 });
    expect(page1.data).toHaveLength(20);
    expect(page1.pagination).toMatchObject({
      limit: 20,
      page: 1,
      total: 25,
      totalPages: 2,
    });
    const page2 = await env.repo.listAdminGrants({ page: 2 });
    expect(page2.data).toHaveLength(5);
  });

  it("listAdminGrants with userId filter returns only that user's grants", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    await env.seedAdminGrant({ id: "agr_owner_a" });
    const otherUser = env.seedUser({ name: "Other" });
    await env.repo.insertAdminGrant({
      durationMonths: 1,
      expiresAt: new Date(Date.now() + MONTH_MS),
      grantedAt: new Date(),
      grantedBy: null,
      id: "agr_owner_b",
      note: null,
      planKey: "LITE",
      startedAt: new Date(),
      userId: otherUser,
    });
    const result = await env.repo.listAdminGrants({
      page: 1,
      userId: env.ownerId,
    });
    expect(result.data.map((r) => r.id)).toEqual(["agr_owner_a"]);
    expect(result.pagination.total).toBe(1);
  });

  it("listAdminGrants with grantedBy filter returns only grants by that admin", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    const admin = env.seedUser({ name: "Admin" });
    await env.seedAdminGrant({ grantedBy: admin, id: "agr_by_admin" });
    await env.seedAdminGrant({ id: "agr_no_admin", grantedBy: null });
    const result = await env.repo.listAdminGrants({
      grantedBy: admin,
      page: 1,
    });
    expect(result.data.map((r) => r.id)).toEqual(["agr_by_admin"]);
  });

  it("listAdminGrants with planKey filter returns only grants for that plan", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    await env.seedAdminGrant({ id: "agr_lite", planKey: "LITE" });
    await env.seedAdminGrant({ id: "agr_plus", planKey: "PLUS" });
    const result = await env.repo.listAdminGrants({ page: 1, planKey: "LITE" });
    expect(result.data.map((r) => r.id)).toEqual(["agr_lite"]);
  });

  it("listAdminGrants page 2 returns the next page", async ({ expect }) => {
    await using env = new PlanTestEnv();
    for (let i = 0; i < 21; i += 1) {
      await env.seedAdminGrant({ id: `agr_${i.toString().padStart(2, "0")}` });
    }
    const page2 = await env.repo.listAdminGrants({ page: 2 });
    expect(page2.data).toHaveLength(1);
    expect(page2.pagination).toMatchObject({ page: 2, total: 21 });
  });
});
```

Add the imports at the top of the file if not already present:

```typescript
import { ORPCError } from "@orpc/server";
import { adminGrant } from "$lib/server/infras/db/schema/plan";
import { captureError } from "./plan.testing.ts";
```

(If `captureError` is already exported from `plan.testing.ts`, the import is a no-op.)

### Step 6.2: Run the test file

```sh
pnpm run test:unit -- --run src/lib/server/services/plan/plan.repository.drizzle.test.ts
```

All 9 new tests must pass. If any fail, fix the repository (Task 5) before moving on.

---

## Task 7: Add the `user/` domain (UserRepository)

**Files:**

- Create: `src/lib/server/services/user/user.repository.ts`
- Create: `src/lib/server/services/user/user.repository.drizzle.ts`
- Create: `src/lib/server/services/user/index.ts`

> **Read first:** ticket #25's "`assertUserExistsOrNotFound`" sub-decision. The `chapter` service (`src/lib/server/services/chapter/`) is the closest cross-domain reference: it imports a sibling `studySetGuard` via `index.ts`, never directly. The new `user/` domain is intentionally tiny — one interface, one Drizzle impl, no guard, no service.

### Step 7.1: Create `user.repository.ts`

`src/lib/server/services/user/user.repository.ts`:

```typescript
import type { user } from "../../infras/db/schema/auth-schema.ts";

export type AuthUser = typeof user.$inferSelect;

export interface UserRepository {
  findUserById(id: string): Promise<AuthUser | null>;
}
```

### Step 7.2: Create `user.repository.drizzle.ts`

`src/lib/server/services/user/user.repository.drizzle.ts`:

```typescript
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import type { DB } from "../../infras/db/client.ts";
import { db as defaultDb } from "../../infras/db/client.ts";
import { user } from "../../infras/db/schema/auth-schema.ts";
import type { AuthUser, UserRepository } from "./user.repository.ts";

export class UserDrizzleRepository implements UserRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): UserDrizzleRepository {
    return new UserDrizzleRepository(db);
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(user)
        .where(eq(user.id, id))
        .limit(1);
      return row ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }
}
```

### Step 7.3: Create `index.ts`

`src/lib/server/services/user/index.ts`:

```typescript
import { UserDrizzleRepository } from "./user.repository.drizzle.ts";

export const userRepo = new UserDrizzleRepository();
```

(No `guard` or `service` — the `user/` domain is a persistence seam only. Nothing else in the codebase depends on it yet.)

### Step 7.4: Verify

```sh
pnpm run check
```

---

## Task 8: Extend `PlanGuard` with `requireAdmin` and `assertUserExistsOrNotFound`

**Files:**

- Modify: `src/lib/server/services/plan/plan.guard.ts`
- Modify: `src/lib/server/services/plan/plan.testing.ts` (extend the guard mock factory)
- Modify: `src/lib/server/services/plan/plan.guard.test.ts` (extend the local mock factory + tests)

> **Read first:** ticket #25's "`requireAdmin`" and "`assertUserExistsOrNotFound`" sub-decisions. The shape of `requireOwner` at `plan.guard.ts:13-20` is the closest precedent for `requireAdmin`; `assertOrderVisibleByIdOrNotFound` at `:22-31` is the precedent for `assertUserExistsOrNotFound`.

### Step 8.1: Update `plan.guard.ts`

```typescript
import { ORPCError } from "@orpc/server";

import type { Order } from "../../infras/db/schema/plan.ts";
import type { AuthUser } from "../user/user.repository.ts";
import type { UserRepository } from "../user/user.repository.ts";
import type { PlanRepository } from "./plan.repository.ts";

export class PlanGuard {
  private readonly planRepo: PlanRepository;
  private readonly userRepo: UserRepository;

  constructor(planRepo: PlanRepository, userRepo: UserRepository) {
    this.planRepo = planRepo;
    this.userRepo = userRepo;
  }

  requireOwner(ownerId: string | null | undefined): string {
    if (!ownerId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return ownerId;
  }

  requireAdmin(adminId: string | null | undefined): string {
    if (!adminId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Admin access required",
      });
    }
    return adminId;
  }

  async assertUserExistsOrNotFound(userId: string): Promise<AuthUser> {
    const row = await this.userRepo.findUserById(userId);
    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }
    return row;
  }

  async assertOrderVisibleByIdOrNotFound(
    orderId: string,
    userId: string
  ): Promise<Order> {
    const order = await this.planRepo.findOrderById(orderId);
    if (!order || order.userId !== userId) {
      throw new ORPCError("NOT_FOUND", { message: "Order not found" });
    }
    return order;
  }
}
```

### Step 8.2: Update the guard mock factory in `plan.testing.ts`

In `createMockGuard()`, add:

```typescript
  assertUserExistsOrNotFound: vi.fn<PlanGuard["assertUserExistsOrNotFound"]>(),
  requireAdmin: vi.fn<PlanGuard["requireAdmin"]>(),
```

### Step 8.3: Update the local mock factory in `plan.guard.test.ts`

In the test file's local `createMockRepository()` and the local mock factory, add the new methods (mirror what was added to `plan.testing.ts`). In `setupGuard()`, also accept the new `userRepo` parameter:

```typescript
import type { UserRepository } from "../user/user.repository.ts";
import { UserDrizzleRepository } from "../user/user.repository.drizzle.ts";

const createMockUserRepository = (): {
  [K in keyof UserRepository]: MockedFunction<UserRepository[K]>;
} => ({
  findUserById: vi.fn<UserRepository["findUserById"]>(),
});

const setupGuard = () => {
  const repo = createMockRepository();
  const userRepo = createMockUserRepository();
  const guard = new PlanGuard(repo, userRepo as unknown as UserRepository);
  return { guard, repo, userRepo };
};
```

### Step 8.4: Add the new test blocks

In `src/lib/server/services/plan/plan.guard.test.ts`, inside the existing `describe.concurrent("PlanGuard unit", ...)`:

```typescript
describe("requireAdmin", () => {
  it("returns the admin id when present", async ({ expect }) => {
    const { guard } = setupGuard();
    expect(guard.requireAdmin("admin-123")).toBe("admin-123");
  });

  it("throws FORBIDDEN when null", async ({ expect }) => {
    const { guard } = setupGuard();
    const err = await captureError((async () => guard.requireAdmin(null))());
    expect(err).toBeInstanceOf(ORPCError);
    expect(err).toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN when undefined", async ({ expect }) => {
    const { guard } = setupGuard();
    const err = await captureError(
      (async () => guard.requireAdmin(undefined))()
    );
    expect(err).toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not fetch the user (defense-in-depth only)", async ({ expect }) => {
    const { guard, userRepo } = setupGuard();
    guard.requireAdmin("admin-123");
    expect(userRepo.findUserById).not.toHaveBeenCalled();
  });
});

describe("assertUserExistsOrNotFound", () => {
  it("returns the user row when the id resolves", async ({ expect }) => {
    const { guard, userRepo } = setupGuard();
    const user = {
      banned: false,
      email: "u@e.com",
      emailVerified: true,
      id: "user-1",
      name: "U",
    } as never;
    userRepo.findUserById.mockResolvedValue(user);
    const result = await guard.assertUserExistsOrNotFound("user-1");
    expect(result).toBe(user);
    expect(userRepo.findUserById).toHaveBeenCalledWith("user-1");
  });

  it("throws NOT_FOUND when the user does not exist", async ({ expect }) => {
    const { guard, userRepo } = setupGuard();
    userRepo.findUserById.mockResolvedValue(null);
    const err = await captureError(
      guard.assertUserExistsOrNotFound("u-missing")
    );
    expect(err).toBeInstanceOf(ORPCError);
    expect(err).toMatchObject({ code: "NOT_FOUND", message: "User not found" });
  });
});
```

(If `MockedFunction` is not yet imported, add `import type { MockedFunction } from "vitest";`.)

### Step 8.5: Run the test file

```sh
pnpm run test:unit -- --run src/lib/server/services/plan/plan.guard.test.ts
```

All 6 new tests must pass.

### Step 8.6: Cascade

The new constructor signature on `PlanGuard` will break `plan.service.test.ts`, `plan.lifecycle.test.ts`, and `plan/index.ts` until they are updated. Update them as part of this task:

- `src/lib/server/services/plan/plan.service.test.ts` — at the bottom of `setupService`, change `guard as unknown as PlanGuard` to be constructed with a real `PlanGuard(new PlanDrizzleRepository(), new UserDrizzleRepository())` (the easiest fix), **or** add a local `createMockUserRepository()` and pass it in. The latter is preferred because it keeps the unit tests fast and pure.
- `src/lib/server/services/plan/plan.lifecycle.test.ts` — pass a real `new UserDrizzleRepository()` to the `new PlanGuard(env.repo, ...)` call.
- `src/lib/server/services/plan/index.ts` — see Task 11.

---

## Task 9: Update `PlanService` for the L1 union and add `grantPlan` / `listGrants`

**Files:**

- Modify: `src/lib/server/services/plan/plan.service.ts`
- Modify: `src/lib/server/services/plan/plan.service.test.ts`

> **Read first:** ticket #25's "PlanService.grantPlan", "PlanService.listGrants", and "applyDerivedPlan change (L1)" sub-decisions. The `deriveUserPlan` function (`plan.service.ts:161-200`) is the heart of L1 — extend it with an `alwaysApply` flag on `AppliedOrder`, then add a second private helper to assemble the union.

### Step 9.1: Widen `AppliedOrder` and `deriveUserPlan`

In `plan.service.ts`, replace the `AppliedOrder` interface and `deriveUserPlan` function with:

```typescript
interface AppliedOrder {
  alwaysApply: boolean;
  appliedAt: number;
  durationMonths: number;
  planKey: (typeof PLAN_KEYS)[number];
}

const deriveUserPlan = (
  applied: AppliedOrder[],
  nowMs: number
): DerivedPlan | null => {
  const sorted = [...applied].toSorted((a, b) => a.appliedAt - b.appliedAt);
  let current: DerivedPlan | null = null;
  for (const o of sorted) {
    const durationMs = o.durationMonths * MONTH_MS;
    const rank = PLAN_TIER_RANK[o.planKey];
    if (!current || current.expiresAt < o.appliedAt) {
      current = {
        expiresAt: o.appliedAt + durationMs,
        planKey: o.planKey,
        startedAt: o.appliedAt,
      };
    } else if (PLAN_TIER_RANK[current.planKey] === rank) {
      current = {
        expiresAt: current.expiresAt + durationMs,
        planKey: current.planKey,
        startedAt: current.startedAt,
      };
    } else if (rank > PLAN_TIER_RANK[current.planKey]) {
      current = {
        expiresAt: o.appliedAt + durationMs,
        planKey: o.planKey,
        startedAt: o.appliedAt,
      };
    } else if (o.alwaysApply) {
      // L1 invariant: an active admin grant is never silently skipped.
      // Extend from the current plan's expiry (same-tier extension algorithm),
      // so the granted tier eventually takes over once the higher tier ends.
      current = {
        expiresAt: current.expiresAt + durationMs,
        planKey: current.planKey,
        startedAt: current.startedAt,
      };
    } else {
      // downgrade while a higher tier is active is prohibited
      continue;
    }
  }
  if (!current) {
    return null;
  }
  if (current.expiresAt < nowMs) {
    return null;
  }
  return current;
};
```

> **Why extend instead of append-after:** ticket #25's destination-grilling chose D2 option (c) "extend on downgrade" so the granted tier _eventually_ takes over once the higher tier ends, instead of being silently queued forever. The `alwaysApply` branch in `deriveUserPlan` reuses the same `current.expiresAt + durationMs` formula as same-tier extension.

### Step 9.2: Rewrite `applyDerivedPlan` to union grants and orders

Replace the existing `applyDerivedPlan` (`:454-481`) with:

```typescript
  private async applyDerivedPlan(userId: string): Promise<void> {
    const now = Date.now();
    const [paid, grants] = await Promise.all([
      this.repo.findPaidOrdersForUser(userId),
      this.repo.findActiveAdminGrantsForUser(userId, now),
    ]);

    const applied: AppliedOrder[] = [];
    for (const o of paid) {
      if (o.appliedAt === null) {
        continue;
      }
      applied.push({
        alwaysApply: false,
        appliedAt: o.appliedAt.getTime(),
        durationMonths: o.durationMonths,
        planKey: o.planKey,
      });
    }
    for (const g of grants) {
      applied.push({
        alwaysApply: true,
        appliedAt: g.startedAt.getTime(),
        durationMonths: g.durationMonths,
        planKey: g.planKey,
      });
    }

    const derived = deriveUserPlan(applied, now);
    if (!derived) {
      await this.repo.deleteUserPlan(userId);
      return;
    }
    await this.repo.upsertUserPlan({
      createdAt: new Date(),
      expiresAt: new Date(derived.expiresAt),
      id: generateId(PLAN_ID_PREFIX),
      planKey: derived.planKey,
      startedAt: new Date(derived.startedAt),
      updatedAt: new Date(),
      userId,
    });
  }
```

### Step 9.3: Add `grantPlan` and `listGrants`

Append the following methods to the `PlanService` class (after `handleWebhook`):

```typescript
  async grantPlan(
    input: GrantPlanInput,
    adminId: string | null | undefined
  ): Promise<AdminGrant> {
    const admin = this.guard.requireAdmin(adminId);
    await this.guard.assertUserExistsOrNotFound(input.userId);

    const startedAt = new Date();
    const expiresAt = new Date(
      startedAt.getTime() + input.durationMonths * MONTH_MS
    );
    const id = generateId(ADMIN_GRANT_ID_PREFIX);

    const row = await this.repo.insertAdminGrant({
      durationMonths: input.durationMonths,
      expiresAt,
      grantedAt: new Date(),
      grantedBy: admin,
      id,
      note: input.note ?? null,
      planKey: input.planKey,
      startedAt,
      userId: input.userId,
    });

    // L1: the grant is the audit record; the derivation is the consequence.
    // A failed derivation does not roll back the grant.
    await this.applyDerivedPlan(input.userId);

    return row;
  }

  async listGrants(
    input: ListGrantsInput,
    adminId: string | null | undefined
  ): Promise<AdminGrantListResult> {
    this.guard.requireAdmin(adminId);
    return await this.repo.listAdminGrants({
      grantedBy: input.grantedBy,
      page: input.page ?? 1,
      planKey: input.planKey,
      userId: input.userId,
    });
  }
```

Add the new imports at the top of `plan.service.ts`:

```typescript
import type { GrantPlanInput, ListGrantsInput } from "$lib/schemas/plan";
import type { AdminGrantListResult } from "./plan.repository.ts";
import { ADMIN_GRANT_ID_PREFIX } from "$lib/schemas/plan.constant";
```

### Step 9.4: Update the service test mock factory

In `src/lib/server/services/plan/plan.service.test.ts`, inside `setupService`, add defaults for the new repository methods (after the existing `upsertUserPlan` mock):

```typescript
repo.findActiveAdminGrantsForUser.mockResolvedValue([]);
repo.insertAdminGrant.mockImplementation(
  async (row) => createAdminGrantFixture(row) as never
);
repo.listAdminGrants.mockResolvedValue(EMPTY_ADMIN_GRANT_LIST);
```

And import `createAdminGrantFixture` + `EMPTY_ADMIN_GRANT_LIST` from `./plan.testing.ts`.

In the **local** `createMockRepository()` at the top of `plan.service.test.ts` (which is a hand-rolled mock, not from `plan.testing.ts`), add the same three methods. (Search for `insertPayment`; the new methods slot in alphabetically.)

### Step 9.5: Add the `grantPlan` and `listGrants` describe blocks

In the same file, after the existing `describe.concurrent("getOrder", ...)` block, append:

```typescript
describe.concurrent("grantPlan", () => {
  const baseInput: GrantPlanInput = {
    durationMonths: 1,
    planKey: "LITE",
    userId: "user-1",
  };

  it("throws FORBIDDEN when adminId is null", async ({ expect }) => {
    const { guard, service } = setupService();
    guard.requireAdmin.mockImplementation(() => {
      throw new ORPCError("FORBIDDEN", { message: "Admin access required" });
    });
    const err = await captureError(service.grantPlan(baseInput, null));
    expect(err).toBeInstanceOf(ORPCError);
    expect(err).toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN when adminId is undefined", async ({ expect }) => {
    const { guard, service } = setupService();
    guard.requireAdmin.mockImplementation(() => {
      throw new ORPCError("FORBIDDEN", { message: "Admin access required" });
    });
    const err = await captureError(service.grantPlan(baseInput, undefined));
    expect(err).toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when the target user does not exist", async ({
    expect,
  }) => {
    const { guard, service } = setupService();
    guard.assertUserExistsOrNotFound.mockRejectedValue(
      new ORPCError("NOT_FOUND", { message: "User not found" })
    );
    const err = await captureError(service.grantPlan(baseInput, "admin-1"));
    expect(err).toMatchObject({ code: "NOT_FOUND" });
    expect(guard.requireAdmin).toHaveBeenCalled();
  });

  it("allows self-grant (adminId === userId)", async ({ expect }) => {
    const { guard, repo, service } = setupService();
    guard.assertUserExistsOrNotFound.mockResolvedValue({
      banned: false,
      email: "a@e.com",
      emailVerified: true,
      id: "admin-1",
      name: "Admin",
    } as never);
    const row = await service.grantPlan(
      { ...baseInput, userId: "admin-1" },
      "admin-1"
    );
    expect(row.userId).toBe("admin-1");
    expect(repo.insertAdminGrant).toHaveBeenCalled();
  });

  it("allows a banned user (P2)", async ({ expect }) => {
    const { guard, repo, service } = setupService();
    guard.assertUserExistsOrNotFound.mockResolvedValue({
      banned: true,
      email: "b@e.com",
      emailVerified: true,
      id: "user-1",
      name: "Banned",
    } as never);
    const row = await service.grantPlan(baseInput, "admin-1");
    expect(row.userId).toBe("user-1");
    expect(repo.insertAdminGrant).toHaveBeenCalled();
  });

  it("inserts the row with expiresAt = startedAt + durationMonths * MONTH_MS", async ({
    expect,
  }) => {
    const { repo, service } = setupService();
    const before = Date.now();
    await service.grantPlan({ ...baseInput, durationMonths: 6 }, "admin-1");
    const inserted = repo.insertAdminGrant.mock.calls[0]?.[0];
    expect(inserted).toMatchObject({
      durationMonths: 6,
      grantedBy: "admin-1",
      planKey: "LITE",
      userId: "user-1",
    });
    const span = inserted.expiresAt.getTime() - inserted.startedAt.getTime();
    expect(span).toBe(6 * MONTH_MS);
    expect(inserted.startedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("re-derives the target user's plan after inserting the grant", async ({
    expect,
  }) => {
    const { repo, service } = setupService();
    repo.findActiveAdminGrantsForUser.mockResolvedValue([
      createAdminGrantFixture({ userId: "user-1" }),
    ]);
    await service.grantPlan(baseInput, "admin-1");
    expect(repo.findPaidOrdersForUser).toHaveBeenCalledWith("user-1");
    expect(repo.findActiveAdminGrantsForUser).toHaveBeenCalledWith(
      "user-1",
      expect.any(Number)
    );
  });

  it("returns the inserted row", async ({ expect }) => {
    const { service } = setupService();
    const row = await service.grantPlan(baseInput, "admin-1");
    expect(row.id).toMatch(/^agr_/u);
    expect(row.planKey).toBe("LITE");
  });
});

describe.concurrent("listGrants", () => {
  it("throws FORBIDDEN when adminId is null", async ({ expect }) => {
    const { guard, service } = setupService();
    guard.requireAdmin.mockImplementation(() => {
      throw new ORPCError("FORBIDDEN", { message: "Admin access required" });
    });
    const err = await captureError(service.listGrants({ page: 1 }, null));
    expect(err).toMatchObject({ code: "FORBIDDEN" });
  });

  it("delegates to listAdminGrants with the right filters and page", async ({
    expect,
  }) => {
    const { repo, service } = setupService();
    await service.listGrants(
      {
        grantedBy: "admin-1",
        page: 2,
        planKey: "LITE",
        userId: "user-1",
      },
      "admin-1"
    );
    expect(repo.listAdminGrants).toHaveBeenCalledWith({
      grantedBy: "admin-1",
      page: 2,
      planKey: "LITE",
      userId: "user-1",
    });
  });

  it("returns the paginated result with no side effects", async ({
    expect,
  }) => {
    const { repo, service } = setupService();
    repo.listAdminGrants.mockResolvedValue(EMPTY_ADMIN_GRANT_LIST);
    const result = await service.listGrants({ page: 1 }, "admin-1");
    expect(result).toBe(EMPTY_ADMIN_GRANT_LIST);
    expect(repo.findActiveAdminGrantsForUser).not.toHaveBeenCalled();
  });
});
```

Add `import type { GrantPlanInput, ListGrantsInput } from "$lib/schemas/plan";` at the top of the test file.

### Step 9.6: Run the test files

```sh
pnpm run test:unit -- --run src/lib/server/services/plan/plan.service.test.ts
pnpm run test:unit -- --run src/lib/server/services/plan/plan.guard.test.ts
pnpm run test:unit -- --run src/lib/server/services/plan/plan.lifecycle.test.ts
```

All three files must pass. The new `grantPlan` / `listGrants` describes add 12 tests across the two service test files.

### Step 9.7: Add the L1 derivation tests (optional but recommended)

Create `src/lib/server/services/plan/plan.derivation.test.ts` (or append to `plan.lifecycle.test.ts`):

```typescript
/* oxlint-disable typescript/no-non-null-assertion */
import { describe, it } from "vitest";

import { PlanGuard } from "./plan.guard.ts";
import { PlanService } from "./plan.service.ts";
import { PlanTestEnv } from "./plan.testing.ts";
import { UserDrizzleRepository } from "../user/user.repository.drizzle.ts";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const createStubService = (env: PlanTestEnv) =>
  new PlanService(
    env.repo,
    new PlanGuard(env.repo, new UserDrizzleRepository()),
    { createQris: (() => {}) as never } as never
  );

describe.concurrent("PlanService.applyDerivedPlan L1 union", () => {
  it("paid order PLUS 1m then admin grant LITE 1m at later appliedAt", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    const service = createStubService(env);
    const now = Date.now();
    await env.repo.insertOrder({
      appliedAt: new Date(now - MONTH_MS),
      createdAt: new Date(now - MONTH_MS),
      durationMonths: 1,
      expiresAt: null,
      grossAmount: 50_000,
      id: "ord_plus",
      planKey: "PLUS",
      sku: "plus-1m",
      status: "PAID",
      updatedAt: new Date(now - MONTH_MS),
      userId: env.ownerId,
    });
    await env.seedAdminGrant({
      durationMonths: 1,
      expiresAt: new Date(now + 2 * MONTH_MS),
      grantedAt: new Date(),
      grantedBy: "admin-1",
      id: "agr_lite",
      planKey: "LITE",
      startedAt: new Date(now - 1000),
      userId: env.ownerId,
    });
    // Trigger derivation via grantPlan
    await service.grantPlan(
      {
        durationMonths: 1,
        planKey: "LITE",
        userId: env.ownerId,
      },
      "admin-1"
    );
    const plan = await env.repo.findActiveUserPlan(env.ownerId, now);
    // L1: the LITE grant extends the active PLUS plan, never silently skipped
    expect(plan?.planKey).toBe("PLUS");
    expect(plan!.expiresAt.getTime()).toBeGreaterThan(now + MONTH_MS);
  });

  it("paid order PREMIUM 1m then admin grant LITE 1m at later appliedAt — LITE not skipped", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    const service = createStubService(env);
    const now = Date.now();
    await env.repo.insertOrder({
      appliedAt: new Date(now - MONTH_MS),
      createdAt: new Date(now - MONTH_MS),
      durationMonths: 1,
      expiresAt: null,
      grossAmount: 100_000,
      id: "ord_prem",
      planKey: "PREMIUM",
      sku: "premium-1m",
      status: "PAID",
      updatedAt: new Date(now - MONTH_MS),
      userId: env.ownerId,
    });
    await env.seedAdminGrant({
      durationMonths: 1,
      expiresAt: new Date(now + 2 * MONTH_MS),
      grantedAt: new Date(),
      grantedBy: "admin-1",
      id: "agr_lite2",
      planKey: "LITE",
      startedAt: new Date(now - 1000),
      userId: env.ownerId,
    });
    await service.grantPlan(
      { durationMonths: 1, planKey: "LITE", userId: env.ownerId },
      "admin-1"
    );
    const plan = await env.repo.findActiveUserPlan(env.ownerId, now);
    expect(plan?.planKey).toBe("PREMIUM");
    expect(plan!.expiresAt.getTime()).toBeGreaterThan(now + MONTH_MS);
  });

  it("admin grant PLUS 1m then paid order LITE 1m at later appliedAt", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    const service = createStubService(env);
    const now = Date.now();
    await env.seedAdminGrant({
      durationMonths: 1,
      expiresAt: new Date(now + 2 * MONTH_MS),
      grantedAt: new Date(),
      grantedBy: "admin-1",
      id: "agr_plus",
      planKey: "PLUS",
      startedAt: new Date(now - MONTH_MS),
      userId: env.ownerId,
    });
    await env.seedOrder({
      appliedAt: new Date(now - 1000),
      durationMonths: 1,
      id: "ord_lite",
      planKey: "LITE",
      status: "PAID",
      userId: env.ownerId,
    });
    await service.grantPlan(
      { durationMonths: 1, planKey: "PLUS", userId: env.ownerId },
      "admin-1"
    );
    const plan = await env.repo.findActiveUserPlan(env.ownerId, now);
    expect(plan?.planKey).toBe("PLUS");
  });

  it("only admin grant, no paid orders", async ({ expect }) => {
    await using env = new PlanTestEnv();
    const service = createStubService(env);
    await service.grantPlan(
      { durationMonths: 1, planKey: "PLUS", userId: env.ownerId },
      "admin-1"
    );
    const plan = await env.repo.findActiveUserPlan(env.ownerId, Date.now());
    expect(plan?.planKey).toBe("PLUS");
  });

  it("expired grant is ignored regardless of paid orders", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    const service = createStubService(env);
    const now = Date.now();
    await env.seedAdminGrant({
      durationMonths: 1,
      expiresAt: new Date(now - MONTH_MS),
      grantedAt: new Date(now - 2 * MONTH_MS),
      grantedBy: "admin-1",
      id: "agr_old",
      planKey: "PREMIUM",
      startedAt: new Date(now - 2 * MONTH_MS),
      userId: env.ownerId,
    });
    await env.seedOrder({
      appliedAt: new Date(now - 1000),
      durationMonths: 1,
      id: "ord_lite2",
      planKey: "LITE",
      status: "PAID",
      userId: env.ownerId,
    });
    await service.grantPlan(
      { durationMonths: 1, planKey: "PREMIUM", userId: env.ownerId },
      "admin-1"
    );
    const plan = await env.repo.findActiveUserPlan(env.ownerId, now);
    // LITE paid order is current; the expired PREMIUM grant does not contribute
    expect(plan?.planKey).toBe("LITE");
  });
});
```

The `MidtransClient` stub `{ createQris: (() => {}) as never } as never` is a safe placeholder because the `grantPlan` test path never calls `createQris`. If `createStubService` complains, mirror the `createStubMidtrans` from `plan.lifecycle.test.ts:31-32` instead.

---

## Task 10: Wire the new dependencies in `index.ts`

**Files:**

- Modify: `src/lib/server/services/plan/index.ts`

> **Read first:** ticket #25's "`assertUserExistsOrNotFound`" sub-decision: "`PlanGuard` takes `(planRepo, userRepo)`".

### Step 10.1: Update the wiring

```typescript
import { midtrans } from "../../infras/midtrans/index.ts";
import { userRepo } from "../user/index.ts";
import { PlanGuard } from "./plan.guard.ts";
import { PlanDrizzleRepository } from "./plan.repository.drizzle.ts";
import { PlanService } from "./plan.service.ts";

const planRepo = new PlanDrizzleRepository();
export const planGuard = new PlanGuard(planRepo, userRepo);
export const planService = new PlanService(planRepo, planGuard, midtrans);

// eslint-disable-next-line promise-function-async
export const lookupAiLimitPlan = (userId: string) =>
  planService.getAiLimitPlanForUser(userId);

midtrans.on("webhook:received", (body) => {
  void planService.handleWebhook(body);
});
```

### Step 10.2: Verify

```sh
pnpm run check
pnpm run test:unit -- --run src/lib/server/services/plan/
```

---

## Task 11: Create the command and query files

**Files:**

- Create: `src/lib/server/services/plan/commands/plan.admin.grant-plan.ts`
- Create: `src/lib/server/services/plan/queries/plan.admin.list-grants.ts`

> **Read first:** ticket #26's "Router shape", "Procedure base", "Handler signature", and "Error maps" sub-decisions. Mirror `src/lib/server/services/study-set/commands/study-set.admin-cleanup-visits.ts` (the precedent) and `src/lib/server/services/plan/queries/plan.list-orders.ts` (for the list-with-pagination input/output pairing).

### Step 11.1: Create the command

`src/lib/server/services/plan/commands/plan.admin.grant-plan.ts`:

```typescript
import { grantPlanInputSchema, grantPlanOutputSchema } from "$lib/schemas/plan";
import { adminProcedure } from "$lib/server/api/base";

import { planService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
  NOT_FOUND: { message: "User not found" },
} as const;

export const planAdminGrantPlan = adminProcedure
  .errors(ERRORS)
  .input(grantPlanInputSchema)
  .output(grantPlanOutputSchema)
  .handler(
    async ({ input, context }) =>
      await planService.grantPlan(input, context.user.id)
  );
```

### Step 11.2: Create the query

`src/lib/server/services/plan/queries/plan.admin.list-grants.ts`:

```typescript
import {
  listGrantsInputSchema,
  listGrantsOutputSchema,
} from "$lib/schemas/plan";
import { adminProcedure } from "$lib/server/api/base";

import { planService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
} as const;

export const planAdminListGrants = adminProcedure
  .errors(ERRORS)
  .input(listGrantsInputSchema)
  .output(listGrantsOutputSchema)
  .handler(
    async ({ input, context }) =>
      await planService.listGrants(input, context.user.id)
  );
```

### Step 11.3: Verify

```sh
pnpm run check
```

---

## Task 12: Register the `admin` subrouter

**Files:**

- Modify: `src/lib/server/services/plan/plan.router.ts`

> **Read first:** ticket #26's "Router shape" sub-decision. The `studySetRouter` (`study-set/study-set.router.ts:11-25`) is the exact precedent.

### Step 12.1: Update the router

```typescript
import { planAdminGrantPlan } from "./commands/plan.admin.grant-plan.ts";
import { planCheckout } from "./commands/plan.checkout.ts";
import { planAdminListGrants } from "./queries/plan.admin.list-grants.ts";
import { planGetAiLimit } from "./queries/plan.get-ai-limit.ts";
import { planGetOrder } from "./queries/plan.get-order.ts";
import { planListOrders } from "./queries/plan.list-orders.ts";
import { planListPlans } from "./queries/plan.list-plans.ts";

export const planRouter = {
  admin: {
    grantPlan: planAdminGrantPlan,
    listGrants: planAdminListGrants,
  },
  checkout: planCheckout,
  getAiLimit: planGetAiLimit,
  getOrder: planGetOrder,
  listOrders: planListOrders,
  listPlans: planListPlans,
};

export type PlanRouter = typeof planRouter;
```

### Step 12.2: Verify

```sh
pnpm run check
pnpm run test:unit -- --run src/lib/server/services/plan/
```

No router-level tests are required (`AGENTS.md` does not mandate them, and the service/guard/repository tests already cover the logic).

---

## Task 13: Update SPECS.md

**Files:**

- Modify: `src/lib/server/services/plan/SPECS.md`

> **Read first:** ticket #26's "SPECS.md update" sub-decision. The spec is the contract downstream consumers read first; keep the new section structurally identical to the existing `UserPlan` / `Order` / `Payment` blocks.

### Step 13.1: Add the `AdminGrant` entity

After the `Payment` block in the "Entities" section, add:

````markdown
```typescript
interface AdminGrant {
  id: string; // agr_*
  userId: string; // → user.id
  planKey: "LITE" | "PLUS" | "PREMIUM";
  durationMonths: number; // 1-24
  startedAt: Date;
  expiresAt: Date;
  grantedBy: string | null; // → user.id; null when the granting admin is later deleted
  grantedAt: Date;
  note: string | null; // optional, max 500 chars
}
```
````

### Step 13.2: Add the field rule

In the "Field Rules" section, append:

```markdown
- Admin-grant ids are server-generated using `generateId("agr_")`.
- `AdminGrant.durationMonths` is any integer in `[1, 24]`; range is enforced at the application layer (valibot), not at the DB layer.
- `AdminGrant.expiresAt` is computed at write time as `startedAt + durationMonths * MONTH_MS`.
- `AdminGrant.note` is optional free-text, max 500 characters (validated at the application layer).
- `AdminGrant.grantedBy` is nullable; it is set to `NULL` on `ON DELETE SET NULL` to preserve audit history when the granting admin is later removed.
```

### Step 13.3: Add Lifecycle Rule 7

In the "Lifecycle Rules" section, append:

```markdown
7. **Admin grants are union-append.** An active admin grant adds entitlement; it never cuts short an existing paid plan and is never silently skipped on tier mismatch. See "Admin → Lifecycle integration" below.
```

### Step 13.4: Add the "Admin" section after "Queries"

````markdown
## Admin

Admins (role `admin`) can grant a plan to any user without going through the Midtrans payment flow. Revocation is deferred to a future map.

### AdminGrant

See "Entities → AdminGrant" and "Persistence → admin_grant" above for the full row shape. There is no order row and no payment row for an admin grant — the audit trail is the `admin_grant` row alone (`grantedBy`, `grantedAt`, optional `note`).

### admin.grantPlan

```typescript
interface GrantPlanInput {
  userId: string;
  planKey: "LITE" | "PLUS" | "PREMIUM";
  durationMonths: number; // 1-24
  note?: string; // optional, max 500 chars
}
```
````

- Requires `adminProcedure` (role-gated).
- Target user must exist (`NOT_FOUND` otherwise). Banned users and self-grant are allowed.
- Writes an `admin_grant` row, then re-derives the target user's `user_plan` immediately.
- Returns the inserted `AdminGrant` row.
- Errors: `FORBIDDEN` (caller is not admin), `NOT_FOUND` (target user does not exist).

### admin.listGrants

```typescript
interface ListGrantsInput {
  userId?: string;
  grantedBy?: string;
  planKey?: "LITE" | "PLUS" | "PREMIUM";
  page?: number; // default 1
}
```

- Requires `adminProcedure` (role-gated).
- Returns paginated grants, hard-coded `grantedAt desc` sort (no client sort input).
- Pagination: 20 per page. No `status` filter (deferred to the revoke map).
- Errors: `FORBIDDEN` (caller is not admin).

### Lifecycle integration

Admin grants participate in `applyDerivedPlan` alongside paid orders. The combined list is sorted by `appliedAt asc` and fed to the existing `deriveUserPlan` function with an `alwaysApply: true` flag on grant rows. The L1 invariant is enforced inside `deriveUserPlan` — grants are never silently skipped on tier mismatch.

````

### Step 13.5: Update "Authorization"

Replace the bullet list with:

```markdown
- `checkout`, `listOrders`, `getOrder`, and `getAiLimitPlanForUser` require authentication.
- `admin.grantPlan` and `admin.listGrants` require `adminProcedure` (role-gated).
- `listPlans` is public.
- `handleWebhook` is server-side only; signature verification is performed by `MidtransClient` before the event reaches the plan domain.
````

### Step 13.6: Update "Persistence"

Add to the "Persistence" section:

```markdown
- `admin_grant` table: `id`, `userId`, `planKey`, `durationMonths`, `startedAt`, `expiresAt`, `grantedBy`, `grantedAt`, `note`.
  - `userId` references `user.id` with `onDelete: "cascade"`.
  - `grantedBy` references `user.id` with `onDelete: "set null"`.
  - Index on `(userId, expiresAt)` (for `findActiveAdminGrantsForUser`).
  - Index on `(grantedBy, grantedAt)` (for the list filter and default sort).
  - No `revokedAt` / `revokedBy` columns — revoke is deferred.
```

### Step 13.7: Update "Validation"

Add:

```markdown
- `durationMonths` (admin grant): integer in `[1, 24]`, enforced at the application layer.
- `note` (admin grant): optional string, max 500 characters.
```

### Step 13.8: Update "Errors"

Add:

```markdown
- `FORBIDDEN`: caller is not an admin (raised by `adminProcedure`).
- `NOT_FOUND`: target user does not exist (raised by `assertUserExistsOrNotFound`).
```

### Step 13.9: Update "Deferred / Out Of Scope"

Add:

```markdown
- `admin.revokeGrant` and lifetime grants.
- Audit/log retention rules specific to `admin_grant`.
- Notification to the user when granted a plan.
```

### Step 13.10: Verify

```sh
pnpm run check
```

The spec file is markdown, so `check` only confirms it is not corrupted.

---

## Task 14: Final verification

> Run all four project gates in order. A non-zero exit on any of them is a blocker.

```sh
pnpm run format
pnpm run lint:agent
pnpm run check
pnpm run test:unit -- --run src/lib/server/services/plan/ src/lib/server/services/user/
```

Expected:

- `format` rewrites any whitespace; no errors.
- `lint:agent` reports no issues (treat any new `oxlint` finding as a blocker).
- `check` returns 0 from `svelte-check`.
- `test:unit` passes for the plan and user service trees (no other services were touched). The narrow scope keeps the run under 30 seconds.

### Cross-checks

- `pnpm run test:unit -- --run src/lib/server/services/study-set/` — sanity check, the precedent admin command must still pass.
- `sqlite3 .data/data.db "select count(*) from admin_grant;"` — non-zero after Task 6's integration tests run against the in-memory DB is expected; the dev DB is independent.

### Commit

Stage only the files this plan creates or modifies (no unrelated changes), then commit with a message that follows the repo's conventional style. Per project `AGENTS.md` the user drives the commit — do not commit without an explicit request.

Suggested subject (one of):

```
feat(plan): add admin.grantPlan and admin.listGrants procedures

- add admin_grant table with (userId, expiresAt) and (grantedBy, grantedAt) indexes
- add PlanGuard.requireAdmin and assertUserExistsOrNotFound
- update applyDerivedPlan to union active grants with paid orders (L1)
- add UserRepository for cross-domain user lookups
- update SPECS.md with the Admin section, rule 7, and persistence details
```

---

## Definition of done

- [ ] `admin_grant` table exists in the Drizzle schema and a generated migration has been applied to the dev DB.
- [ ] `PlanRepository` interface has `insertAdminGrant`, `findActiveAdminGrantsForUser`, `listAdminGrants`; `PlanDrizzleRepository` implements them with the `INTERNAL_SERVER_ERROR` wrapper.
- [ ] Drizzle integration tests pass (9 new tests in `plan.repository.drizzle.test.ts`).
- [ ] `UserRepository` (interface + Drizzle impl) exists at `src/lib/server/services/user/`.
- [ ] `PlanGuard.requireAdmin` throws `FORBIDDEN` on null/undefined; `assertUserExistsOrNotFound` returns the user or throws `NOT_FOUND`. Both have unit tests.
- [ ] `PlanService.grantPlan` and `listGrants` exist, follow the existing service pattern, take `adminId` as the last argument typed `string | null | undefined`. They have unit tests.
- [ ] `applyDerivedPlan` unions active grants with paid orders and runs the derivation once. The L1 "never skip grants" invariant is enforced via the `alwaysApply` branch in `deriveUserPlan`. Derivation tests cover the L1 invariants.
- [ ] `planRouter.admin.grantPlan` and `planRouter.admin.listGrants` are exposed and importable. `adminProcedure` enforces the role at the procedure layer; `requireAdmin` is defense in depth.
- [ ] `SPECS.md` documents the feature end-to-end: `AdminGrant` entity, `admin.grantPlan` and `admin.listGrants` contracts, L1 lifecycle integration, persistence, validation, errors, and the deferred list.
- [ ] `pnpm run format`, `pnpm run lint:agent`, `pnpm run check` all clean.
- [ ] `pnpm run test:unit` passes for the plan and user service trees (narrow scope).
