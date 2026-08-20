<script lang="ts">
  import StudySetPagination from "$lib/components/features/app/study-set-pagination.svelte";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import * as Table from "$lib/components/ui/table/index.js";
  import { formatDateTime } from "$lib/utils/date";
  import { Wallet01Icon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      currency: "IDR",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      style: "currency",
    }).format(amount);

  const truncate = (value: string, length = 16) =>
    value.length > length ? `${value.slice(0, length)}…` : value;
</script>

<div class="container mx-auto p-6">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Affiliate Payout History</h1>
      <p class="text-muted-foreground mt-1 text-sm">
        View completed affiliate payouts.
      </p>
    </div>
    <a
      href="/-11-/affiliate/payouts"
      class="text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      View pending payouts
    </a>
  </div>

  {#if data.history.length === 0}
    <div class="flex flex-col items-center justify-center py-16">
      <div
        class="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10"
      >
        <HugeiconsIcon icon={Wallet01Icon} class="size-8 text-primary" />
      </div>
      <h2 class="mb-2 text-lg font-semibold">No Payouts Yet</h2>
      <p class="text-muted-foreground text-sm">
        Completed payouts will appear here.
      </p>
    </div>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Payout ID</Table.Head>
          <Table.Head>Affiliate</Table.Head>
          <Table.Head>Slug</Table.Head>
          <Table.Head>Amount</Table.Head>
          <Table.Head>Method</Table.Head>
          <Table.Head>Reference</Table.Head>
          <Table.Head>Processed By</Table.Head>
          <Table.Head>Date</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each data.history as payout (payout.id)}
          <Table.Row>
            <Table.Cell
              class="max-w-32 truncate font-mono text-xs"
              title={payout.id}
            >
              {truncate(payout.id)}
            </Table.Cell>
            <Table.Cell
              class="max-w-32 truncate font-mono text-xs"
              title={payout.affiliateUserId}
            >
              {truncate(payout.affiliateUserId)}
            </Table.Cell>
            <Table.Cell class="font-mono text-xs">
              {payout.slug}
            </Table.Cell>
            <Table.Cell class="font-mono text-xs font-medium">
              {formatPrice(payout.amount)}
            </Table.Cell>
            <Table.Cell>
              {#if payout.method}
                <Badge variant="secondary">{payout.method}</Badge>
              {:else}
                <span class="text-muted-foreground text-xs">—</span>
              {/if}
            </Table.Cell>
            <Table.Cell
              class="max-w-32 truncate font-mono text-xs"
              title={payout.reference ?? ""}
            >
              {payout.reference ?? "—"}
            </Table.Cell>
            <Table.Cell
              class="max-w-32 truncate font-mono text-xs"
              title={payout.processedByAdminId}
            >
              {truncate(payout.processedByAdminId)}
            </Table.Cell>
            <Table.Cell class="text-nowrap text-xs">
              {formatDateTime(payout.createdAt)}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>

    {#if data.pagination.totalPages > 1}
      <div class="mt-6 flex justify-center">
        <StudySetPagination pagination={data.pagination} />
      </div>
    {/if}
  {/if}
</div>
