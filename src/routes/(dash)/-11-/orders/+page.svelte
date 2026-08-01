<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { page } from "$app/state";
  import StudySetPagination from "$lib/components/features/app/study-set-pagination.svelte";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { client } from "$lib/orpc";
  import { ORDER_STATUSES, PLAN_NAME } from "$lib/schemas/plan.constant";
  import { formatDateTime } from "$lib/utils/date";
  import { getErrorMessage } from "$lib/utils/error-messages";
  import { navigateWithParams } from "$lib/utils/url";
  import { Dollar01Icon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { ORPCError } from "@orpc/client";
  import { toast } from "svelte-sonner";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  type OrderStatus = (typeof ORDER_STATUSES)[number];

  let acceptOrderId = $state<string | null>(null);
  let accepting = $state(false);

  const currentStatus = $derived(
    (page.url.searchParams.get("status") ?? "") as OrderStatus | ""
  );

  const handleStatusChange = (value: string) => {
    navigateWithParams(page.url.searchParams, {
      page: null,
      status: value || null,
    });
  };

  const handleAccept = async () => {
    if (acceptOrderId === null) {
      return;
    }
    accepting = true;
    try {
      await client.plan.admin.acceptPayment({ orderId: acceptOrderId });
      toast.success("Payment accepted. The plan has been activated.");
      acceptOrderId = null;
      await invalidate("plan:orders");
    } catch (error) {
      if (error instanceof ORPCError) {
        toast.error(getErrorMessage(error));
      } else if (error instanceof Error) {
        toast.error(getErrorMessage(error));
      } else {
        toast.error("Failed to accept payment. Please try again.");
      }
    } finally {
      accepting = false;
    }
  };

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

  const acceptedOrder = $derived(
    acceptOrderId === null
      ? null
      : (data.orders.find((o) => o.id === acceptOrderId) ?? null)
  );
</script>

<div class="container mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Orders</h1>
    <p class="text-muted-foreground mt-1 text-sm">
      Subscription orders and payment records. Confirm payments that were not
      confirmed by the webhook.
    </p>
  </div>

  <div class="mb-6 flex flex-wrap items-end gap-4">
    <div class="flex flex-col gap-2">
      <Label for="status-select">Status</Label>
      <Select.Root
        type="single"
        value={currentStatus || undefined}
        onValueChange={handleStatusChange}
      >
        <Select.Trigger class="w-44" id="status-select">
          {currentStatus || "All Statuses"}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All Statuses</Select.Item>
          {#each ORDER_STATUSES as status}
            <Select.Item value={status}>{status}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
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
        No subscription orders match this view.
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
          <Table.Head class="text-right">Actions</Table.Head>
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
            <Table.Cell class="text-right">
              {#if order.status === "PENDING"}
                <Button
                  size="sm"
                  variant="outline"
                  onclick={() => (acceptOrderId = order.id)}
                >
                  Accept payment
                </Button>
              {/if}
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

<Dialog.Root
  open={acceptOrderId !== null}
  onOpenChange={(open) => {
    if (!open) {
      acceptOrderId = null;
    }
  }}
>
  <Dialog.Content showCloseButton={false}>
    <Dialog.Header>
      <Dialog.Title>Accept payment</Dialog.Title>
      <Dialog.Description>
        Confirm that payment for this order was received. The plan will be
        activated for the user immediately.
      </Dialog.Description>
    </Dialog.Header>
    {#if acceptedOrder}
      <div class="flex flex-col gap-2 rounded-lg border p-4 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">Order</span>
          <span class="font-mono text-xs">{acceptedOrder.id}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">User</span>
          <span class="font-mono text-xs">{acceptedOrder.userId}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">Plan</span>
          <span>{PLAN_NAME[acceptedOrder.planKey]}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">Amount</span>
          <span class="font-mono text-xs">
            {formatPrice(acceptedOrder.grossAmount)}
          </span>
        </div>
      </div>
    {/if}
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props: closeProps })}
          <Button {...closeProps} variant="outline" disabled={accepting}>
            Cancel
          </Button>
        {/snippet}
      </Dialog.Close>
      <Button onclick={handleAccept} disabled={accepting}>
        {accepting ? "Accepting..." : "Accept payment"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
