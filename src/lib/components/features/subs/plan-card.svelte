<script lang="ts">
  import { Tick02Icon } from "$lib/components/features/icons";
  import { formatIdr } from "$lib/components/features/plan";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Duration {
    months: 1 | 6 | 12;
    grossAmount: number;
    label: string;
    savingsLabel: string;
  }

  interface Plan {
    key: "LITE" | "PLUS" | "PREMIUM";
    name: string;
    monthlyPrice: number;
    benefits: string[];
    durations: Duration[];
  }

  let {
    plan,
    selectedDuration,
    variant = "default",
    disabled = false,
    onselect,
  }: {
    plan: Plan;
    selectedDuration: 1 | 6 | 12;
    variant?: "default" | "featured" | "wide";
    disabled?: boolean;
    onselect?: (planKey: Plan["key"], months: 1 | 6 | 12) => void;
  } = $props();

  const isFeatured = $derived(variant === "featured");
  const duration = $derived(
    plan.durations.find((d) => d.months === selectedDuration) ??
      (plan.durations[0] as (typeof plan.durations)[number])
  );
</script>

<article
  class={[
    "group relative flex flex-col overflow-hidden rounded-3xl border bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:flex-row md:items-stretch md:gap-8 md:p-8",
    isFeatured
      ? "border-amber-500/30 bg-gradient-to-b from-amber-500/[0.06] via-card to-card shadow-[0_1px_0_0_rgba(217,119,6,0.08)] ring-1 ring-amber-500/10"
      : "border-border/60 ring-1 ring-foreground/[0.04]",
    disabled && "opacity-60 saturate-50",
  ]}
>
  {#if isFeatured}
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"
    ></div>
  {/if}

  <div class="flex flex-1 flex-col">
    <header class="flex items-baseline justify-between gap-4">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <h3
            class="font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl"
          >
            {plan.name}
          </h3>
          {#if isFeatured}
            <span
              class="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400"
            >
              Pilihan banyak pengguna
            </span>
          {/if}
        </div>
        <p class="text-sm text-muted-foreground">
          {plan.benefits.length} benefit utama · pembayaran sekali
        </p>
      </div>

      <div class="flex flex-col items-end text-right">
        <span
          class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
        >
          per bulan
        </span>
        <span
          class="font-heading text-2xl font-semibold tabular-nums tracking-tight text-foreground md:text-3xl"
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
            class={[
              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
              isFeatured
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                : "bg-foreground/[0.06] text-foreground/70",
            ]}
          >
            <HugeiconsIcon icon={Tick02Icon} class="size-3" strokeWidth={2.5} />
          </span>
          <span class="leading-relaxed">{benefit}</span>
        </li>
      {/each}
    </ul>
  </div>

  <div class="mt-8 flex flex-col md:mt-0 md:w-72 md:shrink-0 md:justify-end">
    <button
      type="button"
      {disabled}
      onclick={() => onselect?.(plan.key, duration.months)}
      class={[
        "group/btn relative flex flex-col gap-1 overflow-hidden rounded-2xl border p-5 text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50",
        isFeatured
          ? "border-amber-500/25 bg-gradient-to-b from-amber-500/10 to-amber-500/[0.03] hover:from-amber-500/15 hover:to-amber-500/[0.05]"
          : "border-border/70 bg-background hover:border-foreground/30 hover:bg-muted/50",
      ]}
    >
      <div class="flex items-baseline justify-between">
        <span
          class="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
        >
          {duration.months} bulan
        </span>
        {#if isFeatured}
          <span
            class="font-heading text-[10px] font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400"
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

      <span
        class="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:bg-foreground/90"
      >
        Lanjut bayar
      </span>
    </button>
  </div>

  {#if disabled}
    <div
      class="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]"
    >
      <span
        class="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
      >
        Tidak dapat diturunkan
      </span>
    </div>
  {/if}
</article>
