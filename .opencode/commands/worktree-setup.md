---
description: Set up an isolated git worktree with full dev environment (deps, env, herdr workspace, portless)
subtask: true
---

The user wants to start a worktree for: "$ARGUMENTS".

Follow every step below in order. Each step names its completion criterion — verify it before moving on.

## Step 1 — Derive the branch name

From the purpose above, derive a branch name using the convention `<type>/<slug>`:

- `feat/` for new features, `fix/` for bug fixes, `chore/` for maintenance, `refactor/` for restructuring.
- Slug is lowercase, hyphen-separated, 2-4 words max (e.g. "add dark mode toggle" becomes `feat/dark-mode`).

**Done when:** the branch name is a valid git ref with a recognised type prefix and a short descriptive slug.

## Step 2 — Load skills

Load the `using-git-worktrees` and `herdr` skills. They carry the general git-worktree and herdr knowledge this workflow builds on.

**Done when:** both skills are loaded and their guidance is available.

## Step 3 — Create the worktree

Create the worktree at `.worktrees/<branch>` (slashes in the branch name become nested directories — `feat/dark-mode` maps to `.worktrees/feat/dark-mode`).

```sh
git worktree add .worktrees/<branch> -b <branch>
```

`.worktrees/` is already in `.gitignore`, so worktree contents are never committed.

**Done when:** `.worktrees/<branch>` exists and `git -C .worktrees/<branch> branch --show-current` prints `<branch>`.

## Step 4 — Bootstrap the environment

`cd` into the worktree and run the project setup. Each sub-step is scoped to the worktree.

```sh
cd .worktrees/<branch>

# 1. Install dependencies (uses the repo's pnpm lockfile)
pnpm install --frozen-lockfile

# 2. Create a local .env from the example
cp .env.example .env

# 3. Generate a random BETTER_AUTH_SECRET and write it to .env
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$SECRET|" .env
```

`svelte-kit sync` runs automatically via the `prepare` postinstall script — it needs no manual invocation.

**Done when:** `node_modules/` is populated, `.env` exists, and `BETTER_AUTH_SECRET` in `.env` is a 64-character hex string (not the placeholder from `.env.example`).

## Step 5 — Create the herdr workspace

Only when `HERDR_ENV=1`. Create a herdr workspace for the worktree directory. The `--cwd` flag requires an absolute path:

```sh
herdr workspace create --cwd "$(pwd)/.worktrees/<branch>" --label "<branch>"
```

**Done when:** the herdr workspace exists with the label matching the branch name. Skip this step entirely when `HERDR_ENV` is unset or not `1`.

## Step 6 — Open herdr tabs

In the herdr workspace, open exactly three tabs:

1. `opencode attach http://localhost:4096` if an opencode server is available, or `opencode` otherwise
2. `portless`
3. An empty tab

**Done when:** three tabs are open in the herdr workspace matching the layout above.

## Step 7 — Start the dev server

Run `portless` in the second herdr tab. Portless handles three responsibilities:

- Starting the dev server (`pnpm run dev`)
- Reverse proxy with the local-only TLD `.falentio`
- Assigning an SSL certificate for HTTPS

**Done when:** the dev server is reachable over HTTPS on a `.falentio` domain.
