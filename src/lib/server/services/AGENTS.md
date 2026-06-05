# Services

The `src/lib/server/services/<domain>/` package is the source of truth for a service domain. The `study-set` package is the reference implementation — mirror its layout, naming, and responsibilities when adding or refactoring a service.

## Layout

```
src/lib/server/services/<domain>/
├── SPECS.md                          # domain specs, entity, field rules, error codes
├── index.ts                          # wires default repo + guard + service instances (singleton entrypoint)
├── <domain>.service.ts               # <Domain>Service class (no singleton, no default constructor)
├── <domain>.service.test.ts          # service tests with mocked repo + guard
├── <domain>.guard.ts                 # <Domain>Guard class (no singleton, no default constructor)
├── <domain>.guard.test.ts            # guard tests with mocked repo
├── <domain>.repository.ts            # <Domain>Repository interface + shared result types
├── <domain>.repository.drizzle.ts    # <Domain>DrizzleRepository implementation (no singleton)
├── <domain>.repository.drizzle.test.ts  # integration tests against a real (in-memory) DB
├── <domain>.testing.ts               # mock factories, fixtures, <Domain>TestEnv
├── <domain>.router.ts                # composes commands + queries into a router object
├── commands/
│   ├── <domain>.<action>.ts          # one file per command (create, update, delete, ...)
│   └── ...
└── queries/
    ├── <domain>.<action>.ts          # one file per query (get, list, get-recent, ...)
    └── ...
```

SCREAMING_SNAKE constants live next to the schemas (shared between server and client):

```
src/lib/schemas/
├── <domain>.ts                       # input/output schemas + inferred types
└── <domain>.constant.ts              # SCREAMING_SNAKE constants
```

Schemas live next to the SvelteKit routes types, not inside the service:

```
src/lib/schemas/<domain>.ts
```

DB schema lives with the rest of the persistence code:

```
src/lib/server/infras/db/schema/<domain>.ts
```

## Layers and Responsibilities

A service is three layers stacked on top of an oRPC router:

```
router (commands/, queries/)  →  service  →  guard + repository
                                │
                                └─ throws ORPCError for the router to surface
```

- **Router / command / query** — thin oRPC handlers. They declare the input/output schemas, the error map, and delegate to the service. No business logic, no DB access, no auth checks.
- **Service** — orchestrates the operation: calls the guard, calls the repository, transforms inputs into repository calls, maps repository results (including `null`/empty) into domain errors.
- **Guard** — owns all authorization and visibility rules. Throws `ORPCError('UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND')`.
- **Repository** — pure persistence. Knows about Drizzle and SQL. Never throws domain errors; returns `null` / `false` / empty when a row is missing.

The service is the only place that decides which guard checks to run and which repository calls to make. The guard and repository are unaware of each other.

## Singleton Wiring

The default `*Guard` and `*Service` instances are constructed in `<domain>/index.ts`, NOT in the class files. The class files (`<domain>.service.ts`, `<domain>.guard.ts`, `<domain>.repository.drizzle.ts`) export classes only — no singletons, no `export const <domain>...` lines. Class constructors do NOT have default parameter values for the repo or guard; the wiring in `index.ts` always passes them explicitly. Cross-domain imports (e.g. `quiz` depending on `chapterGuard`) go through sibling `index.ts` files, not through the guard class files.

```ts
// <domain>/index.ts
import { <Domain>DrizzleRepository } from './<domain>.repository.drizzle.ts';
import { <Domain>Guard } from './<domain>.guard.ts';
import { <Domain>Service } from './<domain>.service.ts';

const <domain>Repo = new <Domain>DrizzleRepository();
export const <domain>Guard = new <Domain>Guard(<domain>Repo);
export const <domain>Service = new <Domain>Service(<domain>Repo, <domain>Guard);
```

For domains that depend on other domain guards, the dependent guard is passed through the same `index.ts` entrypoint:

```ts
// chapter/index.ts
import { <Domain>DrizzleRepository } from './<domain>.repository.drizzle.ts';
import { <Domain>Guard } from './<domain>.guard.ts';
import { <Domain>Service } from './<domain>.service.ts';
import { studySetGuard } from '../study-set/index.ts';

const <domain>Repo = new <Domain>DrizzleRepository();
export const <domain>Guard = new <Domain>Guard(<domain>Repo, studySetGuard);
export const <domain>Service = new <Domain>Service(<domain>Repo, <domain>Guard);
```

Consumer files (commands, queries) import the service from `'../index'`, never from `'../<domain>.service'`.

## Naming

| Kind                     | Pattern                       | Example                                        |
| ------------------------ | ----------------------------- | ---------------------------------------------- |
| Service class            | `<Domain>Service`             | `StudySetService`                              |
| Default service instance | `<domain>Service` (camelCase) | `studySetService`                              |
| Guard class              | `<Domain>Guard`               | `StudySetGuard`                                |
| Default guard instance   | `<domain>Guard`               | `studySetGuard`                                |
| Repository interface     | `<Domain>Repository`          | `StudySetRepository`                           |
| Drizzle impl             | `<Domain>DrizzleRepository`   | `StudySetDrizzleRepository`                    |
| Router object            | `<domain>Router`              | `studySetRouter`                               |
| Router type              | `typeof <domain>Router`       | `StudySetRouter`                               |
| Command                  | `<domain><Action>`            | `studySetCreate`, `studySetAdminCleanupVisits` |
| Query                    | `<domain><Action>`            | `studySetGet`, `studySetGetRecent`             |
| Constant                 | `<DOMAIN>_*`                  | `STUDY_SET_TITLE_MIN_LENGTH`                   |
| Valibot schema           | `camelCase...Schema`          | `createStudySetInputSchema`, `studySetSchema`  |
| Inferred input type      | `<Action><Domain>Input`       | `CreateStudySetInput`                          |

## Service Class

```ts
// <domain>.service.ts
import { ORPCError } from '@orpc/server';
import type { <Domain> } from '../../infras/db/schema/<domain>.ts';
import type {
    Create<Domain>Input,
    Delete<Domain>Input,
    Get<Domain>Input,
    Get<Domain>sInput,
    Update<Domain>Input
} from '../../../schemas/<domain>.ts';
import { <DOMAIN>_DEFAULT_VISIBILITY } from '$lib/schemas/<domain>.constant';
import type { <Domain>ListResult, <Domain>Repository } from './<domain>.repository.ts';
import type { <Domain>Guard } from './<domain>.guard.ts';

export type { <Domain> };

export class <Domain>Service {
    private readonly guard: <Domain>Guard;

    constructor(
        private readonly repo: <Domain>Repository,
        guard: <Domain>Guard
    ) {
        this.guard = guard;
    }

    async create<Domain>(input: Create<Domain>Input, ownerId: string | null | undefined): Promise<<Domain>> {
        const owner = this.guard.requireOwner(ownerId);
        // ...domain-specific orchestration (slug generation, defaults, etc.)
        return this.repo.insert<Domain>({ /* ... */ });
    }
    // ...other methods
}
```

Rules:

- The class accepts `repo` and `guard` as constructor parameters. Defaults are not provided — the singleton wiring in `index.ts` always passes them explicitly. Tests construct with mocks via `new <Domain>Service(mockRepo, mockGuard)`.
- Every public method takes the auth subject (`ownerId` / `userId`) as its **last** argument, typed `string | null | undefined`. The service does not read from `context`; the router passes it in.
- Public methods return the domain entity (or a small `{ count, visitedAt, success }` shape). Never the repository row when they differ.
- Throws `ORPCError` for domain errors. Never throws raw `Error` from a service method (use guard/repository abstractions).
- The default instance is exported from `./index.ts`, NOT from this file. Do not add `export const <domain>Service` here.

## Guard

```ts
// <domain>.guard.ts
import { ORPCError } from '@orpc/server';
import type { <Domain>Repository } from './<domain>.repository.ts';

export class <Domain>Guard {
    constructor(private readonly repo: <Domain>Repository) {}

    requireOwner(ownerId: string | null | undefined): string {
        if (!ownerId) throw new ORPCError('UNAUTHORIZED', { message: 'Authentication is required' });
        return ownerId;
    }

    async assertOwnerOrForbidden(id: string, ownerId: string): Promise<<Domain>> {
        const row = await this.repo.find<Domain>ById(id);
        if (!row || row.ownerId !== ownerId) {
            throw new ORPCError('FORBIDDEN', { message: 'Cannot modify a <domain> you do not own' });
        }
        return row;
    }

    async assertVisibleByIdOrNotFound(id: string, userId: string): Promise<<Domain>> { /* ... */ }
    // canView(...) is exposed for places that need the boolean instead of an ORPCError
}
```

For cross-domain guards, the dependent guard is a required constructor parameter (no default):

```ts
// <domain>.guard.ts (for a guard that depends on a sibling domain)
import { ORPCError } from '@orpc/server';
import type { <Domain>Repository } from './<domain>.repository.ts';
import type <SiblingDomain>Guard from '../<sibling-domain>/<sibling-domain>.guard.ts';

export class <Domain>Guard {
    constructor(
        private readonly repo: <Domain>Repository,
        private readonly <siblingDomain>Guard: <SiblingDomain>Guard
    ) {}

    // ... methods
}
```

Rules:

- All `require*` methods take `string | null | undefined` and throw `UNAUTHORIZED` when falsy. They return the narrowed `string` so the service can use it without a re-check.
- `assert*OrForbidden` and `assert*OrNotFound` return the fetched row. The service reuses it instead of refetching.
- Visibility checks return `NOT_FOUND` (not `FORBIDDEN`) when the caller is not allowed to see the row — prevents leaking existence.
- `canView(set, userId)` is exposed as a plain boolean for places (typically the repository) that need to filter without throwing.
- Guard depends only on the repository interface, never on the Drizzle impl directly. The constructor takes the repo (and any sibling-domain guards it needs) as required parameters — no defaults. Singleton wiring in `index.ts` provides them.
- The default instance is exported from `./index.ts`, NOT from this file. Do not add `export const <domain>Guard` here.

## Repository

```ts
// <domain>.repository.ts
import type { <Domain> } from '../../infras/db/schema/<domain>.ts';

export interface <Domain>ListPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface <Domain>ListResult {
    data: <Domain>[];
    pagination: <Domain>ListPagination;
}

export type <Domain>UpdatePatch = Partial<Pick<<Domain>, 'title' | 'visibility' | 'updatedAt'>>;

export interface <Domain>Repository {
    insert<Domain>(row: Omit<<Domain>, 'createdAt' | 'updatedAt'>): Promise<<Domain>>;
    update<Domain>(id: string, ownerId: string, patch: <Domain>UpdatePatch): Promise<<Domain> | null>;
    delete<Domain>(id: string, ownerId: string): Promise<boolean>;
    find<Domain>ById(id: string): Promise<<Domain> | null>;
    findOwned<Domain>s(ownerId: string, orderBy: 'createdAt' | 'updatedAt', orderDirection: 'asc' | 'desc', page: number): Promise<<Domain>ListResult>;
}
```

```ts
// <domain>.repository.drizzle.ts
import { db as defaultDb, type DB } from '../../infras/db/client.ts';
import { <domain> } from '../../infras/db/schema/<domain>.ts';
import type { <Domain> } from '../../infras/db/schema/<domain>.ts';
import { <DOMAIN>_PAGE_LIMIT } from '$lib/schemas/<domain>.constant';
import type { <Domain>ListResult, <Domain>Repository } from './<domain>.repository.ts';

export class <Domain>DrizzleRepository implements <Domain>Repository {
    constructor(private readonly dbInstance: DB = defaultDb) {}

    static withDatabase(db: DB): <Domain>DrizzleRepository {
        return new <Domain>DrizzleRepository(db);
    }

    async insert<Domain>(row: Omit<<Domain>, 'createdAt' | 'updatedAt'>): Promise<<Domain>> {
        const [created] = await this.dbInstance.insert(<domain>).values(row).returning();
        if (!created) throw new Error('Failed to insert <domain>'); // dev-time safety net
        return created;
    }
    // ...other methods
}
```

Rules:

- The interface is the source of truth for what the service can ask for. Add a method here first, then implement it in the Drizzle class.
- Methods that "find by unique key" return `Promise<T | null>`. Methods that "mutate a known id" return `Promise<T | null>` for updates and `Promise<boolean>` for deletes so the service can map `null`/`false` to `NOT_FOUND`.
- Mutating methods that need to enforce ownership take `ownerId` as a parameter and include it in the `WHERE` clause. The service is the only caller, and it always passes the already-authorized id.
- Drizzle impl constructor takes a `DB` and defaults to the module-level `db`. `static withDatabase(db)` is a convenience for tests. (`dbInstance = defaultDb` is infrastructure, not domain wiring, so it stays.)
- The Drizzle impl never throws `ORPCError`; if `returning()` is empty after an `insert`, throw a plain `Error` — that case is a bug, not a domain error.
- No singleton is exported from this file. The default instance is constructed in `./index.ts` (and stays as a non-exported local `const` there).

## Constants

```ts
// <domain>.constant.ts  →  moved to src/lib/schemas/<domain>.constant.ts
export const <DOMAIN>_TITLE_MIN_LENGTH = 5;
export const <DOMAIN>_TITLE_MAX_LENGTH = 50;
export const <DOMAIN>_PAGE_LIMIT = 10;
export const <DOMAIN>_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;
export const <DOMAIN>_DEFAULT_VISIBILITY = 'PUBLIC' as const;
```

Rules:

- Constants live in `src/lib/schemas/<domain>.constant.ts` (next to the schema file), NOT inside the service. The schemas package is shared between server and client, so constants must be importable from client-side code.
- One file per domain. No default exports.
- Naming: `<DOMAIN>_*` (the domain prefix is the same `<DOMAIN>` as the service, uppercased).
- `as const` on every array and literal so schemas can derive picklists from them.
- Anything that is also a schema constraint (lengths, limits, picklists) lives here and is imported by `src/lib/schemas/<domain>.ts`. Service and schemas share the same numbers.
- Services, repositories, and tests import constants via the `$lib/schemas/<domain>.constant` alias.

## Schemas

```ts
// src/lib/schemas/<domain>.ts
import * as v from 'valibot';
import {
    <DOMAIN>_DESCRIPTION_MAX_LENGTH,
    <DOMAIN>_TITLE_MAX_LENGTH,
    <DOMAIN>_TITLE_MIN_LENGTH,
    <DOMAIN>_VISIBILITIES
} from './<domain>.constant.ts';

const trimmedTitleSchema = v.pipe(
    v.string(),
    v.trim(),
    v.minLength(<DOMAIN>_TITLE_MIN_LENGTH, 'Title must be at least 5 characters after trim'),
    v.maxLength(<DOMAIN>_TITLE_MAX_LENGTH, 'Title must be at most 50 characters')
);

const visibilitySchema = v.picklist(<DOMAIN>_VISIBILITIES);
const uuidSchema = v.pipe(v.string(), v.uuid());

export const create<Domain>InputSchema = v.object({
    title: trimmedTitleSchema,
    description: v.optional(v.pipe(v.string(), v.maxLength(<DOMAIN>_DESCRIPTION_MAX_LENGTH))),
    visibility: v.optional(visibilitySchema)
});

export const <domain>Schema = v.object({
    id: v.string(),
    title: v.string(),
    visibility: visibilitySchema,
    ownerId: v.string(),
    createdAt: v.date(),
    updatedAt: v.date()
});

export type Create<Domain>Input = v.InferOutput<typeof create<Domain>InputSchema>;
```

Rules:

- Schemas live in `src/lib/schemas/`, **not** inside the service. They are imported by the router, by the service (only the inferred types), and by any client code that needs the same shapes.
- Build a small set of private schemas (`trimmedTitleSchema`, `uuidSchema`, `visibilitySchema`) and compose them into the public `*InputSchema` / `*Schema` exports.
- Reuse `<DOMAIN>_*` constants from the service's constant file. Never hardcode limits in schemas.
- Export both the schema and the inferred type. Input types end in `Input` (`Create<Domain>Input`); output types usually have no suffix or share the entity name (`<Domain>`).
- For `update` payloads, make every field optional and accept `null` on nullable fields so a client can explicitly clear them.

## Router, Commands, Queries

The router is a plain object that maps to oRPC procedure names. Each command and query is its own file exporting a single procedure.

```ts
// commands/<domain>.create.ts
import { authorizedProcedure } from '$lib/server/api/base';
import { create<Domain>InputSchema, <domain>Schema } from '$lib/schemas/<domain>';
import { <domain>Service } from '../index';

const ERRORS = {
    <DOMAIN>_SLUG_CONFLICT: { message: 'Failed to generate a unique slug after maximum retries' }
} as const;

export const <domain>Create = authorizedProcedure
    .errors(ERRORS)
    .input(create<Domain>InputSchema)
    .output(<domain>Schema)
    .handler(async ({ input, context }) => <domain>Service.create<Domain>(input, context.user.id));
```

```ts
// queries/<domain>.get.ts
import { authorizedProcedure } from '$lib/server/api/base';
import { get<Domain>InputSchema, <domain>Schema } from '$lib/schemas/<domain>';
import { <domain>Service } from '../index';

const ERRORS = { NOT_FOUND: { message: '<Domain> not found' } } as const;

export const <domain>Get = authorizedProcedure
    .errors(ERRORS)
    .input(get<Domain>InputSchema)
    .output(<domain>Schema)
    .handler(async ({ input, context }) => <domain>Service.get<Domain>(input, context.user.id));
```

```ts
// <domain>.router.ts
import { <domain>Create } from './commands/<domain>.create.ts';
import { <domain>Update } from './commands/<domain>.update.ts';
import { <domain>Delete } from './commands/<domain>.delete.ts';
import { <domain>List } from './queries/<domain>.list.ts';
import { <domain>Get } from './queries/<domain>.get.ts';

export const <domain>Router = {
    create: <domain>Create,
    update: <domain>Update,
    delete: <domain>Delete,
    list: <domain>List,
    get: <domain>Get
};

export type <Domain>Router = typeof <domain>Router;
```

Rules:

- Commands and queries import `<domain>Service` from `'../index'`, NOT from `'../<domain>.service'`. The class file does not export a singleton.
- Pick the procedure base on intent: `publicProcedure` (rare), `authorizedProcedure` (default for any caller), or `adminProcedure` (role-gated). The base lives in `$lib/server/api/base`.
- Always declare `.errors(ERRORS)` when the handler can throw an `ORPCError` with a non-default code. The keys in `ERRORS` are the codes; the messages become the default `ORPCError` message.
- The handler signature is always `({ input, context }) => <domain>Service.<method>(input, context.user.id)`. No try/catch, no logging, no transformation — the service already returns the exact output type.
- For `delete`, the service returns `void`; the handler wraps it as `{ success: true } as const` so clients get a stable response shape.
- Admin actions live in a nested `admin: { ... }` object on the router (e.g. `admin.cleanupVisits`). Sub-resources (e.g. `visit.refresh`) get their own nested object too.
- Files are named `<domain>.<action>.ts` (kebab-case action, no `command`/`query` infix). Filenames double as the procedure name: `study-set.refresh-visit.ts` → `studySetRefreshVisit`.

## Errors

- `UNAUTHORIZED` — missing auth (raised by the guard's `require*`).
- `FORBIDDEN` — authed but not the owner of the resource (raised by `assertOwnerOrForbidden`).
- `NOT_FOUND` — row missing or not visible (raised by `assertVisible*OrNotFound`, or by the service when a repo mutation returns `null`/`false`).
- Domain-specific codes (`<DOMAIN>_SLUG_CONFLICT`, etc.) — declared in each command's `ERRORS` map and raised by the service when a known business invariant fails.

Service methods translate repository outcomes into these errors:

```ts
const updated = await this.repo.update<Domain>(input.id, owner, patch);
if (!updated) throw new ORPCError('NOT_FOUND', { message: '<Domain> not found' });
```

`SlugConflictError` (and similar infrastructure errors) are caught in the service and re-thrown as the domain-specific code so the router's `ERRORS` map stays the single source of truth.

## Testing

Three test files per domain, plus a shared `*testing.ts`:

- `study-set.service.test.ts` — unit tests against a `new <Domain>Service(mockRepo, mockGuard)`. Every branch of every method, every error path.
- `study-set.guard.test.ts` — unit tests against `new <Domain>Guard(mockRepo)`. Auth and visibility rules.
- `study-set.repository.drizzle.test.ts` — integration tests against a real in-memory DB. Use the `<Domain>TestEnv` to set up users, seed rows, and clean up.

`<domain>.testing.ts` provides:

- `createMockRepository(): Mocked<Domain>Repository` — `vi.fn()` per method, derived from the repository interface via `MockedFunction`.
- `createMockGuard(): Mocked<Domain>Guard` — same trick for the guard.
- `create<Domain>Fixture(overrides)` — a fully-populated `<Domain>` with sensible defaults and `crypto.randomUUID()` ids.
- A constant like `EMPTY_<DOMAIN>_LIST` for the empty list result.
- `captureError(promise)` — awaits a promise and returns the thrown value (or `null`).
- `class <Domain>TestEnv implements AsyncDisposable` — wires up the testing DB, exposes `seedUser` / `seed<Domain>` helpers, and closes the DB in `[Symbol.asyncDispose]`.

Patterns:

- `describe.concurrent` at every level.
- Tests use the `it('...', async ({ expect }) => { ... })` form so each test gets its own `expect` from the test context — no top-level `import { expect }`.
- `setupService()` / `setupGuard()` factory at the top of the file configures the happy-path defaults on the mocks so individual tests only override the methods they care about. Push the failure helpers (`throwUnauthorized`, `throwNotFound`) to module scope.
- For each service method, test:
  1. `UNAUTHORIZED` propagation when `requireOwner`/`requireUser` fails.
  2. `FORBIDDEN` / `NOT_FOUND` propagation from the appropriate guard assertion.
  3. The happy path: the right repo call with the right args, and the right return value.
  4. Edge cases (empty patch on update, no rows found on delete, etc.).
- Drizzle tests use `await using env = new <Domain>TestEnv();` for explicit resource management — the DB closes at the end of the test even if assertions throw.
- Drizzle tests also cover schema constraints: unique-index violations, foreign-key violations, and boundary conditions on cutoff timestamps. They live in a second `describe.concurrent('<Domain>DrizzleRepository (schema constraints)', ...)` block.

## Adding a New Domain — Checklist

1. Write `SPECS.md` from the source spec(s) — entity, field rules, error codes, command/query contracts.
2. Add the Drizzle schema in `src/lib/server/infras/db/schema/<domain>.ts` and export the inferred types.
3. Add `src/lib/schemas/<domain>.ts` with input/output schemas, sharing constants with the service.
4. Add `src/lib/schemas/<domain>.constant.ts` for limits, picklists, defaults, and any TTLs.
5. Define `<domain>.repository.ts` (interface + shared result types).
6. Implement `<domain>.repository.drizzle.ts` (no singleton export).
7. Add `<domain>.guard.ts` with `require*` / `assert*OrForbidden` / `assert*OrNotFound` (no singleton export, no default constructor values).
8. Add `<domain>.service.ts` orchestrating the above (no singleton export, no default constructor values).
9. **Create `<domain>/index.ts`** that constructs the default repo + guard + service singletons and exports the guard and service. This is the only place the wiring lives.
10. Add `<domain>.testing.ts` with mock factories, fixture(s), `captureError`, and `<Domain>TestEnv`.
11. Add one command file per `commands/` action and one query file per `queries/` action, each declaring its `ERRORS` map, importing the service from `'../index'`, and delegating to the service.
12. Compose them into `<domain>.router.ts` (and nested objects for sub-resources / admin).
13. Write `*.test.ts` for the service, guard, and Drizzle repository.
14. Run the project's lint and typecheck commands; do not commit until both pass.
