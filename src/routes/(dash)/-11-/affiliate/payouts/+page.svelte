<script lang="ts">
  import { invalidate } from "$app/navigation";
  import StudySetPagination from "$lib/components/features/app/study-set-pagination.svelte";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Table from "$lib/components/ui/table/index.js";
  import { client } from "$lib/orpc";
  import type { PendingPayout } from "$lib/schemas/affiliate";
  import { getErrorMessage } from "$lib/utils/error-messages";
  import { Wallet01Icon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { ORPCError } from "@orpc/client";
  import { toast } from "svelte-sonner";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let payoutDialogOpen = $state(false);
  let payoutUserId = $state("");
  let payoutMethod = $state("");
  let payoutNote = $state("");
  let payoutReference = $state("");
  let submitting = $state(false);

  const handleRecordPayout = (payout: PendingPayout) => {
    payoutUserId = payout.affiliateUserId;
    payoutMethod = payout.payoutAccount?.method ?? "";
    payoutNote = "";
    payoutReference = "";
    payoutDialogOpen = true;
  };

  const confirmPayout = async () => {
    submitting = true;
    try {
      await client.affiliate.admin.recordPayout({
        affiliateUserId: payoutUserId,
        method: payoutMethod || undefined,
        note: payoutNote || undefined,
        reference: payoutReference || undefined,
      });
      toast.success("Payout recorded");
      payoutDialogOpen = false;
      await invalidate("affiliate:payouts");
    } catch (error) {
      if (error instanceof ORPCError) {
        toast.error(getErrorMessage(error));
      } else {
        toast.error("Failed to record payout");
      }
    } finally {
      submitting = false;
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
    <h1 class="text-2xl font-bold">Affiliate Payouts</h1>
    <p class="text-muted-foreground mt-1 text-sm">
      Manage pending affiliate payouts and view payout history.
    </p>
  </div>

  {#if data.payouts.length === 0}
    <div class="flex flex-col items-center justify-center py-16">
      <div
        class="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10"
      >
        <HugeiconsIcon icon={Wallet01Icon} class="size-8 text-primary" />
      </div>
      <h2 class="mb-2 text-lg font-semibold">No Pending Payouts</h2>
      <p class="text-muted-foreground text-sm">
        All affiliate payouts are up to date.
      </p>
    </div>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Affiliate</Table.Head>
          <Table.Head>Slug</Table.Head>
          <Table.Head>Pending Balance</Table.Head>
          <Table.Head>Conversions</Table.Head>
          <Table.Head>Payout Account</Table.Head>
          <Table.Head>Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each data.payouts as payout (payout.affiliateUserId)}
          <Table.Row>
            <Table.Cell class="max-w-32 truncate font-mono text-xs">
              {payout.affiliateUserId}
            </Table.Cell>
            <Table.Cell class="font-mono text-xs">
              {payout.slug}
            </Table.Cell>
            <Table.Cell class="font-mono text-xs font-medium">
              {formatPrice(payout.pendingBalance)}
            </Table.Cell>
            <Table.Cell>
              <Badge variant="secondary">{payout.conversionCount}</Badge>
            </Table.Cell>
            <Table.Cell class="max-w-48 truncate text-xs text-muted-foreground">
              {#if payout.payoutAccount}
                {payout.payoutAccount.accountHolderName} ({payout.payoutAccount
                  .bankName ?? payout.payoutAccount.method})
              {:else}
                <span class="italic">No account</span>
              {/if}
            </Table.Cell>
            <Table.Cell>
              <Button
                size="sm"
                onclick={() => handleRecordPayout(payout)}
                disabled={!payout.payoutAccount}
              >
                Record Payout
              </Button>
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
  open={payoutDialogOpen}
  onOpenChange={(open) => {
    if (!open) {
      payoutDialogOpen = false;
    }
  }}
>
  <Dialog.Content showCloseButton={false}>
    <Dialog.Header>
      <Dialog.Title>Record Payout</Dialog.Title>
      <Dialog.Description>
        Record a payout for this affiliate. This action cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <div class="flex flex-col gap-4 px-6 pb-4">
      <div class="flex flex-col gap-2">
        <Label for="payout-method">Method</Label>
        <Input
          id="payout-method"
          placeholder="Payment method..."
          bind:value={payoutMethod}
          disabled={submitting}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="payout-reference">Reference</Label>
        <Input
          id="payout-reference"
          placeholder="Transaction reference..."
          bind:value={payoutReference}
          disabled={submitting}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="payout-note">Note</Label>
        <Input
          id="payout-note"
          placeholder="Optional note..."
          bind:value={payoutNote}
          disabled={submitting}
        />
      </div>
    </div>
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props: closeProps })}
          <Button {...closeProps} variant="outline" disabled={submitting}>
            Cancel
          </Button>
        {/snippet}
      </Dialog.Close>
      <Button onclick={confirmPayout} disabled={submitting}>
        {submitting ? "Recording..." : "Confirm Payout"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
