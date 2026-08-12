<script lang="ts">
  import { ArrowRight01Icon, Tick02Icon } from "$lib/components/features/icons";
  import { formatIdr } from "$lib/components/features/plan";
  import type { PlanCatalogItem } from "$lib/schemas/plan";
  import { PLAN_DURATION_PAID_MONTHS } from "$lib/schemas/plan.constant";
  import { cn } from "$lib/utils";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  let {
    plan,
    selectedDuration,
    variant = "default",
    disabled = false,
    disabledLabel = "Tidak tersedia",
    href,
    ctaLabel = "Aktifkan paket ini",
    onselect,
  }: {
    plan: PlanCatalogItem;
    selectedDuration: 1 | 6 | 12;
    variant?: "default" | "featured";
    disabled?: boolean;
    disabledLabel?: string;
    href?: string;
    ctaLabel?: string;
    onselect?: (planKey: PlanCatalogItem["key"], months: 1 | 6 | 12) => void;
  } = $props();

  const isFeatured = $derived(variant === "featured");
  const duration = $derived.by(() => {
    const matched =
      plan.durations.find((d) => d.months === selectedDuration) ??
      (plan.durations[0] as (typeof plan.durations)[number]);
    const paidMonths = PLAN_DURATION_PAID_MONTHS[matched.months];
    const savings = matched.months - paidMonths;
    return {
      grossAmount: matched.grossAmount,
      label: `Bayar ${paidMonths} bulan`,
      months: matched.months,
      savingsLabel: savings === 0 ? "harga penuh" : `hemat ${savings} bulan`,
    };
  });

  const ctaBoxClasses = $derived(
    cn([
      "group/btn relative flex flex-col gap-1 overflow-hidden rounded-2xl border p-5 text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
      isFeatured
        ? "border-[var(--plan-accent)]/25 bg-linear-to-b from-[var(--plan-accent)]/10 to-[var(--plan-accent)]/[0.03] hover:from-[var(--plan-accent)]/15 hover:to-[var(--plan-accent)]/[0.05]"
        : "border-border/70 bg-background hover:border-foreground/30 hover:bg-muted/50",
    ])
  );

  const pillClasses = $derived(
    cn([
      "mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
      isFeatured
        ? "bg-foreground text-background group-hover/btn:bg-foreground/90"
        : "border bg-background text-foreground",
    ])
  );
</script>

<article
  class={cn([
    "group relative flex flex-col overflow-hidden rounded-3xl border bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:flex-row lg:items-stretch lg:gap-8 lg:p-8",
    isFeatured
      ? "border-[var(--plan-accent)]/30 bg-linear-to-b from-[var(--plan-accent)]/6 via-card to-card shadow-[0_1px_0_0_color-mix(in_oklab,var(--plan-accent)_8%,transparent)] ring-1 ring-[var(--plan-accent)]/10"
      : "border-border/60 ring-1 ring-foreground/4",
    disabled && "opacity-60 saturate-50",
  ])}
>
  {#if isFeatured}
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[var(--plan-accent)]/40 to-transparent"
    ></div>
  {/if}

  <div class="flex flex-1 flex-col">
    <header class="flex items-baseline justify-between gap-4">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <h3
            class="font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground lg:text-3xl"
          >
            {plan.name}
          </h3>
          {#if isFeatured}
            <span
              class="rounded-full bg-[var(--plan-accent)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--plan-accent-ink)]"
            >
              Paling diminati
            </span>
          {/if}
        </div>
        <p class="text-sm text-muted-foreground">Akses fitur belajar lengkap</p>
      </div>

      <div class="flex flex-col items-end text-right">
        <span
          class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
        >
          per bulan
        </span>
        <span
          class="font-heading text-2xl font-semibold tabular-nums tracking-tight text-foreground lg:text-3xl"
        >
          {formatIdr(plan.monthlyPrice)}
        </span>
      </div>
    </header>

    <div class="my-6 h-px bg-border/60"></div>

    <ul class="flex flex-col gap-2.5">
      {#each plan.benefits as benefit (benefit)}
        <li class="flex items-start gap-2.5 text-sm text-foreground/85">
          <span
            class={cn([
              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
              isFeatured
                ? "bg-[var(--plan-accent)]/15 text-[var(--plan-accent-ink)]"
                : "bg-foreground/[0.06] text-foreground/70",
            ])}
          >
            <HugeiconsIcon icon={Tick02Icon} class="size-3" strokeWidth={2.5} />
          </span>
          <span class="leading-relaxed">{benefit}</span>
        </li>
      {/each}
    </ul>
  </div>

  <div class="mt-8 flex flex-col lg:mt-0 lg:w-72 lg:shrink-0 lg:justify-end">
    {#snippet ctaContent()}
      <div class="flex items-baseline justify-between">
        <span
          class="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
        >
          {duration.months} bulan
        </span>
        {#if isFeatured}
          <span
            class="font-heading text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--plan-accent-ink)]"
          >
            Hemat paling banyak
          </span>
        {/if}
      </div>

      <span
        class="font-heading text-2xl font-semibold tabular-nums tracking-tight text-foreground"
      >
        {formatIdr(duration.grossAmount)}
      </span>

      <span class="text-[12px] text-muted-foreground">
        {duration.label} · {duration.savingsLabel}
      </span>

      <span class={pillClasses}>
        {ctaLabel}
        {#if href}
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            class="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-0.5"
          />
        {/if}
      </span>
    {/snippet}

    {#if href}
      <a {href} class={ctaBoxClasses}>
        {@render ctaContent()}
      </a>
    {:else}
      <button
        type="button"
        {disabled}
        onclick={() => onselect?.(plan.key, duration.months)}
        class={cn(
          ctaBoxClasses,
          "cursor-pointer active:scale-[0.985] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        {@render ctaContent()}
      </button>
    {/if}
  </div>

  {#if disabled}
    <div
      class="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]"
    >
      <span
        class="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
      >
        {disabledLabel}
      </span>
    </div>
  {/if}
</article>
