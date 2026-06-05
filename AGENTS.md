## Usefull docs

Try to fetch this docs if your work or task is related to some of these techs.
If you still have lack of information after get the docs, you should either use context7 or exa websearch.
But if you found `skills` for related techs, you should use that skills first, docs should take less priority than skills.

[`https://shadcn-svelte.com/llms.txt`](shadcn-svelte)
[`https://svelte.dev/docs/kit/llms.txt`](svelte-kit)
[`https://svelte.dev/docs/svelte/llms.txt`](svelte)
[`https://orpc.dev/llms.txt`](oprc)
[`https://better-auth.com/llms.txt`](better-auth)
[`https://better-auth.com/llms.txt/docs/integrations/svelte-kit.md`](better-auth-svelte)
[`https://valibot.dev/llms.txt`](valibot)

## Docs Retrieval Priority

This are ordered by most prioritized to least prioritized.

1. Svelte mcp (if it related to svelte)
2. Skills
3. Docs website on above, dont search by your self for other techs.
4. Context7 mcp for code docs, Exa websearch mcp for other.
5. node_modules, this is last resort, never search from node_modules before any of above approach.

node_modules should not be crawled unless other approach leave you with incomplete docs.

---

## Svelte Tooling

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

---

## Script

- use `pnpm run check` for typecheck all files
- use `pnpm run check:filter -- files` for typecheck with files filter
- use `pnpm run lint:agent` for linting
- use `rtk pnpm run test:unit` for testing without coverage
- use `rtk pnpm run test:coverage` if you need test with coverage

---

## `check:filter` Usage Guide

script wrap their respective commands in a shell function that defaults to `.` when no args are passed.
Always use this script to save times on our iterations, rather than run on all files.
Keep lint and check as narrow as possible.

### Syntax

```
pnpm check:filter -- <args...>
```

The `--` separator is required to pass args through to the underlying commands.

### Scenarios

| Scenario                 | Command                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------- |
| **Everything (default)** | `pnpm check:filter`                                                                     |
| **Single file**          | `pnpm check:filter -- "src/routes/home/+page.svelte"`                                   |
| **Multiple files**       | `pnpm check:filter -- "src/routes/home/+page.svelte" "src/routes/home/+page.server.ts"` |
| **Glob pattern**         | `pnpm check:filter -- "src/routes/**/*.svelte"`                                         |
| **Specific directory**   | `pnpm check:filter -- "src/lib/components/"`                                            |
| **Multiple globs**       | `pnpm check:filter -- "src/routes/**/*.svelte" "src/lib/**/*.ts"`                       |
| **TypeScript only**      | `pnpm check:filter -- "**/*.ts"`                                                        |
| **Changed files (git)**  | `pnpm check:filter -- $(git diff --name-only HEAD \| tr '\n' ' ')`                      |

### What each runs

| Script         | Commands                                                                               |
| -------------- | -------------------------------------------------------------------------------------- |
| `check:filter` | `svelte-kit sync` then `svelte-check --tsconfig ./tsconfig.json` on the selected paths |

---

## Testing

we use vitest for our testing, always use vitest skills before do any testing related works.
run testing with as narrow filter as possible, using file filter or test name pattern.
narrow testing run would help to speed up our iterations, rather than waiting for unrelated testing.

---

## Tooling

always use sqlite cli to debug the sqlite state if needed.
assume the host machine have `sqlite` cli installed, if not prompt the user to install.

---

## Worktree Setup

**Workflow rule.** Before creating a worktree, load the `using-git-worktrees` and `herdr` skills. After creating a worktree, also create a herdr workspace for that worktree directory (when `HERDR_ENV=1`):

```sh
herdr workspace create --cwd .worktrees/feat/implement-foo --label "feat/implement-foo"
```

Use git worktrees to develop on an isolated branch without disturbing the main checkout. Each worktree has its own working copy, `node_modules`, `.env`, and SQLite database.

### Create a worktree

Worktrees live at `./.worktrees/<branch-name>`. Slashes in the branch name become nested directories, so `feat/implement-foo` maps to `./.worktrees/feat/implement-foo`.

```sh
# New branch
git worktree add .worktrees/feat/implement-foo -b feat/implement-foo

# Existing local branch
git worktree add .worktrees/feat/implement-foo feat/implement-foo

# Existing remote branch
git worktree add .worktrees/feat/implement-foo origin/feat/implement-foo
```

`.worktrees/` is already in `.gitignore`, so worktree contents are never committed.

### Initialize the worktree

`cd` into the new worktree and run the same setup the main checkout uses. Each step is scoped to the worktree.

```sh
cd .worktrees/feat/implement-foo

# 1. Install dependencies (uses the repo's pnpm lockfile)
pnpm install --frozen-lockfile

# 2. Create a local .env from the example
cp .env.example .env

# 3. Generate a random BETTER_AUTH_SECRET and write it to .env
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$SECRET|" .env

# 4. Apply database migrations. Do NOT use `pnpm db:push` here —
#    the app also runs migrations on boot (see
#    src/lib/server/infras/db/client.ts:13), so push would create
#    tables the runtime migrations would then refuse to reapply.
pnpm db:migrate
```

`svelte-kit sync` runs automatically via the `prepare` postinstall script, so it does not need to be invoked manually.

### Develop

```sh
pnpm dev
```

Vite defaults to port 5173. Pass `--port` to use a specific one when running multiple worktrees at once.

```sh
pnpm dev --port 5174
```

### Tear down

Run from the main checkout, not from inside the worktree.

```sh
git worktree remove --force .worktrees/feat/implement-foo
git branch -D feat/implement-foo   # only if the branch should be deleted
```

`git worktree prune` cleans up stale admin records if a worktree directory is deleted by hand.

---

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Oxlint + Oxfmt (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Oxlint + Oxfmt. Run `pnpm dlx ultracite fix` before committing to ensure compliance.
