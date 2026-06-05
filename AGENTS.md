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
