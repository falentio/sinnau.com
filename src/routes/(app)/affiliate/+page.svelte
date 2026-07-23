<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { AnalyticsEvent, track } from "$lib/analytics/events";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { client } from "$lib/orpc";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let applying = $state(false);
  let applyError = $state("");
  let copied = $state(false);

  let instagramHandle = $state("");
  let tiktokHandle = $state("");
  let youtubeHandle = $state("");
  let advantage = $state("");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      currency: "IDR",
      minimumFractionDigits: 0,
      style: "currency",
    }).format(value);

  const handleApply = async () => {
    applying = true;
    applyError = "";
    try {
      await client.affiliate.apply({
        advantage,
        instagramHandle: instagramHandle || undefined,
        tiktokHandle: tiktokHandle || undefined,
        youtubeHandle: youtubeHandle || undefined,
      });
      await invalidateAll();
    } catch (error) {
      applyError =
        error instanceof Error ? error.message : "Failed to submit application";
    } finally {
      applying = false;
    }
  };

  const handleCopy = async () => {
    if (!data.summary.profile) {
      return;
    }
    const url = new URL(`/r/${data.summary.profile.slug}`, data.origin).href;
    await navigator.clipboard.writeText(url);
    copied = true;
    track(AnalyticsEvent.AFFILIATE_LINK_COPIED, {
      slug: data.summary.profile.slug,
    });
    setTimeout(() => {
      copied = false;
    }, 2000);
  };
</script>

<div class="mx-auto max-w-2xl space-y-8 p-6">
  <h1 class="text-2xl font-bold">Affiliate Dashboard</h1>

  {#if data.summary.profile}
    <section class="rounded-lg border p-4">
      <h2 class="text-lg font-semibold">Your Referral Link</h2>
      <div class="flex items-center gap-2">
        <p class="break-all rounded bg-muted p-2 font-mono text-sm">
          {new URL(`/r/${data.summary.profile.slug}`, data.origin).href}
        </p>
        <Button class="shrink-0" size="sm" onclick={handleCopy}>
          {copied ? "Tersalin!" : "Salin"}
        </Button>
      </div>
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
  {:else if data.application?.status === "PENDING"}
    <section class="rounded-lg border p-4">
      <h2 class="text-lg font-semibold">Application Pending</h2>
      <p class="text-muted-foreground">
        Your affiliate application is under review. We'll notify you once it's
        approved.
      </p>
    </section>
  {:else}
    <section class="rounded-lg border p-4">
      <h2 class="text-lg font-semibold">Become an Affiliate</h2>
      {#if data.application?.status === "REJECTED"}
        <p class="mb-4 text-sm text-destructive">
          Your previous application was rejected. You can re-apply below.
        </p>
      {:else}
        <p class="mb-4 text-muted-foreground">
          Apply to become an affiliate and start earning by sharing your
          referral link.
        </p>
      {/if}
      <form
        class="space-y-4"
        onsubmit={(e) => {
          e.preventDefault();
          void handleApply();
        }}
      >
        <div class="space-y-2">
          <Label for="advantage">
            Why would you be a good affiliate? <span class="text-destructive"
              >*</span
            >
          </Label>
          <Textarea
            id="advantage"
            placeholder="Tell us about your audience, reach, and how you'd promote us..."
            bind:value={advantage}
            required
            minlength={10}
            maxlength={1000}
          />
        </div>
        <div class="space-y-2">
          <Label for="instagram">Instagram Handle</Label>
          <Input
            id="instagram"
            placeholder="@username"
            bind:value={instagramHandle}
          />
        </div>
        <div class="space-y-2">
          <Label for="tiktok">TikTok Handle</Label>
          <Input
            id="tiktok"
            placeholder="@username"
            bind:value={tiktokHandle}
          />
        </div>
        <div class="space-y-2">
          <Label for="youtube">YouTube Handle / Link</Label>
          <Input
            id="youtube"
            placeholder="@channel or https://youtube.com/@channel"
            bind:value={youtubeHandle}
          />
        </div>
        <Button type="submit" disabled={applying}>
          {applying ? "Submitting..." : "Apply"}
        </Button>
        {#if applyError}
          <p class="text-sm text-destructive">{applyError}</p>
        {/if}
      </form>
    </section>
  {/if}
</div>
