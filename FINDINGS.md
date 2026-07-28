# UI Leak Audit: Non-Indonesian / RPC Messages

## Tracking

| Page / Component                     | Status  | Leak Type                               | Notes                                   |
| ------------------------------------ | ------- | --------------------------------------- | --------------------------------------- |
| `/` (landing)                        | checked | none                                    | All Indonesian                          |
| `/login`                             | checked | better-auth `error.message` passthrough | English auth errors leak                |
| `/sign-up`                           | checked | better-auth `error.message` passthrough | English auth errors leak                |
| `/onboarding`                        | checked | `error.message` passthrough             | English errors leak                     |
| `/home`                              | checked | `+error.svelte` fallback                | Fallback shows raw `page.error.message` |
| `/discover`                          | pending |                                         |                                         |
| `/profile`                           | checked | better-auth `error.message` passthrough | Name & password forms leak              |
| `/affiliate`                         | checked | `toast.error(error.message)`            | ORPC English messages leak              |
| `/study/new`                         | checked | `toast.error(error.message)`            | ORPC English messages leak              |
| `/study/generate`                    | checked | `toast.error(error.message)`            | ORPC English messages leak              |
| `/study/[id]/quiz/create`            | checked | `toast.error(error.message)`            | ORPC English messages leak              |
| `/study/[id]/quiz/edit`              | checked | `toast.error(error.message)`            | ORPC English messages leak              |
| `/study/[id]/flashcard/create`       | checked | `toast.error(error.message)`            | ORPC English messages leak              |
| `/study/[id]/waiting-room`           | pending |                                         |                                         |
| `/session/[id]/flashcard/[sid]`      | checked | `error.message` fallback                | English error leak                      |
| `/subs/plans`                        | checked | `error.message` in checkoutError        | ORPC English messages leak              |
| `/subs/checkout/[orderId]`           | pending |                                         |                                         |
| `/subs/usage`                        | pending |                                         |                                         |
| `/privacy`                           | pending |                                         |                                         |
| `/terms`                             | pending |                                         |                                         |
| `/refund`                            | pending |                                         |                                         |
| `/about`                             | pending |                                         |                                         |
| `error-page.svelte`                  | checked | raw `error.message` display             | Shows whatever is passed                |
| `login-form.svelte`                  | checked | `error.message` passthrough             | better-auth English                     |
| `sign-up-form.svelte`                | checked | `error.message` passthrough             | better-auth English                     |
| `profile-name-form.svelte`           | checked | `error.message` passthrough             | better-auth English                     |
| `profile-password-form.svelte`       | checked | `error.message` passthrough             | better-auth English                     |
| `create-quiz-form.ts`                | checked | `toast.error(error.message)`            | ORPC English                            |
| `new-session-form.ts`                | checked | `toast.error(error.message)`            | ORPC English                            |
| `create-apply-form.svelte.ts`        | checked | `toast.error(error.message)`            | ORPC English                            |
| `create-payout-form.svelte.ts`       | checked | `toast.error(error.message)`            | ORPC English                            |
| `delete-study-set-dialog.svelte`     | checked | `toast.error(error.message)`            | ORPC English                            |
| `update-study-set-dialog.svelte`     | checked | `toast.error(error.message)`            | ORPC English                            |
| `delete-flashcard-dialog.svelte`     | checked | `toast.error(error.message)`            | ORPC English                            |
| `edit-flashcard-dialog.svelte`       | checked | `toast.error(error.message)`            | ORPC English                            |
| `delete-quiz-dialog.svelte`          | checked | `toast.error(error.message)`            | ORPC English                            |
| `create-chapter-dialog.svelte`       | checked | `toast.error(error.message)`            | ORPC English                            |
| `dev-create-entity-dialog.svelte`    | checked | `toast.error(error.message)`            | ORPC English (dev-only)                 |
| `maintenance-action-card.svelte`     | checked | `error.message`                         | Admin-only                              |
| `user-table.svelte`                  | checked | `toast.error(error.message)`            | Admin-only                              |
| `affiliate-application-table.svelte` | checked | `toast.error(error.message)`            | Admin-only                              |
| `grant-plan-dialog.svelte`           | checked | `toast.error(error.message)`            | Admin-only                              |
| `(-11-) affiliate/payouts`           | checked | `toast.error(error.message)`            | Admin-only                              |

## Root Cause

Server throws `ORPCError` with English messages (e.g. "Study set not found", "Authentication is required").
Client catches and displays `error.message` directly via `toast.error()` or inline error state.
better-auth also returns English error messages that get passed through.

## Fix Strategy

1. Create `$lib/utils/error-messages.ts` — centralized ORPC error code → Indonesian message map
2. Create `getErrorMessage(error)` helper that resolves Indonesian message from error code
3. Replace all `toast.error(error.message)` → `toast.error(getErrorMessage(error))`
4. Fix auth forms to map better-auth English messages to Indonesian
5. Fix error page fallbacks
