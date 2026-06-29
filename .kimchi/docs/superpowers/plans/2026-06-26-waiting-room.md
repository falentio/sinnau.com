# Waiting Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the waiting room page that polls `generate.check`, surfaces generated chapters/flashcards/quizzes as they stream in, and redirects to the study set when complete.

**Architecture:** Add a backend query to resolve `generateId` from `studySetId`. Server load fetches the initial generation record. The browser component polls `generate.check` with the `since` cursor, flattens incoming chunks into item cards, and renders them with Svelte transitions.

**Tech Stack:** Svelte 5, SvelteKit, Tailwind CSS v4, shadcn-svelte, `@orpc/client`, Vitest.

---

## File Structure

| File                                                                       | Responsibility                                           |
| -------------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/lib/server/services/generate/generate.repository.ts`                  | Add `findGenerateByStudySetId` interface method.         |
| `src/lib/server/services/generate/generate.repository.drizzle.ts`          | Implement `findGenerateByStudySetId`.                    |
| `src/lib/server/services/generate/generate.service.ts`                     | Add `getGenerateByStudySetId` service method with guard. |
| `src/lib/server/services/generate/queries/generate.get-by-study-set-id.ts` | New oRPC query procedure.                                |
| `src/lib/server/services/generate/generate.router.ts`                      | Wire `getByStudySetId` into the router.                  |
| `src/lib/schemas/generate.ts`                                              | Add input/output schemas for `getByStudySetId`.          |
| `src/routes/(app)/study/[studySetId]/waiting-room/+page.server.ts`         | Server load: resolve generate id, redirect if terminal.  |
| `src/routes/(app)/study/[studySetId]/waiting-room/+page.svelte`            | Main page: polling, feed, terminal states.               |
| `src/lib/components/features/waiting-room/progress-ring.svelte`            | SVG circular progress indicator.                         |
| `src/lib/components/features/waiting-room/generation-item-card.svelte`     | Single generated item card.                              |
| `src/lib/components/features/waiting-room/feed.svelte`                     | Animated list with 10-item cap.                          |
| `src/lib/components/features/waiting-room/waiting-room.types.ts`           | Shared types for feed items.                             |
| `src/lib/components/features/waiting-room/waiting-room.utils.ts`           | Pure helpers: `flattenChunk`, `capItems`.                |
| `src/lib/components/features/waiting-room/waiting-room.utils.test.ts`      | Unit tests for helpers.                                  |

---

## Task 1: Add backend query to resolve generate by study set id

**Files:**

- Modify: `src/lib/server/services/generate/generate.repository.ts`
- Modify: `src/lib/server/services/generate/generate.repository.drizzle.ts`
- Modify: `src/lib/server/services/generate/generate.service.ts`
- Create: `src/lib/server/services/generate/queries/generate.get-by-study-set-id.ts`
- Modify: `src/lib/server/services/generate/generate.router.ts`
- Modify: `src/lib/schemas/generate.ts`

- [ ] **Step 1: Add repository interface method**

Open `src/lib/server/services/generate/generate.repository.ts` and add to the `GenerateRepository` interface:

```typescript
findGenerateByStudySetId(studySetId: string): Promise<Generate | null>;
```

- [ ] **Step 2: Implement in Drizzle repository**

Open `src/lib/server/services/generate/generate.repository.drizzle.ts`. Add a public method:

```typescript
async findGenerateByStudySetId(studySetId: string): Promise<Generate | null> {
  try {
    const [row] = await this.db
      .select()
      .from(generate)
      .where(eq(generate.studySetId, studySetId))
      .limit(1);
    return row ?? null;
  } catch (error) {
    throw handleDbError(error);
  }
}
```

Import `eq` if not already imported.

- [ ] **Step 3: Add service method**

Open `src/lib/server/services/generate/generate.service.ts`. Add after `checkGenerateContent`:

```typescript
async getGenerateByStudySetId(input: { studySetId: string }, userId: string) {
  const row = await this.repo.findGenerateByStudySetId(input.studySetId);
  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Generation not found" });
  }

  await this.studySetGuard.assertStudySetVisibleByIdOrNotFound(
    row.studySetId,
    userId
  );

  return { generateId: row.id, status: row.status };
}
```

- [ ] **Step 4: Add schemas**

Open `src/lib/schemas/generate.ts`. Add:

```typescript
export const getGenerateByStudySetIdInputSchema = v.object({
  studySetId: v.string(),
});

export const getGenerateByStudySetIdOutputSchema = v.object({
  generateId: v.string(),
  status: generateStatusSchema,
});

export type GetGenerateByStudySetIdInput = v.InferOutput<
  typeof getGenerateByStudySetIdInputSchema
>;
export type GetGenerateByStudySetIdOutput = v.InferOutput<
  typeof getGenerateByStudySetIdOutputSchema
>;
```

- [ ] **Step 5: Create the oRPC query procedure**

Create `src/lib/server/services/generate/queries/generate.get-by-study-set-id.ts`:

```typescript
import {
  getGenerateByStudySetIdInputSchema,
  getGenerateByStudySetIdOutputSchema,
} from "$lib/schemas/generate";
import { authorizedProcedure } from "$lib/server/api/base";

import { generateService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Generation not found" },
} as const;

export const generateGetByStudySetId = authorizedProcedure
  .errors(ERRORS)
  .input(getGenerateByStudySetIdInputSchema)
  .output(getGenerateByStudySetIdOutputSchema)
  .handler(
    async ({ input, context }) =>
      await generateService.getGenerateByStudySetId(input, context.user.id)
  );
```

- [ ] **Step 6: Wire into router**

Open `src/lib/server/services/generate/generate.router.ts`. Add `getByStudySetId`:

```typescript
import { generateGetByStudySetId } from "./queries/generate.get-by-study-set-id.ts";

export const generateRouter = {
  admin: {
    cleanupChunks: generateAdminCleanupChunks,
  },
  check: generateCheck,
  create: generateCreate,
  getByStudySetId: generateGetByStudySetId,
};
```

- [ ] **Step 7: Run type check**

Run: `rtk pnpm run check`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/services/generate/generate.repository.ts \
  src/lib/server/services/generate/generate.repository.drizzle.ts \
  src/lib/server/services/generate/generate.service.ts \
  src/lib/server/services/generate/queries/generate.get-by-study-set-id.ts \
  src/lib/server/services/generate/generate.router.ts \
  src/lib/schemas/generate.ts
git commit -m "feat(generate): add getByStudySetId query"
```

---

## Task 2: Create shared waiting-room helpers and tests

**Files:**

- Create: `src/lib/components/features/waiting-room/waiting-room.types.ts`
- Create: `src/lib/components/features/waiting-room/waiting-room.utils.ts`
- Create: `src/lib/components/features/waiting-room/waiting-room.utils.test.ts`

- [ ] **Step 1: Write types**

Create `src/lib/components/features/waiting-room/waiting-room.types.ts`:

```typescript
import type {
  GeneratedChapter,
  GeneratedFlashcard,
  GeneratedQuiz,
  SuccessRecord,
} from "$lib/schemas/generate";

export type GenerationItem =
  | { type: "chapter"; data: GeneratedChapter }
  | { type: "flashcard"; data: GeneratedFlashcard }
  | { type: "quiz"; data: GeneratedQuiz };
```

- [ ] **Step 2: Write helper functions**

Create `src/lib/components/features/waiting-room/waiting-room.utils.ts`:

```typescript
import type { ChunkSummaryItem } from "$lib/schemas/generate";

import type { GenerationItem } from "./waiting-room.types.ts";

export const flattenChunk = (chunk: ChunkSummaryItem): GenerationItem[] => {
  if (chunk.kind === "failure" || chunk.payload.kind === "failure") {
    return [];
  }

  const content = chunk.payload.content;
  const items: GenerationItem[] = [];

  for (const chapter of content.chapter) {
    items.push({ data: chapter, type: "chapter" });
  }
  for (const flashcard of content.flashcard) {
    items.push({ data: flashcard, type: "flashcard" });
  }
  for (const quiz of content.quiz) {
    items.push({ data: quiz, type: "quiz" });
  }

  return items;
};

export const capItems = (
  items: GenerationItem[],
  limit = 10
): GenerationItem[] => {
  if (items.length <= limit) {
    return items;
  }
  return items.slice(items.length - limit);
};
```

- [ ] **Step 3: Write failing tests**

Create `src/lib/components/features/waiting-room/waiting-room.utils.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import type { ChunkSummaryItem } from "$lib/schemas/generate";

import { capItems, flattenChunk } from "./waiting-room.utils.ts";

const makeSuccessChunk = (
  chapterTitles: string[],
  flashcardFronts: string[],
  quizQuestions: string[]
): ChunkSummaryItem => ({
  index: 0,
  kind: "success",
  payload: {
    chaptersSlugs: chapterTitles.map((t) =>
      t.toLowerCase().replace(/\s+/g, "_")
    ),
    content: {
      chapter: chapterTitles.map((title) => ({
        slug: title.toLowerCase().replace(/\s+/g, "_"),
        title,
      })),
      flashcard: flashcardFronts.map((front) => ({
        back: `${front} back`,
        chapterSlug: "chapter_1",
        front,
        hint: "",
        importance: 1,
      })),
      quiz: quizQuestions.map((questionText) => ({
        chapterSlug: "chapter_1",
        options: [],
        questionText,
        type: "MULTIPLE_CHOICE",
      })),
    },
    index: 0,
    kind: "success",
    stepCount: 1,
    tokenUsage: {
      cacheRead: 0,
      cacheWrite: 0,
      input: 0,
      output: 0,
      reasoning: 0,
    },
  },
});

describe("flattenChunk", () => {
  it("returns items in chapter -> flashcard -> quiz order", () => {
    const chunk = makeSuccessChunk(
      ["Introduction", "Variables"],
      ["What is x?"],
      ["Solve for x"]
    );
    const items = flattenChunk(chunk);

    expect(items).toHaveLength(4);
    expect(items[0]?.type).toBe("chapter");
    expect(items[1]?.type).toBe("chapter");
    expect(items[2]?.type).toBe("flashcard");
    expect(items[3]?.type).toBe("quiz");
  });

  it("returns empty array for failure chunks", () => {
    const chunk: ChunkSummaryItem = {
      index: 0,
      kind: "failure",
      payload: {
        error: { message: "timeout", name: "Error" },
        index: 0,
        kind: "failure",
      },
    };
    expect(flattenChunk(chunk)).toEqual([]);
  });
});

describe("capItems", () => {
  it("keeps all items when under limit", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      data: { slug: `c${i}`, title: `Chapter ${i}` },
      type: "chapter" as const,
    }));
    expect(capItems(items)).toHaveLength(5);
  });

  it("keeps only the latest items when over limit", () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      data: { slug: `c${i}`, title: `Chapter ${i}` },
      type: "chapter" as const,
    }));
    const result = capItems(items);
    expect(result).toHaveLength(10);
    expect(result[0]?.data.slug).toBe("c5");
    expect(result[9]?.data.slug).toBe("c14");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm run test:unit -- src/lib/components/features/waiting-room/waiting-room.utils.test.ts`
Expected: FAIL because `flattenChunk` and `capItems` are not defined (they will be after the files exist, but the test imports them).

- [ ] **Step 5: Verify tests pass**

Run: `pnpm run test:unit -- src/lib/components/features/waiting-room/waiting-room.utils.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/features/waiting-room/waiting-room.types.ts \
  src/lib/components/features/waiting-room/waiting-room.utils.ts \
  src/lib/components/features/waiting-room/waiting-room.utils.test.ts
git commit -m "feat(waiting-room): add feed helpers and tests"
```

---

## Task 3: Build waiting-room UI components

**Files:**

- Create: `src/lib/components/features/waiting-room/progress-ring.svelte`
- Create: `src/lib/components/features/waiting-room/generation-item-card.svelte`
- Create: `src/lib/components/features/waiting-room/feed.svelte`

- [ ] **Step 1: Progress ring**

Create `src/lib/components/features/waiting-room/progress-ring.svelte`:

```svelte
<script lang="ts">
  interface Props {
    progress: number; // 0 to 1
    size?: number;
    stroke?: number;
  }

  const { progress, size = 72, stroke = 5 }: Props = $props();

  const radius = $derived((size - stroke) / 2);
  const circumference = $derived(radius * 2 * Math.PI);
  const offset = $derived(
    circumference - Math.min(Math.max(progress, 0), 1) * circumference
  );
</script>

<svg width={size} height={size} viewBox="0 0 {size} {size}" class="-rotate-90">
  <circle
    cx={size / 2}
    cy={size / 2}
    r={radius}
    fill="none"
    stroke="currentColor"
    stroke-width={stroke}
    class="text-muted"
    opacity="0.2"
  />
  <circle
    cx={size / 2}
    cy={size / 2}
    r={radius}
    fill="none"
    stroke="currentColor"
    stroke-width={stroke}
    stroke-linecap="round"
    stroke-dasharray={circumference}
    stroke-dashoffset={offset}
    class="text-foreground transition-all duration-700 ease-out"
  />
</svg>
```

- [ ] **Step 2: Item card**

Create `src/lib/components/features/waiting-room/generation-item-card.svelte`:

```svelte
<script lang="ts">
  import {
    BookOpen01Icon,
    HelpCircleIcon,
    LayersIcon,
  } from "@hugeicons/svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { GenerationItem } from "./waiting-room.types.ts";

  interface Props {
    item: GenerationItem;
  }

  const { item }: Props = $props();

  const title = $derived(
    item.type === "chapter"
      ? item.data.title
      : item.type === "flashcard"
        ? item.data.front
        : item.data.questionText
  );

  const subtitle = $derived(
    item.type === "flashcard"
      ? item.data.back
      : item.type === "quiz"
        ? `${item.data.options.length} opsi`
        : null
  );

  const icon = $derived(
    item.type === "chapter"
      ? BookOpen01Icon
      : item.type === "flashcard"
        ? LayersIcon
        : HelpCircleIcon
  );

  const label = $derived(
    item.type === "chapter"
      ? "Bab"
      : item.type === "flashcard"
        ? "Flashcard"
        : "Kuis"
  );
</script>

<div class="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-xs">
  <div
    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
  >
    <HugeiconsIcon
      icon={item.type === "chapter"
        ? BookOpen01Icon
        : item.type === "flashcard"
          ? LayersIcon
          : HelpCircleIcon}
      size={18}
    />
  </div>
  <div class="min-w-0 flex-1">
    <p
      class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
    >
      {label}
    </p>
    <p class="mt-0.5 text-sm font-medium leading-snug text-card-foreground">
      {title}
    </p>
    {#if subtitle}
      <p
        class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground"
      >
        {subtitle}
      </p>
    {/if}
  </div>
</div>
```

Note: verify the Hugeicons icon names exist in `$lib/components/features/icons` or use `@hugeicons/svelte` directly. If the project has a local icon proxy, prefer it. Adjust icon imports if needed after running `pnpm run check`.

- [ ] **Step 3: Animated feed**

Create `src/lib/components/features/waiting-room/feed.svelte`:

```svelte
<script lang="ts">
  import { flip } from "svelte/animate";
  import { fade, fly } from "svelte/transition";

  import GenerationItemCard from "./generation-item-card.svelte";
  import type { GenerationItem } from "./waiting-room.types.ts";

  interface Props {
    items: GenerationItem[];
  }

  const { items }: Props = $props();
</script>

<div class="flex flex-col gap-3">
  {#each items as item, i (item.type + (item.type === "chapter" ? item.data.slug : item.type === "flashcard" ? item.data.front : item.data.questionText) + i)}
    <div
      in:fly={{ duration: 400, y: 10, opacity: 0 }}
      out:fade={{ duration: 250 }}
      animate:flip={{ duration: 300 }}
    >
      <GenerationItemCard {item} />
    </div>
  {/each}
</div>
```

Use a stable key per item. If content duplicates within the same chunk (e.g., two flashcards with identical fronts), append the index to the key. The key above concatenates type + identifying text + index.

- [ ] **Step 4: Run type check and lint**

Run: `rtk pnpm run check`
Run: `rtk pnpm run lint:agent`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/features/waiting-room/progress-ring.svelte \
  src/lib/components/features/waiting-room/generation-item-card.svelte \
  src/lib/components/features/waiting-room/feed.svelte
git commit -m "feat(waiting-room): add progress ring, item card, and animated feed"
```

---

## Task 4: Implement server load

**Files:**

- Create: `src/routes/(app)/study/[studySetId]/waiting-room/+page.server.ts`

- [ ] **Step 1: Write server load**

Create `src/routes/(app)/study/[studySetId]/waiting-room/+page.server.ts`:

```typescript
import { createServerClient } from "$lib/orpc.server";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
  const user = locals.mustGetUser();
  const client = createServerClient();

  try {
    const { generateId, status } = await client.generate.getByStudySetId({
      studySetId: params.studySetId,
    });

    if (status === "COMPLETED") {
      redirect(307, `/study/${params.studySetId}`);
    }

    return {
      generateId,
      initialStatus: status,
      studySetId: params.studySetId,
    };
  } catch (error) {
    // If no generation exists for this study set, redirect to the study set.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "NOT_FOUND"
    ) {
      redirect(307, `/study/${params.studySetId}`);
    }
    throw error;
  }
};
```

- [ ] **Step 2: Run type check**

Run: `rtk pnpm run check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/(app)/study/[studySetId]/waiting-room/+page.server.ts
git commit -m "feat(waiting-room): add server load to resolve generation"
```

---

## Task 5: Implement the waiting room page

**Files:**

- Modify: `src/routes/(app)/study/[studySetId]/waiting-room/+page.svelte`

- [ ] **Step 1: Replace stub with full page**

Open `src/routes/(app)/study/[studySetId]/waiting-room/+page.svelte` and replace the contents with:

```svelte
<script lang="ts">
  import { goto } from "$app/navigation";
  import { client } from "$lib/orpc";
  import Button from "$lib/components/ui/button/button.svelte";
  import Feed from "$lib/components/features/waiting-room/feed.svelte";
  import ProgressRing from "$lib/components/features/waiting-room/progress-ring.svelte";
  import {
    capItems,
    flattenChunk,
  } from "$lib/components/features/waiting-room/waiting-room.utils.ts";
  import type { GenerationItem } from "$lib/components/features/waiting-room/waiting-room.types.ts";

  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  const { data }: Props = $props();

  const ESTIMATED_DURATION_MS = 20 * 60 * 1000;
  const POLL_INTERVAL_MS = 3000;

  let status = $state(data.initialStatus);
  let since = $state<number | undefined>(undefined);
  let items = $state<GenerationItem[]>([]);
  let isRetrying = $state(false);
  let pollTimeout = $state<ReturnType<typeof setTimeout> | null>(null);

  const totalElapsedMs = $derived(
    Date.now() - new Date(data.startedAt ?? Date.now()).getTime()
  );
  const progress = $derived(
    Math.min(totalElapsedMs / ESTIMATED_DURATION_MS, 0.95)
  );
  const estimatedCompletedAt = $derived(
    new Date(Date.now() + Math.max(ESTIMATED_DURATION_MS - totalElapsedMs, 0))
  );

  const statusText = $derived(
    status === "CREATED"
      ? "Memulai pembuatan materi…"
      : status === "ONGOING"
        ? "Membuat materimu…"
        : status === "FAILED"
          ? "Gagal membuat materi"
          : status === "PARTIAL_COMPLETED"
            ? "Sebagian materi berhasil dibuat"
            : "Materi siap"
  );

  const updateFromChunks = (
    chunks: { index: number; kind: "success" | "failure"; payload: unknown }[]
  ) => {
    const newItems = chunks.flatMap((chunk) => flattenChunk(chunk as never));
    if (newItems.length > 0) {
      items = capItems([...newItems, ...items]);
    }
  };

  const poll = async () => {
    if (pollTimeout) {
      clearTimeout(pollTimeout);
      pollTimeout = null;
    }

    try {
      const result = await client.generate.check({
        id: data.generateId,
        since,
      });

      isRetrying = false;
      status = result.status;
      updateFromChunks(result.chunks);
      if (result.maxCreatedAt) {
        since = result.maxCreatedAt;
      }

      if (result.status === "COMPLETED") {
        await goto(`/study/${data.studySetId}`);
        return;
      }

      if (result.status === "ONGOING" || result.status === "CREATED") {
        pollTimeout = setTimeout(poll, POLL_INTERVAL_MS);
      }
    } catch {
      isRetrying = true;
      pollTimeout = setTimeout(poll, POLL_INTERVAL_MS * 2);
    }
  };

  $effect(() => {
    poll();
    return () => {
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  });
</script>

<div class="flex flex-col items-center py-8">
  <ProgressRing {progress} />

  <h1 class="mt-6 text-center text-lg font-semibold text-foreground">
    {statusText}
  </h1>
  <p class="mt-2 text-center text-sm text-muted-foreground">
    Estimasi selesai {estimatedCompletedAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}
  </p>

  {#if status === "ONGOING" || status === "CREATED"}
    <div class="mt-5 flex items-center gap-1.5" aria-hidden="true">
      <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground"
      ></span>
      <span
        class="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground [animation-delay:120ms]"
      ></span>
      <span
        class="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground [animation-delay:240ms]"
      ></span>
    </div>
  {/if}

  {#if isRetrying}
    <p class="mt-4 text-xs text-muted-foreground">Menyambungkan kembali…</p>
  {/if}

  {#if data.isInputTruncated}
    <p class="mt-4 max-w-sm text-center text-xs text-amber-600">
      PDF terlalu panjang; hanya sebagian yang diproses.
    </p>
  {/if}

  {#if status === "FAILED" || status === "PARTIAL_COMPLETED"}
    <div class="mt-8 text-center">
      <p class="text-sm text-muted-foreground">
        {status === "FAILED"
          ? "Terjadi kesalahan saat membuat materi."
          : "Beberapa materi berhasil dibuat, namun tidak semuanya."}
      </p>
      <Button class="mt-4" href="/study/{data.studySetId}">Lihat materi</Button>
    </div>
  {/if}

  {#if items.length > 0}
    <div class="mt-10 w-full max-w-md">
      <p
        class="mb-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Materi yang sudah dibuat
      </p>
      <Feed {items} />
      {#if items.length >= 10}
        <p class="mt-3 text-center text-xs text-muted-foreground">
          Menampilkan 10 item terbaru
        </p>
      {/if}
    </div>
  {/if}
</div>
```

Important notes:

- The page does not currently receive `startedAt` from the server load. Update Task 4 to return `startedAt` from the `generate` row.
- `isInputTruncated` should come from the initial poll or from server load. The first poll returns it; update `updateFromChunks` to also store `isInputTruncated`. Alternatively, fetch it once on mount and then poll.

- [ ] **Step 2: Update server load to include `startedAt` and `isInputTruncated`**

Open `src/routes/(app)/study/[studySetId]/waiting-room/+page.server.ts`. Replace the return object with:

```typescript
return {
  generateId,
  initialStatus: status,
  startedAt: row.startedAt,
  studySetId: params.studySetId,
};
```

Also update `getGenerateByStudySetId` service output to include `startedAt`:

Open `src/lib/schemas/generate.ts` and update `getGenerateByStudySetIdOutputSchema`:

```typescript
export const getGenerateByStudySetIdOutputSchema = v.object({
  generateId: v.string(),
  startedAt: v.number(),
  status: generateStatusSchema,
});
```

Update the service method to return `startedAt: row.startedAt`.

- [ ] **Step 3: Fetch `isInputTruncated` on first poll**

The `isInputTruncated` value is returned by `generate.check`. Store it in state:

```typescript
let isInputTruncated = $state(false);
```

In the `poll` success branch, set:

```typescript
isInputTruncated = result.isInputTruncated;
```

Remove the `data.isInputTruncated` reference in the template.

- [ ] **Step 4: Run type check, lint, and format**

Run: `rtk pnpm run check`
Run: `rtk pnpm run lint:agent`
Run: `pnpm run format`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/(app)/study/[studySetId]/waiting-room/+page.svelte \
  src/routes/(app)/study/[studySetId]/waiting-room/+page.server.ts \
  src/lib/server/services/generate/generate.service.ts \
  src/lib/schemas/generate.ts
git commit -m "feat(waiting-room): implement polling page"
```

---

## Task 6: Final verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm run test`
Expected: All tests pass, including the new `waiting-room.utils.test.ts`.

- [ ] **Step 2: Run type check and lint**

Run: `rtk pnpm run check`
Run: `rtk pnpm run lint:agent`
Run: `pnpm run format`
Expected: No errors.

- [ ] **Step 3: Manual smoke test**

Start the dev server: `portless` or `pnpm run dev`.
Navigate to `/study/<studySetId>/waiting-room` for a study set with an active generation.
Confirm:

- Progress ring renders and updates.
- Poll requests fire every ~3 seconds in the Network tab.
- New chapter/flashcard/quiz cards animate in as chunks arrive.
- Feed caps at 10 items.
- On `COMPLETED`, browser redirects to `/study/<studySetId>`.

- [ ] **Step 4: Final commit**

If any fixes were made during verification, commit them.

---

## Self-Review Checklist

- [ ] Spec coverage: every design section maps to a task above.
- [ ] No placeholders: no "TBD", "TODO", or vague steps.
- [ ] Type consistency: `GenerationItem`, `startedAt`, and `isInputTruncated` flow correctly.
- [ ] Tests: helper functions have unit tests.
- [ ] No chunk terminology in UI.
