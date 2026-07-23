<script lang="ts">
  import { AnalyticsEvent, track } from "$lib/analytics/events";
  import {
    CheckmarkCircle02Icon,
    Copy01Icon,
    Link03Icon,
    Share01Icon,
  } from "$lib/components/features/icons";
  import { Button } from "$lib/components/ui/button";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  let { referralUrl, slug }: { referralUrl: string; slug: string } = $props();

  let copied = $state(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    copied = true;
    track(AnalyticsEvent.AFFILIATE_LINK_COPIED, { slug });
    setTimeout(() => {
      copied = false;
    }, 2000);
  };
</script>

<section
  class="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-card to-card p-5 ring-1 ring-foreground/[0.04] md:p-6"
>
  <div class="flex items-start justify-between gap-4">
    <div class="flex flex-col gap-1">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300"
      >
        Tautan referral
      </span>
      <p class="text-sm text-muted-foreground">
        Cocok buat bio, story, atau grup belajar. Satu tautan untuk semua
        platform.
      </p>
    </div>
    <div
      class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
    >
      <HugeiconsIcon icon={Share01Icon} class="size-4" />
    </div>
  </div>

  <div class="mt-4 flex items-center gap-2">
    <InputGroup.Root class="min-w-0 flex-1 border-border/60 bg-background">
      <InputGroup.Text class="text-muted-foreground">
        <HugeiconsIcon icon={Link03Icon} class="size-4" />
      </InputGroup.Text>
      <InputGroup.Input
        readonly
        value={referralUrl}
        title={referralUrl}
        aria-label="Tautan referral kamu"
        class="font-mono text-[13px]"
      />
    </InputGroup.Root>
    <Button size="sm" class="shrink-0" onclick={handleCopy}>
      <HugeiconsIcon
        icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
        class="size-3.5"
      />
      {copied ? "Tersalin!" : "Salin"}
    </Button>
  </div>
</section>
