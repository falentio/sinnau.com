<script lang="ts">
  import { page } from "$app/state";
  import SessionTable from "$lib/components/features/admin-dashboard/session-table.svelte";
  import StudySetPagination from "$lib/components/features/app/study-set-pagination.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import { navigateWithParams } from "$lib/utils/url";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let userIdInput = $state(page.url.searchParams.get("userId") ?? "");
  let studySetIdInput = $state(page.url.searchParams.get("studySetId") ?? "");

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
</script>

<div class="container mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Flashcard Sessions</h1>
  </div>

  <div class="mb-6 flex flex-wrap items-end gap-4">
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
    <Button onclick={handleSearch}>Search</Button>
  </div>

  {#if data.pagination === null}
    <p class="text-muted-foreground py-12 text-center">
      Enter a user ID or study set ID to search.
    </p>
  {:else if data.sessions.length === 0}
    <p class="text-muted-foreground py-12 text-center">No sessions found.</p>
  {:else}
    <SessionTable sessions={data.sessions} />

    {#if data.pagination.totalPages > 1}
      <div class="mt-6 flex justify-center">
        <StudySetPagination pagination={data.pagination} />
      </div>
    {/if}
  {/if}
</div>
