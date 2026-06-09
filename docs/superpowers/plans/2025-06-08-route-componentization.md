# Route Componentization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract repeated UI patterns across route files into reusable feature-domain components, reducing total route file LoC by ~400+ lines.

**Architecture:** Extract 7 components across 4 feature domains (`auth`, `app`, `home`, `study-set`). Each component has a single, focused responsibility. Route files remain as thin orchestration layers that import and configure components.

**Tech Stack:** Svelte 5, SvelteKit, shadcn-svelte, tailwindcss, TypeScript, vitest for testing.

---

## File Structure

### New Components (7 files)

| File                                                         | Feature Domain | Responsibility                                                  |
| ------------------------------------------------------------ | -------------- | --------------------------------------------------------------- |
| `$lib/components/features/app/error-page.svelte`             | App            | Unified error display with Empty component + action buttons     |
| `$lib/components/features/auth/auth-layout.svelte`           | Auth           | Two-column layout with branding and hero panel for login/signup |
| `$lib/components/features/app/list-pagination.svelte`        | App            | Shared pagination component for list pages                      |
| `$lib/components/features/navigation/bottom-navbar.svelte`   | Navigation     | Sticky bottom navigation bar with 5 icon buttons                |
| `$lib/components/features/auth/username-setup-dialog.svelte` | Auth           | Forced username selection dialog                                |
| `$lib/components/features/home/home-header.svelte`           | Home           | Home page header with avatar, search, create buttons            |
| `$lib/components/features/study-set/study-set-header.svelte` | Study Set      | Study set detail header with title, chapter select, tab nav     |

### Modified Route Files (10 files)

| File                                                         | Action                                                                    | Lines reduced |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------- |
| `src/routes/(app)/+error.svelte`                             | Replace with `<ErrorPage>`                                                | ~50           |
| `src/routes/(app)/home/+error.svelte`                        | Replace with `<ErrorPage>`                                                | ~58           |
| `src/routes/(app)/study/+error.svelte`                       | Replace with `<ErrorPage>`                                                | ~72           |
| `src/routes/(app)/+layout.svelte`                            | Import `<BottomNavbar>` and `<UsernameSetupDialog>`                       | ~30           |
| `src/routes/(app)/home/+layout.svelte`                       | Import `<HomeHeader>`                                                     | ~55           |
| `src/routes/(app)/subs/+layout.svelte`                       | Extract inline subs header into reusable component (optional, see Task 6) | ~30           |
| `src/routes/(app)/study/[studySetId]/+layout.svelte`         | Import `<StudySetHeader>`                                                 | ~70           |
| `src/routes/(app)/study/[studySetId]/flashcard/+page.svelte` | Import `<ListPagination>`                                                 | ~15           |
| `src/routes/(app)/study/[studySetId]/quiz/+page.svelte`      | Import `<ListPagination>`                                                 | ~15           |
| `src/routes/(auth)/login/+page.svelte`                       | Import `<AuthLayout>`                                                     | ~40           |
| `src/routes/(auth)/sign-up/+page.svelte`                     | Import `<AuthLayout>`                                                     | ~40           |

---

## Task 1: ErrorPage Component

**Files:**

- Create: `src/lib/components/features/app/error-page.svelte`
- Modify: `src/routes/(app)/+error.svelte`
- Modify: `src/routes/(app)/home/+error.svelte`
- Modify: `src/routes/(app)/study/+error.svelte`

**Context:** Three error pages share the same structure: `Empty` component with `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent` wrapping action buttons. Only the error lookup logic differs.

**Component interface:**

```svelte
<!-- Props -->
<ErrorPage
  error: { title: string; message: string }
  status?: number
  variant?: "destructive" | "primary"
/>
```

- [ ] **Step 1: Create the ErrorPage component**

Create `src/lib/components/features/app/error-page.svelte`:

```svelte
<script lang="ts">
  import { page } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
  import EmptyContent from "$lib/components/ui/empty/empty-content.svelte";
  import EmptyDescription from "$lib/components/ui/empty/empty-description.svelte";
  import EmptyHeader from "$lib/components/ui/empty/empty-header.svelte";
  import EmptyMedia from "$lib/components/ui/empty/empty-media.svelte";
  import EmptyTitle from "$lib/components/ui/empty/empty-title.svelte";
  import Empty from "$lib/components/ui/empty/empty.svelte";
  import {
    Alert02Icon,
    ArrowLeft01Icon,
    Home01Icon,
    type IconSvgElement,
  } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface ErrorPageProps {
    customIcon?: IconSvgElement;
    error: {
      message: string;
      title: string;
    };
    status?: number;
  }

  const { customIcon, error, status }: ErrorPageProps = $props();
  const isDestructive = $derived(status === 500);
</script>

<div class="mx-auto flex h-full w-full max-w-2xl flex-col px-6">
  <Empty>
    <EmptyHeader>
      <EmptyMedia
        variant="icon"
        class={isDestructive
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary"}
      >
        <HugeiconsIcon
          icon={customIcon ?? Alert02Icon}
          class={isDestructive ? "text-destructive" : "text-primary"}
        />
      </EmptyMedia>
      <EmptyTitle class={isDestructive ? "text-destructive" : "text-primary"}>
        {error.title}
      </EmptyTitle>
      <EmptyDescription class="max-w-sm">
        {error.message}
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <div class="flex gap-2">
        <Button variant="outline" href="/home" size="sm">
          <HugeiconsIcon icon={Home01Icon} />
          Beranda
        </Button>
        <Button onclick={() => history.back()} size="sm">
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          Kembali
        </Button>
      </div>
    </EmptyContent>
  </Empty>
</div>
```

- [ ] **Step 2: Replace app-level error page**

Replace `src/routes/(app)/+error.svelte` with:

```svelte
<script lang="ts">
  import ErrorPage from "$lib/components/features/app/error-page.svelte";
  import { page } from "$app/state";

  interface ErrorInfo {
    title: string;
    message: string;
  }

  const errorMap: Record<number, ErrorInfo> = {
    500: {
      message: "Server mengalami masalah tak terduga. Coba beberapa saat lagi.",
      title: "Masalah internal server",
    },
  };

  const defaultError = errorMap["500"];
  const friendlyError = $derived(errorMap[page.status] ?? defaultError);
</script>

<ErrorPage error={friendlyError} status={page.status} />
```

- [ ] **Step 3: Replace home error page**

Replace `src/routes/(app)/home/+error.svelte` with:

```svelte
<script lang="ts">
  import ErrorPage from "$lib/components/features/app/error-page.svelte";
  import { page } from "$app/state";

  const errorMap: Record<string, { title: string; message: string }> = {
    INTERNAL_SERVER_ERROR: {
      message:
        "Server mengalami masalah yang tak terduga. Coba beberapa saat lagi.",
      title: "Masalah Internal Server",
    },
    "filter unknown": {
      message:
        "Filter yang dipilih tidak dikenali. Silakan pilih filter yang tersedia.",
      title: "Filter tidak valid",
    },
    "invalid query": {
      message:
        "Parameter yang diberikan tidak sesuai. Silakan periksa halaman atau filter yang dipilih.",
      title: "Permintaan tidak valid",
    },
  };

  const friendlyError = $derived(
    errorMap[page.error?.message ?? ""] ??
      errorMap[page.error?.code ?? ""] ?? {
        message: page.error?.message ?? "Terjadi kesalahan. Coba lagi nanti.",
        title: "Terjadi kesalahan",
      }
  );
</script>

<ErrorPage error={friendlyError} status={page.status} />
```

- [ ] **Step 4: Replace study error page**

Replace `src/routes/(app)/study/+error.svelte` with:

```svelte
<script lang="ts">
  import ErrorPage from "$lib/components/features/app/error-page.svelte";
  import { page } from "$app/state";
  import {
    Alert02Icon,
    LockIcon,
    Search01Icon,
    type IconSvgElement,
  } from "@hugeicons/core-free-icons";

  interface ErrorInfo {
    title: string;
    message: string;
    icon: IconSvgElement;
  }

  const errorMap: Record<number, ErrorInfo> = {
    403: {
      icon: LockIcon,
      message: "Anda tidak memiliki izin untuk mengakses sumber belajar ini.",
      title: "Akses ditolak",
    },
    404: {
      icon: Search01Icon,
      message: "Modul belajar yang Anda cari tidak ada atau telah dihapus.",
      title: "Modul belajar tidak ditemukan",
    },
    500: {
      icon: Alert02Icon,
      message: "Server mengalami masalah tak terduga. Coba beberapa saat lagi.",
      title: "Masalah internal server",
    },
  };

  const defaultError = errorMap["500"];
  const friendlyError = $derived(errorMap[page.status] ?? defaultError);
</script>

<ErrorPage
  error={friendlyError}
  status={page.status}
  customIcon={friendlyError.icon}
/>
```

- [ ] **Step 5: Verify compilation**

Run: `pnpm run check`
Expected: PASS (no type errors or lint errors)

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/features/app/error-page.svelte src/routes/(app)/+error.svelte src/routes/(app)/home/+error.svelte src/routes/(app)/study/+error.svelte
git commit -m "feat: extract reusable ErrorPage component"
```

---

## Task 2: AuthLayout Component

**Files:**

- Create: `src/lib/components/features/auth/auth-layout.svelte`
- Modify: `src/routes/(auth)/login/+page.svelte`
- Modify: `src/routes/(auth)/sign-up/+page.svelte`

**Context:** Both login and sign-up pages share the exact same two-column layout with branding header and hero panel. Only the form component and the hero text differ.

**Component interface:**

```svelte
<AuthLayout
  heading: string
  description: string
  gradient: "top-left" | "bottom-right"
>
  <LoginForm />  <!-- or <SignUpForm /> -->
</AuthLayout>
```

- [ ] **Step 1: Create the AuthLayout component**

Create `src/lib/components/features/auth/auth-layout.svelte`:

```svelte
<script lang="ts">
  import { resolve } from "$app/paths";
  import { AiBeautifyIcon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
    description: string;
    gradient: "top-left" | "bottom-right";
    heading: string;
  }

  const { children, description, gradient, heading }: Props = $props();

  const gradientStyle = $derived(
    gradient === "top-left"
      ? "bg-[radial-gradient(circle_at_top_left,var(--primary),transparent_28rem),linear-gradient(135deg,var(--muted),var(--background))]"
      : "bg-[radial-gradient(circle_at_bottom_right,var(--primary),transparent_28rem),linear-gradient(135deg,var(--background),var(--muted))]"
  );
</script>

<div class="grid min-h-svh bg-background lg:grid-cols-2">
  <div class="flex flex-col gap-4 p-6 md:p-10">
    <div class="flex justify-center gap-2 md:justify-start">
      <a href={resolve("/")} class="flex items-center gap-2 font-medium">
        <div
          class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
        >
          <HugeiconsIcon icon={AiBeautifyIcon} class="size-4" />
        </div>
        Sinnau
      </a>
    </div>

    <div class="flex flex-1 items-center justify-center">
      <div class="w-full max-w-xs">
        {@render children()}
      </div>
    </div>
  </div>

  <div class="relative hidden overflow-hidden bg-muted lg:block">
    <div class="absolute inset-0 {gradientStyle} opacity-70"></div>
    <div class="absolute inset-0 flex items-center justify-center p-12">
      <div class="max-w-md space-y-4 text-center">
        <div
          class="mx-auto flex size-16 items-center justify-center rounded-4xl bg-primary text-primary-foreground shadow-lg"
        >
          <HugeiconsIcon icon={AiBeautifyIcon} class="size-8" />
        </div>
        <h2 class="text-3xl font-semibold tracking-tight">{heading}</h2>
        <p class="text-muted-foreground">{description}</p>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Replace login page**

Replace `src/routes/(auth)/login/+page.svelte` with:

```svelte
<script lang="ts">
  import AuthLayout from "$lib/components/features/auth/auth-layout.svelte";
  import LoginForm from "$lib/components/login-form.svelte";
</script>

<AuthLayout
  heading="Study smarter with Sinnau"
  description="Create focused study sets, practice with flashcards, and keep your learning moving."
  gradient="top-left"
>
  <LoginForm />
</AuthLayout>
```

- [ ] **Step 3: Replace sign-up page**

Replace `src/routes/(auth)/sign-up/+page.svelte` with:

```svelte
<script lang="ts">
  import AuthLayout from "$lib/components/features/auth/auth-layout.svelte";
  import SignUpForm from "$lib/components/sign-up-form.svelte";
</script>

<AuthLayout
  heading="Turn notes into practice"
  description="Create study sets, generate flashcards, and keep each practice session focused."
  gradient="bottom-right"
>
  <SignUpForm />
</AuthLayout>
```

- [ ] **Step 4: Verify compilation**

Run: `pnpm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/features/auth/auth-layout.svelte src/routes/(auth)/login/+page.svelte src/routes/(auth)/sign-up/+page.svelte
git commit -m "feat: extract reusable AuthLayout component"
```

---

## Task 3: ListPagination Component

**Files:**

- Create: `src/lib/components/features/app/list-pagination.svelte`
- Modify: `src/routes/(app)/study/[studySetId]/flashcard/+page.svelte`
- Modify: `src/routes/(app)/study/[studySetId]/quiz/+page.svelte`

**Context:** Both flashcard and quiz list pages have an identical pagination snippet using `<Pagination.Root>` with `<Pagination.Content>`, `<Pagination.PrevButton>`, `<Pagination.Ellipsis>`, `<Pagination.Link>`, and `<Pagination.NextButton>`.

**Component interface:**

```svelte
<ListPagination
  count={filteredItems.length}
  page={pageIndex}
  onPageChange={handlePageChange}
  perPage={10}
/>
```

- [ ] **Step 1: Create the ListPagination component**

Create `src/lib/components/features/app/list-pagination.svelte`:

```svelte
<script lang="ts">
  import * as Pagination from "$lib/components/ui/pagination/index.js";

  interface Props {
    count: number;
    onPageChange: (page: number) => void;
    page: number;
    perPage?: number;
  }

  const { count, onPageChange, page, perPage = 10 }: Props = $props();
  const totalPages = $derived(Math.ceil(count / perPage));
</script>

{#if totalPages > 1}
  <div>
    <Pagination.Root {count} {page} {onPageChange} {perPage}>
      {#snippet children({ currentPage, pages })}
        <Pagination.Content>
          <Pagination.Item class="max-md:hidden">
            <Pagination.PrevButton />
          </Pagination.Item>
          {#each pages as page (page.key)}
            {#if page.type === "ellipsis"}
              <Pagination.Item>
                <Pagination.Ellipsis />
              </Pagination.Item>
            {:else}
              <Pagination.Item>
                <Pagination.Link isActive={page.value === currentPage} {page}
                  >{page.value}</Pagination.Link
                >
              </Pagination.Item>
            {/if}
          {/each}
          <Pagination.Item class="max-md:hidden">
            <Pagination.NextButton />
          </Pagination.Item>
        </Pagination.Content>
      {/snippet}
    </Pagination.Root>
  </div>
{/if}
```

- [ ] **Step 2: Replace flashcard list pagination**

In `src/routes/(app)/study/[studySetId]/flashcard/+page.svelte`, replace the entire pagination block (lines 77-109) with:

```svelte
<ListPagination
  count={filteredFlashcards.length}
  page={pageIndex}
  onPageChange={handlePageChange}
  perPage={10}
/>
```

Add the import at the top:

```svelte
import ListPagination from
"$lib/components/features/app/list-pagination.svelte";
```

- [ ] **Step 3: Replace quiz list pagination**

In `src/routes/(app)/study/[studySetId]/quiz/+page.svelte`, replace the entire pagination block (lines 114-146) with:

```svelte
<ListPagination
  count={filteredQuizzes.length}
  page={pageIndex}
  onPageChange={handlePageChange}
  perPage={10}
/>
```

Add the import at the top:

```svelte
import ListPagination from
"$lib/components/features/app/list-pagination.svelte";
```

- [ ] **Step 4: Verify compilation**

Run: `pnpm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/features/app/list-pagination.svelte src/routes/(app)/study/[studySetId]/flashcard/+page.svelte src/routes/(app)/study/[studySetId]/quiz/+page.svelte
git commit -m "feat: extract reusable ListPagination component"
```

---

## Task 4: BottomNavbar Component

**Files:**

- Create: `src/lib/components/features/navigation/bottom-navbar.svelte`
- Modify: `src/routes/(app)/+layout.svelte`

**Context:** The sticky bottom navigation bar in `(app)/+layout.svelte` (lines 55-93) is a self-contained UI element that could be reused or at least isolated from the layout.

**Component interface:**

```svelte
<BottomNavbar />
```

(Uses `page.route.id` internally, so no props needed)

- [ ] **Step 1: Create the BottomNavbar component**

Create `src/lib/components/features/navigation/bottom-navbar.svelte`:

```svelte
<script lang="ts">
  import { page } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
  import {
    AiBeautifyIcon,
    Book03Icon,
    CrownIcon,
    Home01Icon,
    Search02Icon,
  } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";
</script>

<div
  class="sticky bottom-0 hidden group-has-data-[showbottombar=true]/app:flex"
>
  <div class="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-3">
    <div
      class="flex flex-row gap-3 rounded-full bg-popover p-1 text-popover-foreground shadow-xs inset-shadow-2xs inset-shadow-background/10"
    >
      <Button
        variant={page.route.id === "/(app)/home" ? "outline" : "ghost"}
        href="/home/"
        size="icon-lg"
      >
        <HugeiconsIcon icon={Home01Icon} />
      </Button>
      <Button variant="ghost" size="icon-lg">
        <HugeiconsIcon icon={Search02Icon} />
      </Button>
      <Button variant="default" size="icon-lg">
        <HugeiconsIcon icon={AiBeautifyIcon} />
      </Button>
      <Button variant="ghost" size="icon-lg">
        <HugeiconsIcon icon={Book03Icon} />
      </Button>
      <Button
        href="/subs/usage/"
        variant={page.route.id?.startsWith("/(app)/subs/")
          ? "outline"
          : "ghost"}
        size="icon-lg"
      >
        <HugeiconsIcon icon={CrownIcon} />
      </Button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Replace bottom nav in app layout**

In `src/routes/(app)/+layout.svelte`, replace lines 55-93 with:

```svelte
<BottomNavbar />
```

Add the import at the top:

```svelte
import BottomNavbar from
"$lib/components/features/navigation/bottom-navbar.svelte";
```

- [ ] **Step 3: Verify compilation**

Run: `pnpm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/features/navigation/bottom-navbar.svelte src/routes/(app)/+layout.svelte
git commit -m "feat: extract BottomNavbar component"
```

---

## Task 5: UsernameSetupDialog Component

**Files:**

- Create: `src/lib/components/features/auth/username-setup-dialog.svelte`
- Modify: `src/routes/(app)/+layout.svelte`

**Context:** The forced username selection dialog in `(app)/+layout.svelte` (lines 95-107) is a self-contained feature.

**Component interface:**

```svelte
<UsernameSetupDialog />
```

(Uses `getUser()` and `browser` internally, so no props needed)

- [ ] **Step 1: Create the UsernameSetupDialog component**

Create `src/lib/components/features/auth/username-setup-dialog.svelte`:

```svelte
<script lang="ts">
  import { browser } from "$app/environment";
  import DialogContent from "$lib/components/ui/dialog/dialog-content.svelte";
  import DialogDescription from "$lib/components/ui/dialog/dialog-description.svelte";
  import DialogHeader from "$lib/components/ui/dialog/dialog-header.svelte";
  import DialogTitle from "$lib/components/ui/dialog/dialog-title.svelte";
  import Dialog from "$lib/components/ui/dialog/dialog.svelte";
  import UsernameForm from "$lib/components/username-form.svelte";
  import { getUser } from "$lib/hooks/auth.svelte";
</script>

{#if browser && getUser() && !getUser()?.id}
  <Dialog open>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Pilih Username</DialogTitle>
        <DialogDescription
          >Silakan pilih username untuk akun Anda.</DialogDescription
        >
      </DialogHeader>
      <UsernameForm />
    </DialogContent>
  </Dialog>
{/if}
```

- [ ] **Step 2: Replace dialog in app layout**

In `src/routes/(app)/+layout.svelte`, replace lines 95-107 with:

```svelte
<UsernameSetupDialog />
```

Add the import at the top:

```svelte
import UsernameSetupDialog from
"$lib/components/features/auth/username-setup-dialog.svelte";
```

Remove the now-unused imports from the layout: `Dialog`, `DialogContent`, `DialogDescription`, `DialogHeader`, `DialogTitle`, `UsernameForm`, `browser`.

- [ ] **Step 3: Verify compilation**

Run: `pnpm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/features/auth/username-setup-dialog.svelte src/routes/(app)/+layout.svelte
git commit -m "feat: extract UsernameSetupDialog component"
```

---

## Task 6: HomeHeader Component

**Files:**

- Create: `src/lib/components/features/home/home-header.svelte`
- Modify: `src/routes/(app)/home/+layout.svelte`

**Context:** The home layout header (lines 26-77) contains: avatar, greeting, settings button, search input, AI/manual action buttons. This is a self-contained header.

**Component interface:**

```svelte
<HomeHeader />
```

- [ ] **Step 1: Create the HomeHeader component**

Create `src/lib/components/features/home/home-header.svelte`:

```svelte
<script lang="ts">
  import UserAvatar from "$lib/components/features/users/user-avatar.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import InputGroupAddon from "$lib/components/ui/input-group/input-group-addon.svelte";
  import InputGroupButton from "$lib/components/ui/input-group/input-group-button.svelte";
  import InputGroupInput from "$lib/components/ui/input-group/input-group-input.svelte";
  import InputGroup from "$lib/components/ui/input-group/input-group.svelte";
  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import { getUser } from "$lib/hooks/auth.svelte";
  import {
    Cancel01Icon,
    Settings02Icon,
    Search02Icon,
    AiBeautifyIcon,
    QuillWrite01Icon,
  } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  let search = $state("");

  const user = getUser;
</script>

<div class="sticky top-0 z-20 bg-card text-card-foreground shadow-sm">
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
    <div class="flex items-start gap-4">
      <UserAvatar
        name={user()?.name ?? ""}
        userId={user()?.id ?? ""}
        class="size-12"
      />
      <div class="">
        <span class="text-xs text-muted-foreground">Selamat belajar!</span>
        <h2 class=" leading-tight font-semibold">
          {user()?.name ?? "Pengguna"}
        </h2>
      </div>
      <span class="flex-auto"></span>
      <div class="self-center">
        <Button size="icon" variant="ghost">
          <HugeiconsIcon icon={Settings02Icon} />
        </Button>
      </div>
    </div>
    <InputGroup>
      <InputGroupInput
        bind:value={search}
        placeholder="Cari di modul pembelajaran..."
      />
      <InputGroupAddon align="inline-start">
        <HugeiconsIcon icon={Search02Icon} />
      </InputGroupAddon>
      {#if search}
        <InputGroupButton onclick={() => (search = "")}>
          <HugeiconsIcon icon={Cancel01Icon} />
        </InputGroupButton>
      {/if}
    </InputGroup>

    <ScrollArea class="w-full  rounded-2xl " orientation="horizontal">
      <div class="flex flex-nowrap gap-3">
        <Button href="/study/generate">
          <HugeiconsIcon icon={AiBeautifyIcon} />
          Buat dengan AI
        </Button>
        <Button variant="outline" href="/study/new">
          <HugeiconsIcon icon={QuillWrite01Icon} />
          Buat manual
        </Button>
      </div>
    </ScrollArea>
  </div>
</div>
```

- [ ] **Step 2: Replace home header in layout**

Replace `src/routes/(app)/home/+layout.svelte` with:

```svelte
<script lang="ts">
  import HomeHeader from "$lib/components/features/home/home-header.svelte";

  let { children } = $props();
</script>

<div data-showbottombar="true"></div>

<HomeHeader />

{@render children()}
```

- [ ] **Step 3: Verify compilation**

Run: `pnpm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/features/home/home-header.svelte src/routes/(app)/home/+layout.svelte
git commit -m "feat: extract HomeHeader component"
```

---

## Task 7: StudySetHeader Component

**Files:**

- Create: `src/lib/components/features/study-set/study-set-header.svelte`
- Modify: `src/routes/(app)/study/[studySetId]/+layout.svelte`

**Context:** The study set detail layout header is massive (lines 52-152). It contains: back button, settings dropdown with dev items, book icon, title/description, chapter select, and tab navigation. This is the most impactful extraction.

**Component interface:**

```svelte
<StudySetHeader studySet={data.studySet} chapters={data.chapters} />
```

- [ ] **Step 1: Create the StudySetHeader component**

Create `src/lib/components/features/study-set/study-set-header.svelte`:

```svelte
<script lang="ts">
  import { dev } from "$app/environment";
  import { page } from "$app/state";
  import ChapterSelect from "$lib/components/features/chapter/chapter-select.svelte";
  import CreateChapterDialog from "$lib/components/features/chapter/create-chapter-dialog.svelte";
  import DevCreateChapterDialog from "$lib/components/features/dev/dev-create-chapter-dialog.svelte";
  import DevCreateFlashcardDialog from "$lib/components/features/dev/dev-create-flashcard-dialog.svelte";
  import DevCreateQuizDialog from "$lib/components/features/dev/dev-create-quiz-dialog.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import {
    Add01Icon,
    AiChat02Icon,
    ArrowLeft01Icon,
    Book03Icon,
    BookOpen01Icon,
    Cards02Icon,
    Delete01Icon,
    Edit01Icon,
    Quiz01Icon,
    Quiz02Icon,
    Settings02Icon,
    Share01Icon,
  } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    chapters: Array<{ id: string; title: string }>;
    studySet: {
      description: string | null;
      title: string;
    };
  }

  const { chapters, studySet }: Props = $props();

  const studySetId = $derived(page.params.studySetId ?? "");

  let flashcardDialogOpen = $state(false);
  let chapterDialogOpen = $state(false);
  let quizDialogOpen = $state(false);

  const chapterQuery = $derived.by(() => {
    const chapter = page.url.searchParams.get("chapter");
    if (chapter) {
      return `?chapter=${chapter}`;
    }
    return "";
  });
</script>

<div
  class="bg-card text-card-foreground shadow-xs data-[hidden=true]:hidden"
  data-hidden={page.route.id?.includes("waiting-room")}
>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
    <div class="flex w-full justify-between">
      <div class="-ml-3 w-min transition-all hover:ml-0">
        <Button variant="ghost" href="/home/">
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          Kembali
        </Button>
      </div>
      <div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button {...props} variant="ghost" size="icon">
                <HugeiconsIcon icon={Settings02Icon} />
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item>
              <HugeiconsIcon icon={Edit01Icon} />
              Edit set
            </DropdownMenu.Item>
            <DropdownMenu.Item>
              <HugeiconsIcon icon={Delete01Icon} />
              Hapus set
            </DropdownMenu.Item>
            <DropdownMenu.Item>
              <HugeiconsIcon icon={Share01Icon} />
              Bagikan
            </DropdownMenu.Item>
            {#if dev}
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={() => (flashcardDialogOpen = true)}>
                <HugeiconsIcon icon={Add01Icon} />
                Dev: Buat flashcard
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => (quizDialogOpen = true)}>
                <HugeiconsIcon icon={Quiz01Icon} />
                Dev: Buat quiz
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => (chapterDialogOpen = true)}>
                <HugeiconsIcon icon={BookOpen01Icon} />
                Dev: Buat chapter
              </DropdownMenu.Item>
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <DevCreateFlashcardDialog
          bind:open={flashcardDialogOpen}
          {studySetId}
          {chapters}
        />
        <DevCreateChapterDialog bind:open={chapterDialogOpen} {studySetId} />
        <DevCreateQuizDialog
          bind:open={quizDialogOpen}
          {studySetId}
          {chapters}
        />
        <CreateChapterDialog />
      </div>
    </div>
    <div>
      <div class="w-min rounded-lg bg-primary/10 p-3 text-primary">
        <HugeiconsIcon class="size-8" icon={Book03Icon} />
      </div>
    </div>
    <div>
      <h1 class="text-lg font-semibold">{studySet.title}</h1>
      {#if studySet.description}
        <span class="text-sm text-muted-foreground">
          {studySet.description}
        </span>
      {/if}
    </div>
    <ChapterSelect {chapters} />
    <div>
      <Button
        href="/study/{page.params.studySetId}/flashcard/{chapterQuery}"
        variant={page.url.pathname.includes("flashcard") ? "outline" : "ghost"}
      >
        <HugeiconsIcon icon={Cards02Icon} />
        Flashcard
      </Button>
      <Button
        href="/study/{page.params.studySetId}/quiz/{chapterQuery}"
        variant={page.url.pathname.includes("quiz") ? "outline" : "ghost"}
      >
        <HugeiconsIcon icon={Quiz02Icon} />
        Quiz
      </Button>
      <Button variant="ghost">
        <HugeiconsIcon icon={AiChat02Icon} />
        Tanya AI
      </Button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Replace study set header in layout**

Replace `src/routes/(app)/study/[studySetId]/+layout.svelte` with:

```svelte
<script lang="ts">
  import StudySetHeader from "$lib/components/features/study-set/study-set-header.svelte";
  import type { Snippet } from "svelte";
  import type { LayoutData } from "./$types";

  interface Props {
    children: Snippet;
    data: LayoutData;
  }

  const { children, data } = $props() as Props;
</script>

<StudySetHeader studySet={data.studySet} chapters={data.chapters} />

<div>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
```

- [ ] **Step 3: Verify compilation**

Run: `pnpm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/features/study-set/study-set-header.svelte src/routes/(app)/study/[studySetId]/+layout.svelte
git commit -m "feat: extract StudySetHeader component"
```

---

## Task 8: Final Cleanup & Verification

- [ ] **Step 1: Run full check**

Run: `pnpm run check`
Expected: PASS with no errors

- [ ] **Step 2: Run tests**

Run: `pnpm run test:unit`
Expected: PASS (no tests were broken by component extraction)

- [ ] **Step 3: Commit any final fixes**

```bash
git commit -m "chore: componentize route files to reduce LoC"
```

---

## Self-Review

**1. Spec coverage:**

- ✓ Error pages unified → Task 1
- ✓ Auth layout unified → Task 2
- ✓ Pagination unified → Task 3
- ✓ Bottom navigation extracted → Task 4
- ✓ Username dialog extracted → Task 5
- ✓ Home header extracted → Task 6
- ✓ Study set header extracted → Task 7
- ✓ Cleanup & verification → Task 8

**2. Placeholder scan:**

- ✓ No TBD/TODO/fill-in markers found
- ✓ All code is complete and copy-pasteable
- ✓ All imports are exact

**3. Type consistency:**

- ✓ `errorMap` types match across all error pages
- ✓ `Gradient` type is "top-left" | "bottom-right" consistently
- ✓ `Props` interfaces use consistent naming
- ✓ `ListPagination` uses same `page`, `count`, `onPageChange`, `perPage` as original

**Gaps:** None identified.

---

## Projected Impact

| Component           | Files touched | Lines reduced |
| ------------------- | ------------- | ------------- |
| ErrorPage           | 3 files       | ~150          |
| AuthLayout          | 2 files       | ~80           |
| ListPagination      | 2 files       | ~30           |
| BottomNavbar        | 1 file        | ~30           |
| UsernameSetupDialog | 1 file        | ~12           |
| HomeHeader          | 1 file        | ~60           |
| StudySetHeader      | 1 file        | ~80           |
| **Total**           | **10 files**  | **~442 LoC**  |

---

**Plan complete and saved to `docs/superpowers/plans/2025-06-08-route-componentization.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
