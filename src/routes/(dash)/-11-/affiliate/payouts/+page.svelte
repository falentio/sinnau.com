<script lang="ts">
  import { dev } from "$app/environment";
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

  // Admin table dialogs use direct client.orpc calls with Dialog + Input
  // per existing admin pattern (orders, grants). formsnap/superforms is for
  // user-facing forms (affiliate apply, payout account) per src/routes/AGENTS.md
  // and src/lib/components/features/affiliate/create-*.svelte.ts.
  // Keeping manual handling here avoids speculative superform abstraction for a
  // simple 2-field admin action and a dev-only seed panel.

  let { data }: { data: PageData } = $props();

  let payoutDialogOpen = $state(false);
  let payoutUserId = $state("");
  let payoutMethod = $state("");
  let payoutNote = $state("");
  let payoutReference = $state("");
  let submitting = $state(false);

  let seedAffiliateId = $state("");
  let seedCount = $state(3);
  let seeding = $state(false);

  const handleSeedPending = async () => {
    if (!seedAffiliateId.trim()) {
      toast.error("Affiliate User ID is required");
      return;
    }
    seeding = true;
    try {
      const result = await client.affiliateSeed.admin.seedPendingPayouts({
        affiliateUserId: seedAffiliateId.trim(),
        count: seedCount || undefined,
      });
      toast.success(`Seeded ${result.created} pending payouts`);
      await invalidate("affiliate:payouts");
      await invalidate("affiliate:history");
    } catch (error) {
      if (error instanceof ORPCError) {
        toast.error(getErrorMessage(error));
      } else {
        toast.error("Failed to seed pending payouts");
      }
    } finally {
      seeding = false;
    }
  };

  let selectedPayout = $state<PendingPayout | null>(null);

  const handleRecordPayout = (payout: PendingPayout) => {
    selectedPayout = payout;
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
      selectedPayout = null;
      await invalidate("affiliate:payouts");
      await invalidate("affiliate:history");
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

  const getWhatsappLink = (whatsappNumber: string): string =>
    `https://wa.me/${whatsappNumber.replaceAll(/[^0-9]/gu, "")}`;

  const getPayoutAccountSummary = (
    account: PendingPayout["payoutAccount"]
  ): string => {
    if (!account) {
      return "";
    }
    return `${account.accountHolderName} (${account.bankName ?? account.method})`;
  };
</script>

<div class="container mx-auto p-6">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Affiliate Payouts</h1>
      <p class="text-muted-foreground mt-1 text-sm">
        Manage pending affiliate payouts awaiting completion.
      </p>
    </div>
    <a
      href="/-11-/affiliate/history"
      class="text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      View payout history
    </a>
  </div>

  {#if dev}
    <div class="mb-6 rounded-lg border border-dashed p-4">
      <h3 class="mb-2 text-sm font-semibold">Dev: Seed Pending Payouts</h3>
      <p class="text-muted-foreground mb-3 text-xs">
        Creates stub PENDING commissions for an existing affiliate (strict:
        profile must exist). Only visible in dev.
      </p>
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex min-w-64 flex-1 flex-col gap-1">
          <Label for="seed-affiliate-id">Affiliate User ID</Label>
          <Input
            id="seed-affiliate-id"
            placeholder="user id with affiliate profile..."
            bind:value={seedAffiliateId}
            disabled={seeding}
          />
        </div>
        <div class="flex w-32 flex-col gap-1">
          <Label for="seed-count">Count (1-20)</Label>
          <Input
            id="seed-count"
            type="number"
            min="1"
            max="20"
            bind:value={seedCount}
            disabled={seeding}
          />
        </div>
        <Button
          onclick={handleSeedPending}
          disabled={seeding || !seedAffiliateId.trim()}
        >
          {seeding ? "Seeding..." : "Seed Pending"}
        </Button>
      </div>
    </div>
  {/if}

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
                {getPayoutAccountSummary(payout.payoutAccount)}
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
      selectedPayout = null;
    }
  }}
>
  <Dialog.Content
    showCloseButton={false}
    class="max-h-[90vh] overflow-y-auto sm:max-w-lg"
  >
    <Dialog.Header>
      <Dialog.Title>Record Payout</Dialog.Title>
      <Dialog.Description>
        Record a payout for this affiliate. This action cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    {#if selectedPayout}
      <div class="mx-6 flex flex-col gap-4 rounded-lg border p-4">
        <div class="flex flex-col gap-3">
          <h4 class="text-sm font-semibold">Affiliate</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <span class="text-muted-foreground">User ID</span>
            <span
              class="truncate font-mono text-xs"
              title={selectedPayout.affiliateUserId}
              >{selectedPayout.affiliateUserId}</span
            >
            <span class="text-muted-foreground">Slug</span>
            <span class="font-mono text-xs">{selectedPayout.slug}</span>
            <span class="text-muted-foreground">Pending Balance</span>
            <span class="font-mono text-xs font-medium"
              >{formatPrice(selectedPayout.pendingBalance)}</span
            >
            <span class="text-muted-foreground">Conversions</span>
            <span
              ><Badge variant="secondary"
                >{selectedPayout.conversionCount}</Badge
              ></span
            >
          </div>
        </div>
        <div class="border-t pt-3">
          <h4 class="mb-2 text-sm font-semibold">Payout Account & Contact</h4>
          {#if selectedPayout.payoutAccount}
            <div class="grid grid-cols-2 gap-2 text-sm">
              <span class="text-muted-foreground">Method</span>
              <span
                ><Badge variant="outline"
                  >{selectedPayout.payoutAccount.method}</Badge
                ></span
              >
              <span class="text-muted-foreground">Bank</span>
              <span class="text-xs"
                >{selectedPayout.payoutAccount.bankName ?? "—"}</span
              >
              <span class="text-muted-foreground">Account Holder</span>
              <span
                class="truncate text-xs"
                title={selectedPayout.payoutAccount.accountHolderName}
                >{selectedPayout.payoutAccount.accountHolderName}</span
              >
              <span class="text-muted-foreground">Account Number</span>
              <span
                class="font-mono text-xs"
                title={selectedPayout.payoutAccount.accountNumber}
                >{selectedPayout.payoutAccount.accountNumber}</span
              >
              <span class="text-muted-foreground">WhatsApp</span>
              <a
                href={getWhatsappLink(
                  selectedPayout.payoutAccount.whatsappNumber
                )}
                target="_blank"
                rel="noopener noreferrer"
                class="truncate text-xs text-primary underline-offset-4 hover:underline"
                title={selectedPayout.payoutAccount.whatsappNumber}
              >
                {selectedPayout.payoutAccount.whatsappNumber}
              </a>
            </div>
          {:else}
            <p class="text-muted-foreground text-xs italic">
              No payout account on file — payout disabled until affiliate
              completes account.
            </p>
          {/if}
        </div>
      </div>
    {/if}
    <div class="flex flex-col gap-4 px-6 pb-4">
      <div class="flex flex-col gap-2">
        <Label for="payout-method">Method</Label>
        <Input
          id="payout-method"
          placeholder="Payment method..."
          bind:value={payoutMethod}
          disabled={submitting}
        />
        {#if selectedPayout?.payoutAccount}
          <p class="text-muted-foreground text-xs">
            Default: {selectedPayout.payoutAccount.method}{selectedPayout
              .payoutAccount.bankName
              ? ` • ${selectedPayout.payoutAccount.bankName}`
              : ""}
          </p>
        {/if}
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
