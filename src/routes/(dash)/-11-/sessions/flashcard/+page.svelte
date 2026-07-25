<script lang="ts">
  import { page } from "$app/state";
  import SessionTable from "$lib/components/features/admin-dashboard/session-table.svelte";
  import StudySetPagination from "$lib/components/features/app/study-set-pagination.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import { navigateWithParams } from "$lib/utils/url";
  import { Cards01Icon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let userIdInput = $state(page.url.searchParams.get("userId") ?? "");
  let studySetIdInput = $state(page.url.searchParams.get("studySetId") ?? "");

  const hasFilter = $derived(
    page.url.searchParams.has("userId") ||
      page.url.searchParams.has("studySetId")
  );

  const handleSearch = () => {
    navigateWithParams(page.url.searchParams, {
      page: null,
      studySetId: studySetIdInput || null,
      userId: userIdInput || null,
    });
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClear = () => {
    userIdInput = "";
    studySetIdInput = "";
    navigateWithParams(page.url.searchParams, {
      page: null,
      studySetId: null,
      userId: null,
    });
  };
</script>

<div class="container mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Flashcard Sessions</h1>
  </div>

  <Card.Root class="mb-6">
    <Card.Content>
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex flex-col gap-2">
          <Label for="user-id-input">User ID</Label>
          <Input
            id="user-id-input"
            placeholder="Filter by user ID..."
            bind:value={userIdInput}
            onkeydown={handleKeydown}
            class="w-60"
          />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="study-set-id-input">Study Set ID</Label>
          <Input
            id="study-set-id-input"
            placeholder="Filter by study set ID..."
            bind:value={studySetIdInput}
            onkeydown={handleKeydown}
            class="w-60"
          />
        </div>
        <div class="flex gap-2">
          <Button onclick={handleSearch}>Search</Button>
          {#if hasFilter}
            <Button variant="ghost" onclick={handleClear}>Clear</Button>
          {/if}
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  {#if !hasFilter}
    <div class="flex flex-col items-center justify-center py-16">
      <div
        class="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10"
      >
        <HugeiconsIcon icon={Cards01Icon} class="size-8 text-primary" />
      </div>
      <h2 class="mb-2 text-lg font-semibold">Search Sessions</h2>
      <p class="text-muted-foreground mb-6 max-w-md text-center text-sm">
        Enter a User ID or Study Set ID above to browse flashcard sessions.
      </p>
      <div class="flex flex-col gap-2 text-xs text-muted-foreground">
        <p>
          Copy a User ID from the <a href="/-11-/users" class="underline"
            >Users page</a
          >
        </p>
        <p>Study Set IDs can be found in study set URLs</p>
      </div>
    </div>
  {:else if data.sessions.length === 0}
    <div class="flex flex-col items-center justify-center py-16">
      <p class="text-muted-foreground text-sm">No sessions found.</p>
    </div>
  {:else}
    <SessionTable sessions={data.sessions} />

    {#if data.pagination && data.pagination.totalPages > 1}
      <div class="mt-6 flex justify-center">
        <StudySetPagination pagination={data.pagination} />
      </div>
    {/if}
  {/if}
</div>
