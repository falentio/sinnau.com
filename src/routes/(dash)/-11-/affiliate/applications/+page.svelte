<script lang="ts">
  import { page } from "$app/state";
  import AffiliateApplicationTable from "$lib/components/features/admin-dashboard/affiliate-application-table.svelte";
  import StudySetPagination from "$lib/components/features/app/study-set-pagination.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import { AFFILIATE_APPLICATION_STATUSES } from "$lib/schemas/affiliate.constant";
  import { navigateWithParams } from "$lib/utils/url";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const currentStatus = $derived(page.url.searchParams.get("status") ?? "");

  const handleStatusChange = (value: string) => {
    navigateWithParams(page.url.searchParams, {
      page: null,
      status: value || null,
    });
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "PENDING": {
        return "Pending";
      }
      case "ACCEPTED": {
        return "Accepted";
      }
      case "REJECTED": {
        return "Rejected";
      }
      default: {
        return s;
      }
    }
  };
</script>

<div class="container mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Affiliate Applications</h1>
  </div>

  <div class="mb-6 flex flex-wrap items-end gap-4">
    <div class="flex flex-col gap-2">
      <Select.Root
        type="single"
        value={currentStatus || undefined}
        onValueChange={handleStatusChange}
      >
        <Select.Trigger class="w-40">
          {currentStatus ? statusLabel(currentStatus) : "All Status"}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All Status</Select.Item>
          {#each AFFILIATE_APPLICATION_STATUSES as s}
            <Select.Item value={s}>
              {statusLabel(s)}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <AffiliateApplicationTable applications={data.applications} />

  {#if data.pagination.totalPages > 1}
    <div class="mt-6 flex justify-center">
      <StudySetPagination pagination={data.pagination} />
    </div>
  {/if}
</div>
