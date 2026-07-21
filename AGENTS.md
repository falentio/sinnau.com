## Useful docs

Try to fetch this docs if your work or task is related to some of these techs.
If you still have lack of information after get the docs, you should either use context7 or exa websearch.
But if you found `skills` for related techs, you should use that skills first, docs should take less priority than skills.

[shadcn-svelte](https://shadcn-svelte.com/llms.txt)
[svelte-kit](https://svelte.dev/docs/kit/llms.txt)
[svelte](https://svelte.dev/docs/svelte/llms.txt)
[oprc](https://orpc.dev/llms.txt)
[better-auth](https://better-auth.com/llms.txt)
[better-auth-svelte](https://better-auth.com/llms.txt/docs/integrations/svelte-kit.md)
[valibot](https://valibot.dev/llms.txt)

always fetch the shadcn-svelte docs whenever work with `$lib/components/ui/**/*`.

## Docs Retrieval Priority

This are ordered by most prioritized to least prioritized.
Always assume your knowledge are outdated and never do optimize editting before you have any documentations before hand.
Retrieve docs are mandatory, we dont tollerate with "Maybe I know how to work with this library, lets just plan and work the task immidately", you must "I did not read any docs yet, let me read that related docs first before planing the task I would work with.".

1. Svelte mcp (if it related to svelte)
2. Skills (valibot, vite, vitest, etc.)
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

- use `pnpm run test:unit` for testing without coverage
- use `pnpm run test:coverage` if you need test with coverage

always use `quality-fix` subagent to fix format, lint, and type-check issues — never run them yourself. Provide the files/directories you changed as Unix glob patterns.

## Fixes

MUST use `quality-fix` subagent after working with any files. Do NOT run format, lint, or type-check directly — delegate to the subagent with the glob patterns of files you changed.

---

## Testing

we use vitest for our testing, always use vitest skills before do any testing related works.
run testing with as narrow filter as possible, using file filter or test name pattern.
narrow testing run would help to speed up our iterations, rather than waiting for unrelated testing.

---

## Tooling

always use sqlite cli to debug the sqlite state if needed.
assume the host machine have `sqlite3` cli installed, if not prompt the user to install.

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
```

`svelte-kit sync` runs automatically via the `prepare` postinstall script, so it does not need to be invoked manually.

### Develop

we use portless to run development server
it has 3 reponsibilities:

- starting dev server "pnpm run dev"
- reverse proxy with local only tld, ".falentio" for our case
- assign ssl certificate, so we able to do https

```sh
portless
```

### Herdr Workspaces Initial

We must have three open tabs for initial herdr workspaces

- `opencode attach http://localhost:4096` if opencode server available or `opencode` otherwise
- `portless`
- empty

### Tear down

Run from the main checkout, not from inside the worktree.

```sh
git worktree remove --force .worktrees/feat/implement-foo
git branch -D feat/implement-foo   # only if the branch should be deleted
```

`git worktree prune` cleans up stale admin records if a worktree directory is deleted by hand.

---

## Agent skills

### Issue tracker

Issues live in the repo's GitHub Issues (via `gh` CLI); external PRs are NOT a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

---

## Post-Commit

After commit, you must using "code-review" skills, baseline are COMMIT^..COMMIT
this is mandatory, non negotible

---
