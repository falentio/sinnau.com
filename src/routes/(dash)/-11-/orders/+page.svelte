<script lang="ts">
  import StudySetPagination from "$lib/components/features/app/study-set-pagination.svelte";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import * as Table from "$lib/components/ui/table/index.js";
  import { PLAN_NAME } from "$lib/schemas/plan.constant";
  import { formatDateTime } from "$lib/utils/date";
  import { Dollar01Icon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const statusVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "PAID": {
        return "default";
      }
      case "PENDING": {
        return "secondary";
      }
      case "EXPIRED": {
        return "outline";
      }
      case "CANCELLED": {
        return "destructive";
      }
      default: {
        return "outline";
      }
    }
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      currency: "IDR",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      style: "currency",
    }).format(amount);
</script>

<div class="container mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Orders</h1>
    <p class="text-muted-foreground mt-1 text-sm">
      Subscription orders and payment records.
    </p>
  </div>

  {#if data.orders.length === 0}
    <div class="flex flex-col items-center justify-center py-16">
      <div
        class="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10"
      >
        <HugeiconsIcon icon={Dollar01Icon} class="size-8 text-primary" />
      </div>
      <h2 class="mb-2 text-lg font-semibold">No Orders</h2>
      <p class="text-muted-foreground text-sm">
        No subscription orders have been placed yet.
      </p>
    </div>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Order ID</Table.Head>
          <Table.Head>User ID</Table.Head>
          <Table.Head>Plan</Table.Head>
          <Table.Head>Amount</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head>Created</Table.Head>
          <Table.Head>Expires</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each data.orders as order (order.id)}
          <Table.Row>
            <Table.Cell class="max-w-32 truncate font-mono text-xs">
              {order.id}
            </Table.Cell>
            <Table.Cell class="max-w-40 truncate font-mono text-xs">
              {order.userId}
            </Table.Cell>
            <Table.Cell>
              <Badge variant="secondary">
                {PLAN_NAME[order.planKey]}
              </Badge>
            </Table.Cell>
            <Table.Cell class="font-mono text-xs">
              {formatPrice(order.grossAmount)}
            </Table.Cell>
            <Table.Cell>
              <Badge variant={statusVariant(order.status)}>
                {order.status}
              </Badge>
            </Table.Cell>
            <Table.Cell class="text-nowrap">
              {formatDateTime(order.createdAt)}
            </Table.Cell>
            <Table.Cell class="text-nowrap">
              {order.expiresAt ? formatDateTime(order.expiresAt) : "\u2014"}
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
