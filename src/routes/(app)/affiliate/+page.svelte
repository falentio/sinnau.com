<script lang="ts">
  import { client } from "$lib/orpc";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let claiming = $state(false);
  let claimError = $state("");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      currency: "IDR",
      minimumFractionDigits: 0,
      style: "currency",
    }).format(value);

  const handleClaim = async () => {
    claiming = true;
    claimError = "";
    try {
      await client.affiliate.claim({});
      window.location.reload();
    } catch (error) {
      claimError =
        error instanceof Error ? error.message : "Failed to claim profile";
    } finally {
      claiming = false;
    }
  };
</script>

<div class="mx-auto max-w-2xl space-y-8 p-6">
  <h1 class="text-2xl font-bold">Affiliate Dashboard</h1>

  {#if data.summary.profile}
    <section class="rounded-lg border p-4">
      <h2 class="text-lg font-semibold">Your Referral Link</h2>
      <p class="break-all rounded bg-muted p-2 font-mono text-sm">
        {new URL(`/r/${data.summary.profile.slug}`, "https://sinnau.com").href}
      </p>
    </section>

    <section class="grid grid-cols-3 gap-4">
      <div class="rounded-lg border p-4 text-center">
        <p class="text-sm text-muted-foreground">Pending Balance</p>
        <p class="text-2xl font-bold">
          {formatCurrency(data.summary.pendingBalance)}
        </p>
      </div>
      <div class="rounded-lg border p-4 text-center">
        <p class="text-sm text-muted-foreground">Total Earned</p>
        <p class="text-2xl font-bold">
          {formatCurrency(data.summary.totalEarned)}
        </p>
      </div>
      <div class="rounded-lg border p-4 text-center">
        <p class="text-sm text-muted-foreground">Conversions</p>
        <p class="text-2xl font-bold">{data.summary.conversionCount}</p>
      </div>
    </section>

    <section class="rounded-lg border p-4">
      <h2 class="text-lg font-semibold">Total Paid Out</h2>
      <p class="text-2xl font-bold">
        {formatCurrency(data.summary.totalPaid)}
      </p>
    </section>
  {:else}
    <section class="rounded-lg border p-4">
      <h2 class="text-lg font-semibold">Get Started</h2>
      <p class="mb-4 text-muted-foreground">
        You haven't claimed your affiliate profile yet. Start sharing and
        earning!
      </p>
      <button
        class="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        onclick={handleClaim}
        disabled={claiming}
      >
        {claiming ? "Claiming..." : "Claim Affiliate Profile"}
      </button>
      {#if claimError}
        <p class="mt-2 text-sm text-destructive">{claimError}</p>
      {/if}
    </section>
  {/if}
</div>
