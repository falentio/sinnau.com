<script lang="ts">
  import { ArrowRight01Icon, CrownIcon } from "$lib/components/features/icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  type PlanKey = "LITE" | "PLUS" | "PREMIUM";
  const planName: Record<PlanKey, string> = {
    LITE: "Lite",
    PLUS: "Plus",
    PREMIUM: "Premium",
  };

  let {
    plan,
    daily,
    weekly,
  }: {
    plan: PlanKey;
    daily: number;
    weekly: number;
  } = $props();

  const monthly = $derived(daily * 10);
</script>

<aside
  class="group relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-card to-card p-6 shadow-[0_1px_0_0_rgba(217,119,6,0.06)] ring-1 ring-amber-500/10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:p-7"
>
  <div
    aria-hidden="true"
    class="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-amber-500/10 blur-3xl"
  ></div>

  <div
    class="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between"
  >
    <div class="flex items-start gap-4">
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
      >
        <HugeiconsIcon icon={CrownIcon} class="size-5" strokeWidth={1.75} />
      </div>

      <div class="flex flex-col gap-1">
        <span
          class="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400"
        >
          Paket aktif
        </span>
        <h2
          class="font-heading text-xl font-semibold tracking-[-0.02em] text-foreground md:text-2xl"
        >
          {planName[plan]}
        </h2>
        <p class="text-sm text-muted-foreground">
          {monthly} generate per bulan
          <span class="mx-1.5 text-foreground/20">·</span>
          <span class="tabular-nums">{daily}/hari</span>
          <span class="mx-1 text-foreground/20">·</span>
          <span class="tabular-nums">{weekly}/minggu</span>
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <a
        href="/subs/usage"
        class="group/link inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-4 text-sm font-medium text-foreground/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-foreground/30 hover:bg-background hover:text-foreground active:scale-[0.98]"
      >
        Detail
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          class="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-0.5"
        />
      </a>
    </div>
  </div>
</aside>
