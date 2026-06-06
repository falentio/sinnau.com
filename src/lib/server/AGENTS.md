---
## Description

This is server only module.
It act as guard to prevent all files and symbol under this directory for being sent to browser/client.
If something need to be sent to client, we should move that out from this directory.
Never call any <Domain>Service class instance on form/page load/layout load on sveltekit, we should call through $lib/orpc.ts client
---

# Docs

Copied from [`https://svelte.dev/docs/kit/server-only-modules/llms.txt`](server-only-modules)

## Contents

Like a good friend, SvelteKit keeps your secrets. When writing your backend and frontend in the same repository, it can be easy to accidentally import sensitive data into your front-end code (environment variables containing API keys, for example). SvelteKit provides a way to prevent this entirely: server-only modules.

## Private environment variables

The [`$env/static/private`]($env-static-private) and [`$env/dynamic/private`]($env-dynamic-private) modules can only be imported into modules that only run on the server, such as [`hooks.server.js`](hooks#Server-hooks) or [`+page.server.js`](routing#page-page.server.js).

## Server-only utilities

The [`$app/server`]($app-server) module, which contains a [`read`]($app-server#read) function for reading assets from the filesystem, can likewise only be imported by code that runs on the server.

## Your modules

You can make your own modules server-only in two ways:

- adding `.server` to the filename, e.g. `secrets.server.js`
- placing them in `$lib/server`, e.g. `$lib/server/secrets.js`

## How it works

Any time you have public-facing code that imports server-only code (whether directly or indirectly)...

```js
// @errors: 7005
/// file: $lib/server/secrets.js
export const atlantisCoordinates = [
  /* redacted */
];
```

```js
// @errors: 2307 7006 7005
/// file: src/routes/utils.js
export { atlantisCoordinates } from "$lib/server/secrets.js";

export const add = (a, b) => a + b;
```

```html
/// file: src/routes/+page.svelte
<script>
  import { add } from "./utils.js";
</script>
```

...SvelteKit will error:

```
Cannot import $lib/server/secrets.ts into code that runs in the browser, as this could leak sensitive information.

 src/routes/+page.svelte imports
  src/routes/utils.js imports
   $lib/server/secrets.ts

If you're only using the import as a type, change it to `import type`.
```

Even though the public-facing code — `src/routes/+page.svelte` — only uses the `add` export and not the secret `atlantisCoordinates` export, the secret code could end up in JavaScript that the browser downloads, and so the import chain is considered unsafe.

This feature also works with dynamic imports, even interpolated ones like ``await import(`./${foo}.js`)``.

> [!NOTE] Unit testing frameworks like Vitest do not distinguish between server-only and public-facing code. For this reason, illegal import detection is disabled when running tests, as determined by `process.env.TEST === 'true'`.

## Further reading

- [Tutorial: Environment variables](/tutorial/kit/env-static-private)

---

## Repository error handling

Every public method in a Drizzle repository implementation (`<domain>.repository.drizzle.ts`) **must** wrap its body in `try-catch` and translate unexpected errors into an oRPC error so the rest of the stack never sees raw driver/SQL exceptions.

Pattern (mandatory for every method):

```ts
import { ORPCError } from '@orpc/server';

async someMethod(...): Promise<T> {
    try {
        // existing body (dbInstance queries, transactions, etc.)
    } catch (err) {
        if (err instanceof ORPCError) throw err;
        throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'Internal server error' });
    }
}
```

Rules:

- `ORPCError` instances are re-thrown as-is so a domain error that bubbled up from a nested call keeps its original code/message.
- Any other thrown value (Drizzle/SQLite driver error, plain `Error`, `unknown`) is wrapped as `ORPCError('INTERNAL_SERVER_ERROR', { message: 'Internal server error' })`.
- Repository methods still return `null` / `false` / empty arrays for "row not found" outcomes. They do not throw `NOT_FOUND`. Domain `null → NOT_FOUND` mapping stays in the service.
- For methods that already use a sentinel `Error` to signal a non-DB outcome (e.g. `deleteQuizzes`, `deleteFlashcards`, `linkChapter`), the sentinel check stays above the `ORPCError` re-throw; only unrecognised errors become `INTERNAL_SERVER_ERROR`.
- The catch message is always the literal `'Internal server error'` — driver details must not leak to clients. Real error context belongs in server-side logs (out of scope for the repository).
- The `INTERNAL_SERVER_ERROR` catch branch is **not** required to be covered by tests. It is a defensive wrapper for unexpected driver/SQL exceptions and is exercised in production only. Do not add tests that mock the DB to throw a generic error just to assert the wrapper — keep test coverage focused on the happy path and on the documented `null` / `false` / empty outcomes.
