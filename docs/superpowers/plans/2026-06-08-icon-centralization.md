# Icon Centralization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize all non-UI icon imports into a single barrel file (`$lib/components/features/icons`) to ensure the same entity uses the same icon consistently across the codebase.

**Architecture:** Create `src/lib/components/features/icons/index.ts` that re-exports all canonical icons from `@hugeicons/core-free-icons`. Then update 22 non-UI files to import from this barrel instead of directly from `@hugeicons/core-free-icons`, applying icon substitutions where conflicts exist.

**Tech Stack:** Svelte 5, TypeScript, HugeIcons, Oxlint + Oxfmt (Ultracite)

---

## File Structure

| File                                                                | Action | Description                                                                                                                     |
| ------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/components/features/icons/index.ts`                        | Create | Centralized icon barrel file. Re-exports all canonical icons.                                                                   |
| `src/lib/components/features/study-set/study-set-header.svelte`     | Modify | Switch to barrel. Replace BookOpen01Icon→Book03Icon, Cards02Icon→Cards01Icon, Quiz02Icon→Quiz01Icon, Delete01Icon→Delete02Icon. |
| `src/lib/components/features/home/home-header.svelte`               | Modify | Switch to barrel.                                                                                                               |
| `src/lib/components/features/navigation/bottom-navbar.svelte`       | Modify | Switch to barrel.                                                                                                               |
| `src/lib/components/features/auth/auth-layout.svelte`               | Modify | Switch to barrel.                                                                                                               |
| `src/lib/components/features/chapter/chapter-select.svelte`         | Modify | Switch to barrel.                                                                                                               |
| `src/lib/components/features/app/error-page.svelte`                 | Modify | Switch to barrel.                                                                                                               |
| `src/lib/components/features/app/study-set-item.svelte`             | Modify | Switch to barrel.                                                                                                               |
| `src/lib/components/features/app/study-set-empty.svelte`            | Modify | Switch to barrel. Remove unused File01Icon import.                                                                              |
| `src/lib/components/features/app/filter-bar.svelte`                 | Modify | Switch to barrel.                                                                                                               |
| `src/lib/components/features/flashcard/flashcard-empty.svelte`      | Modify | Switch to barrel.                                                                                                               |
| `src/lib/components/features/quiz/quiz-empty.svelte`                | Modify | Switch to barrel.                                                                                                               |
| `src/lib/components/app-sidebar.svelte`                             | Modify | Switch to barrel.                                                                                                               |
| `src/routes/(app)/study/[studySetId]/flashcard/+page.svelte`        | Modify | Switch to barrel. Replace PlusSignIcon→Add01Icon.                                                                               |
| `src/routes/(app)/study/[studySetId]/quiz/+page.svelte`             | Modify | Switch to barrel. Replace PlusSignIcon→Add01Icon, ChatQuestion01Icon→Quiz01Icon.                                                |
| `src/routes/(app)/study/+error.svelte`                              | Modify | Switch to barrel. Replace Search01Icon→Search02Icon.                                                                            |
| `src/routes/(app)/study/new/+page.svelte`                           | Modify | Switch to barrel.                                                                                                               |
| `src/routes/(app)/study/generate/+page.svelte`                      | Modify | Switch to barrel. Replace DeleteIcon→Delete02Icon.                                                                              |
| `src/routes/(app)/study/[studySetId]/quiz/create/+page.svelte`      | Modify | Switch to barrel. Replace PlusSignIcon→Add01Icon, DeleteIcon→Delete02Icon.                                                      |
| `src/routes/(app)/study/[studySetId]/flashcard/create/+page.svelte` | Modify | Switch to barrel.                                                                                                               |
| `src/routes/(app)/subs/+layout.svelte`                              | Modify | Switch to barrel.                                                                                                               |
| `src/routes/(app)/session/[studySetId]/quiz/+page.svelte`           | Modify | Switch to barrel.                                                                                                               |
| `src/routes/(app)/session/[studySetId]/flashcard/+page.svelte`      | Modify | Switch to barrel.                                                                                                               |

---

## Icon Substitution Map

| Old Icon             | New Icon         | Reason                           |
| -------------------- | ---------------- | -------------------------------- |
| `BookOpen01Icon`     | `Book03Icon`     | Standardize study set icon       |
| `File01Icon`         | removed (unused) | Unused import in study-set-empty |
| `Quiz02Icon`         | `Quiz01Icon`     | Standardize quiz icon            |
| `Cards02Icon`        | `Cards01Icon`    | Standardize flashcard icon       |
| `PlusSignIcon`       | `Add01Icon`      | Standardize add/create icon      |
| `DeleteIcon`         | `Delete02Icon`   | Standardize delete icon          |
| `Delete01Icon`       | `Delete02Icon`   | Standardize delete icon          |
| `Search01Icon`       | `Search02Icon`   | Standardize search icon          |
| `ChatQuestion01Icon` | `Quiz01Icon`     | Standardize quiz icon            |

---

## Notes for Implementation

- All UI components under `src/lib/components/ui/` continue to import directly from `@hugeicons/core-free-icons`. Do NOT change them.
- `HugeiconsIcon` is still imported directly from `@hugeicons/svelte` in every file; only the icon constants move to the barrel.
- After all edits, run `pnpm dlx ultracite fix` to auto-format and fix any lint issues.
- Run `pnpm run check` to ensure TypeScript compilation passes.

---

### Task 1: Create Centralized Icon Barrel

**Files:**

- Create: `src/lib/components/features/icons/index.ts`

- [ ] **Step 1: Write the barrel file**

```typescript
export {
  Add01Icon,
  AiBeautifyIcon,
  AiChat02Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Book03Icon,
  Cancel01Icon,
  Cards01Icon,
  ChatQuestion01Icon,
  ConfusedIcon,
  CrownIcon,
  Delete02Icon,
  Dollar01Icon,
  Edit01Icon,
  FileUploadIcon,
  HappyIcon,
  Home01Icon,
  IdeaIcon,
  LockIcon,
  PieChartIcon,
  Quiz01Icon,
  QuillWrite01Icon,
  SadDizzyIcon,
  SadIcon,
  Search02Icon,
  Settings02Icon,
  Share01Icon,
} from "@hugeicons/core-free-icons";
```

- [ ] **Step 2: Verify file was created**

Run: `ls -la src/lib/components/features/icons/index.ts`
Expected: File exists with content above.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/features/icons/index.ts
git commit -m "feat(icons): create centralized icon barrel"
```

---

### Task 2: Update Feature Components (Batch 1 — Study Set + Chapter + Auth + App)

**Files:**

- Modify: `src/lib/components/features/study-set/study-set-header.svelte`
- Modify: `src/lib/components/features/chapter/chapter-select.svelte`
- Modify: `src/lib/components/features/auth/auth-layout.svelte`
- Modify: `src/lib/components/features/app/error-page.svelte`
- Modify: `src/lib/components/features/app/study-set-item.svelte`
- Modify: `src/lib/components/features/app/study-set-empty.svelte`

- [ ] **Step 1: Update study-set-header.svelte**

Replace the import block (lines 11-24):

```svelte
import {
    Add01Icon,
    AiChat02Icon,
    ArrowLeft01Icon,
    Book03Icon,
    Cards01Icon,
    Delete02Icon,
    Edit01Icon,
    Quiz01Icon,
    Settings02Icon,
    Share01Icon,
  } from "$lib/components/features/icons";
```

Also update the icon usage references in the template:

- Line 84: `icon={Delete01Icon}` → `icon={Delete02Icon}`
- Line 102: `icon={BookOpen01Icon}` → `icon={Book03Icon}`
- Line 141: `icon={Cards02Icon}` → `icon={Cards01Icon}`
- Line 148: `icon={Quiz02Icon}` → `icon={Quiz01Icon}`

- [ ] **Step 2: Update chapter-select.svelte**

Replace the import (line 1):

```svelte
import {Add01Icon} from "$lib/components/features/icons";
```

- [ ] **Step 3: Update auth-layout.svelte**

Replace the import (find the line):

```svelte
import {AiBeautifyIcon} from "$lib/components/features/icons";
```

- [ ] **Step 4: Update error-page.svelte**

Replace the import block (lines 9-13):

```svelte
import {
    Alert02Icon,
    ArrowLeft01Icon,
    Home01Icon,
  } from "$lib/components/features/icons";
```

- [ ] **Step 5: Update study-set-item.svelte**

Replace the import (find the line):

```svelte
import {Book03Icon} from "$lib/components/features/icons";
```

- [ ] **Step 6: Update study-set-empty.svelte**

Replace the import block (lines 9-14):

```svelte
import {
    AiBeautifyIcon,
    QuillWrite01Icon,
    Book03Icon,
  } from "$lib/components/features/icons";
```

- [ ] **Step 7: Run format**

Run: `pnpm dlx ultracite fix`
Expected: No unfixable errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/features/study-set/study-set-header.svelte src/lib/components/features/chapter/chapter-select.svelte src/lib/components/features/auth/auth-layout.svelte src/lib/components/features/app/error-page.svelte src/lib/components/features/app/study-set-item.svelte src/lib/components/features/app/study-set-empty.svelte
git commit -m "refactor(icons): migrate feature components batch 1 to icon barrel"
```

---

### Task 3: Update Feature Components (Batch 2 — Home + Navigation + Empty States + Filter)

**Files:**

- Modify: `src/lib/components/features/home/home-header.svelte`
- Modify: `src/lib/components/features/navigation/bottom-navbar.svelte`
- Modify: `src/lib/components/features/flashcard/flashcard-empty.svelte`
- Modify: `src/lib/components/features/quiz/quiz-empty.svelte`
- Modify: `src/lib/components/features/app/filter-bar.svelte`

- [ ] **Step 1: Update home-header.svelte**

Replace the import block (find lines):

```svelte
import {
    Cancel01Icon,
    Settings02Icon,
    Search02Icon,
    AiBeautifyIcon,
    QuillWrite01Icon,
  } from "$lib/components/features/icons";
```

- [ ] **Step 2: Update bottom-navbar.svelte**

Replace the import block (lines 4-10):

```svelte
import {
    AiBeautifyIcon,
    Book03Icon,
    CrownIcon,
    Home01Icon,
    Search02Icon,
  } from "$lib/components/features/icons";
```

- [ ] **Step 3: Update flashcard-empty.svelte**

Replace the import block (lines 11-15):

```svelte
import {
    Add01Icon,
    Cancel01Icon,
    Cards01Icon,
  } from "$lib/components/features/icons";
```

- [ ] **Step 4: Update quiz-empty.svelte**

Replace the import block (lines 11-15):

```svelte
import {
    Add01Icon,
    Cancel01Icon,
    Quiz01Icon,
  } from "$lib/components/features/icons";
```

- [ ] **Step 5: Update filter-bar.svelte**

Replace the import (find the line):

```svelte
import {AiBeautifyIcon} from "$lib/components/features/icons";
```

- [ ] **Step 6: Run format**

Run: `pnpm dlx ultracite fix`
Expected: No unfixable errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/features/home/home-header.svelte src/lib/components/features/navigation/bottom-navbar.svelte src/lib/components/features/flashcard/flashcard-empty.svelte src/lib/components/features/quiz/quiz-empty.svelte src/lib/components/features/app/filter-bar.svelte
git commit -m "refactor(icons): migrate feature components batch 2 to icon barrel"
```

---

### Task 4: Update App Sidebar

**Files:**

- Modify: `src/lib/components/app-sidebar.svelte`

- [ ] **Step 1: Update app-sidebar.svelte**

Replace the import block (find lines):

```svelte
import {
    AiBeautifyIcon,
    Book03Icon,
    CrownIcon,
    Home01Icon,
    Search02Icon,
  } from "$lib/components/features/icons";
```

- [ ] **Step 2: Run format**

Run: `pnpm dlx ultracite fix`
Expected: No unfixable errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/app-sidebar.svelte
git commit -m "refactor(icons): migrate app-sidebar to icon barrel"
```

---

### Task 5: Update Route Pages (Batch 1 — Study Pages)

**Files:**

- Modify: `src/routes/(app)/study/[studySetId]/flashcard/+page.svelte`
- Modify: `src/routes/(app)/study/[studySetId]/quiz/+page.svelte`
- Modify: `src/routes/(app)/study/+error.svelte`
- Modify: `src/routes/(app)/study/new/+page.svelte`
- Modify: `src/routes/(app)/study/generate/+page.svelte`

- [ ] **Step 1: Update flashcard page**

Replace the import (find the line):

```svelte
import {Add01Icon} from "$lib/components/features/icons";
```

Also update usage: `icon={PlusSignIcon}` → `icon={Add01Icon}` wherever it appears.

- [ ] **Step 2: Update quiz page**

Replace the import (find the line):

```svelte
import {(Quiz01Icon, Add01Icon)} from "$lib/components/features/icons";
```

Also update usage: `icon={PlusSignIcon}` → `icon={Add01Icon}`, `icon={ChatQuestion01Icon}` → `icon={Quiz01Icon}` wherever they appear.

- [ ] **Step 3: Update study error page**

Replace the import block (find lines):

```svelte
import {
    Alert02Icon,
    LockIcon,
    Search02Icon,
  } from "$lib/components/features/icons";
```

Also update usage: `icon={Search01Icon}` → `icon={Search02Icon}` wherever it appears.

- [ ] **Step 4: Update new page**

Replace the import (find the line):

```svelte
import {ArrowLeft01Icon} from "$lib/components/features/icons";
```

- [ ] **Step 5: Update generate page**

Replace the import block (lines 20-25):

```svelte
import {
    ArrowLeft01Icon,
    ArrowDown01Icon,
    ArrowUp01Icon,
    FileUploadIcon,
    Delete02Icon,
  } from "$lib/components/features/icons";
```

Also update usage: `icon={DeleteIcon}` → `icon={Delete02Icon}` wherever it appears.

- [ ] **Step 6: Run format**

Run: `pnpm dlx ultracite fix`
Expected: No unfixable errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/(app)/study/[studySetId]/flashcard/+page.svelte src/routes/(app)/study/[studySetId]/quiz/+page.svelte src/routes/(app)/study/+error.svelte src/routes/(app)/study/new/+page.svelte src/routes/(app)/study/generate/+page.svelte
git commit -m "refactor(icons): migrate study route pages to icon barrel"
```

---

### Task 6: Update Route Pages (Batch 2 — Create + Subs + Session)

**Files:**

- Modify: `src/routes/(app)/study/[studySetId]/quiz/create/+page.svelte`
- Modify: `src/routes/(app)/study/[studySetId]/flashcard/create/+page.svelte`
- Modify: `src/routes/(app)/subs/+layout.svelte`
- Modify: `src/routes/(app)/session/[studySetId]/quiz/+page.svelte`
- Modify: `src/routes/(app)/session/[studySetId]/flashcard/+page.svelte`

- [ ] **Step 1: Update quiz create page**

Replace the import (line 41):

```svelte
import {(Add01Icon, Delete02Icon)} from "$lib/components/features/icons";
```

Also update usage: `icon={PlusSignIcon}` → `icon={Add01Icon}`, `icon={DeleteIcon}` → `icon={Delete02Icon}` wherever they appear.

- [ ] **Step 2: Update flashcard create page**

Replace the import (find the line):

```svelte
import {ArrowLeft01Icon} from "$lib/components/features/icons";
```

- [ ] **Step 3: Update subs layout**

Replace the import block (find lines):

```svelte
import {
    ArrowLeft01Icon,
    Dollar01Icon,
    PieChartIcon,
  } from "$lib/components/features/icons";
```

- [ ] **Step 4: Update session quiz page**

Replace the import (find the line):

```svelte
import {ArrowLeft01Icon} from "$lib/components/features/icons";
```

- [ ] **Step 5: Update session flashcard page**

Replace the import block (find lines):

```svelte
import {
    ArrowLeft01Icon,
    ConfusedIcon,
    HappyIcon,
    IdeaIcon,
    SadDizzyIcon,
    SadIcon,
  } from "$lib/components/features/icons";
```

- [ ] **Step 6: Run format**

Run: `pnpm dlx ultracite fix`
Expected: No unfixable errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/(app)/study/[studySetId]/quiz/create/+page.svelte src/routes/(app)/study/[studySetId]/flashcard/create/+page.svelte src/routes/(app)/subs/+layout.svelte src/routes/(app)/session/[studySetId]/quiz/+page.svelte src/routes/(app)/session/[studySetId]/flashcard/+page.svelte
git commit -m "refactor(icons): migrate route pages batch 2 to icon barrel"
```

---

### Task 7: Final Verification

**Files:**

- No file changes; validation only.

- [ ] **Step 1: Check for remaining direct `@hugeicons/core-free-icons` imports outside UI**

Run:

```bash
grep -r "@hugeicons/core-free-icons" src/ --include="*.svelte" --include="*.ts" | grep -v "src/lib/components/ui/"
```

Expected: Only `src/lib/components/features/icons/index.ts` should appear. No other non-UI files.

- [ ] **Step 2: Run type check**

Run: `pnpm run check`
Expected: Pass with no errors.

- [ ] **Step 3: Run lint**

Run: `pnpm dlx ultracite check`
Expected: Pass with no errors.

- [ ] **Step 4: Final commit (optional)**

If any fixes were needed during verification:

```bash
git add -A
git commit -m "refactor(icons): apply final fixes after verification"
```

---

## Self-Review

1. **Spec coverage:** All 22 non-UI files are accounted for. UI files are explicitly excluded. Icon substitutions per user request are mapped and assigned to correct files.
2. **Placeholder scan:** No placeholders. All import blocks and substitutions are explicit.
3. **Type consistency:** All icons exported in `index.ts` are the canonical set. Substitutions are consistent (e.g., all delete actions use `Delete02Icon`, all quiz uses `Quiz01Icon`).
