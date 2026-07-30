<script lang="ts">
  import { ArrowRight01Icon, Tick02Icon } from "$lib/components/features/icons";
  import { formatIdr } from "$lib/components/features/plan";
  import type { PlanCatalogItem } from "$lib/schemas/plan";
  import { PLAN_DURATION_PAID_MONTHS } from "$lib/schemas/plan.constant";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Duration {
    months: number;
    grossAmount: number;
    discountLabel: string;
  }

  let {
    plan,
    selectedDuration,
    variant = "default",
  }: {
    plan: PlanCatalogItem;
    selectedDuration: 1 | 6 | 12;
    variant?: "default" | "featured";
  } = $props();

  const isFeatured = $derived(variant === "featured");

  const duration = $derived(
    plan.durations.find((d) => d.months === selectedDuration) ??
      (plan.durations[0] as Duration)
  );

  const paidMonths = $derived(
    PLAN_DURATION_PAID_MONTHS[
      duration.months as keyof typeof PLAN_DURATION_PAID_MONTHS
    ]
  );
  const savings = $derived(duration.months - paidMonths);
  const savingsLabel = $derived(
    savings === 0 ? "harga penuh" : `hemat ${savings} bulan`
  );
</script>

<article
  class={[
    "group relative flex flex-col overflow-hidden rounded-[20px] border bg-[var(--landing-card)] p-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:flex-row lg:items-stretch lg:gap-8 lg:p-8",
    isFeatured
      ? "border-[var(--landing-accent)]/30 shadow-[0_1px_0_0_rgba(59,130,246,0.06)] ring-1 ring-[var(--landing-accent)]/10"
      : "border-[var(--landing-border)]",
  ]}
>
  {#if isFeatured}
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[var(--landing-accent)]/30 to-transparent"
    ></div>
  {/if}

  <div class="flex flex-1 flex-col">
    <header class="flex items-baseline justify-between gap-4">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <h3 class="font-display text-2xl lg:text-3xl">
            {plan.name}
          </h3>
          {#if isFeatured}
            <span
              class="rounded-full bg-[var(--landing-accent-soft)] px-2.5 py-0.5 font-eyebrow text-[var(--landing-accent-ink)]"
            >
              Paling diminati
            </span>
          {/if}
        </div>
        <p class="text-[13px] text-[var(--landing-muted)]">
          Akses fitur belajar lengkap
        </p>
      </div>

      <div class="flex flex-col items-end text-right">
        <span class="font-eyebrow text-[var(--landing-muted)]">per bulan</span>
        <span class="font-display text-2xl tabular-nums lg:text-3xl">
          {formatIdr(plan.monthlyPrice)}
        </span>
      </div>
    </header>

    <div class="my-6 h-px bg-[var(--landing-border)]"></div>

    <ul class="flex flex-col gap-2.5">
      {#each plan.benefits as benefit (benefit)}
        <li
          class="flex items-start gap-2.5 text-[14px] text-[var(--landing-fg)]/80"
        >
          <span
            class={[
              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
              isFeatured
                ? "bg-[var(--landing-accent-soft)] text-[var(--landing-accent-ink)]"
                : "bg-[var(--landing-surface-subtle)] text-[var(--landing-muted)]",
            ]}
          >
            <HugeiconsIcon icon={Tick02Icon} class="size-3" strokeWidth={2.5} />
          </span>
          <span class="leading-relaxed">{benefit}</span>
        </li>
      {/each}
    </ul>
  </div>

  <div class="mt-8 flex flex-col lg:mt-0 lg:w-72 lg:shrink-0 lg:justify-end">
    <a
      href="/sign-up/"
      class={[
        "group/btn relative flex flex-col gap-1 overflow-hidden rounded-2xl border p-5 text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.985]",
        isFeatured
          ? "border-[var(--landing-accent)]/20 bg-[var(--landing-accent-soft)]/50 hover:bg-[var(--landing-accent-soft)]/80"
          : "border-[var(--landing-border)] bg-[var(--landing-surface-subtle)] hover:border-[var(--landing-fg)]/20",
      ]}
    >
      <div class="flex items-baseline justify-between">
        <span class="font-eyebrow text-[var(--landing-muted)]">
          {duration.months} bulan
        </span>
      </div>

      <span class="font-display text-2xl tabular-nums text-[var(--landing-fg)]">
        {formatIdr(duration.grossAmount)}
      </span>

      <span class="text-[12px] text-[var(--landing-muted)]">
        Bayar {paidMonths} bulan · {savingsLabel}
      </span>

      <span
        class={[
          "mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-[13px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isFeatured
            ? "bg-[var(--landing-fg)] text-[var(--landing-bg)] group-hover/btn:bg-[var(--landing-fg)]/90"
            : "bg-[var(--landing-fg)] text-[var(--landing-bg)] group-hover/btn:bg-[var(--landing-fg)]/90",
        ]}
      >
        Daftar sekarang
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          class="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-0.5"
        />
      </span>
    </a>
  </div>
</article>
