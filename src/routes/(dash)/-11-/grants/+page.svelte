<script lang="ts">
  import { page } from "$app/state";
  import GrantPlanDialog from "$lib/components/features/admin-dashboard/grant-plan-dialog.svelte";
  import GrantTable from "$lib/components/features/admin-dashboard/grant-table.svelte";
  import StudySetPagination from "$lib/components/features/app/study-set-pagination.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import { PLAN_KEYS, PLAN_NAME } from "$lib/schemas/plan.constant";
  import { navigateWithParams } from "$lib/utils/url";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let dialogOpen = $state(false);
  let userIdInput = $state(page.url.searchParams.get("userId") ?? "");

  const currentPlanKey = $derived(page.url.searchParams.get("planKey") ?? "");

  const handlePlanKeyChange = (value: string) => {
    navigateWithParams(page.url.searchParams, {
      page: null,
      planKey: value || null,
    });
  };

  const handleUserIdSearch = () => {
    navigateWithParams(page.url.searchParams, {
      page: null,
      userId: userIdInput || null,
    });
  };

  const handleUserIdKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUserIdSearch();
    }
  };
</script>

<div class="container mx-auto p-6">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">Plan Grants</h1>
    <Button onclick={() => (dialogOpen = true)}>Grant Plan</Button>
  </div>

  <div class="mb-6 flex flex-wrap items-end gap-4">
    <div class="flex flex-col gap-2">
      <Label for="plan-key-select">Plan Key</Label>
      <Select.Root
        type="single"
        value={currentPlanKey || undefined}
        onValueChange={handlePlanKeyChange}
      >
        <Select.Trigger class="w-40" id="plan-key-select">
          {currentPlanKey
            ? PLAN_NAME[currentPlanKey as keyof typeof PLAN_NAME]
            : "All Plans"}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All Plans</Select.Item>
          {#each PLAN_KEYS as key}
            <Select.Item value={key}>
              {PLAN_NAME[key]}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
    <div class="flex flex-col gap-2">
      <Label for="user-id-input">User ID</Label>
      <div class="flex gap-2">
        <Input
          id="user-id-input"
          placeholder="Search by user ID..."
          bind:value={userIdInput}
          onkeydown={handleUserIdKeydown}
          class="w-60"
        />
        <Button variant="outline" onclick={handleUserIdSearch}>Search</Button>
      </div>
    </div>
  </div>

  <GrantTable grants={data.grants} />

  {#if data.pagination.totalPages > 1}
    <div class="mt-6 flex justify-center">
      <StudySetPagination pagination={data.pagination} />
    </div>
  {/if}
</div>

<GrantPlanDialog bind:open={dialogOpen} />
