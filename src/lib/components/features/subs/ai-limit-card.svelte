<script lang="ts">
  import { Tick02Icon } from "$lib/components/features/icons";
  import { formatIdr } from "$lib/components/features/plan";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { PLAN_NAME_FALLBACK } from "$lib/schemas/plan.constant";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  type PlanKey = "LITE" | "PLUS" | "PREMIUM";
  const planMeta: Record<
    PlanKey,
    { name: string; benefits: string[]; monthly: number }
  > = {
    LITE: {
      benefits: [
        "Unlimited quiz attempts",
        "FSRS flashcard session",
        "Weak chapter spot analysis",
      ],
      monthly: 60,
      name: "Lite",
    },
    PLUS: {
      benefits: [
        "Semua benefit Lite",
        "2× batas generate per bulan",
        "Riwayat belajar lebih panjang",
      ],
      monthly: 120,
      name: "Plus",
    },
    PREMIUM: {
      benefits: [
        "Semua benefit Lite",
        "6× batas generate per bulan",
        "Priority saat jam sibuk",
        "Akses fitur beta lebih dulu",
      ],
      monthly: 360,
      name: "Premium",
    },
  };
  const planMetaFallback: {
    name: string;
    benefits: string[];
    monthly: number;
  } = { benefits: [], monthly: 0, name: PLAN_NAME_FALLBACK };

  let {
    plan,
    daily,
    weekly,
    monthlyPrice,
  }: {
    plan: PlanKey;
    daily: number;
    weekly: number;
    monthlyPrice: number;
  } = $props();

  const meta = $derived(planMeta[plan] ?? planMetaFallback);
  const monthly = $derived(meta.monthly);
  const dailyPct = $derived(
    Math.max(0, Math.min(100, Math.round((daily / monthly) * 100)))
  );
  const weeklyPct = $derived(
    Math.max(0, Math.min(100, Math.round(((weekly * 4) / monthly) * 100)))
  );
  const dailyRule = $derived(Math.round(monthly / 10));
  const weeklyRule = $derived(Math.round(monthly / 4));
</script>

<article
  class="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ring-1 ring-foreground/[0.04] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:p-7"
>
  <header class="flex items-start justify-between gap-4">
    <div class="flex flex-col gap-1">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
      >
        Kuota AI
      </span>
      <h3
        class="font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground"
      >
        {monthly} generate
      </h3>
      <p class="text-sm text-muted-foreground">
        Total {formatIdr(monthlyPrice)} per bulan · paket {meta.name}
      </p>
    </div>

    <div
      class="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-foreground/[0.04] sm:flex"
    >
      <span
        class="font-heading text-base font-semibold tabular-nums text-foreground/70"
      >
        {monthly}
      </span>
    </div>
  </header>

  <div class="mt-6 flex flex-col gap-5">
    <div class="flex flex-col gap-2.5">
      <div class="flex items-baseline justify-between">
        <div class="flex items-baseline gap-2">
          <span
            class="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            Harian
          </span>
          <span
            class="font-heading text-xl font-semibold tabular-nums tracking-tight text-foreground"
          >
            {daily}
          </span>
        </div>
        <span class="font-mono text-[11px] tabular-nums text-muted-foreground">
          {dailyPct}%
        </span>
      </div>
      <Progress value={dailyPct} max={100} class="h-1.5 bg-foreground/[0.06]" />
      <p class="text-[11px] text-muted-foreground">
        Aturan {dailyRule} generate per hari
      </p>
    </div>

    <Separator />

    <div class="flex flex-col gap-2.5">
      <div class="flex items-baseline justify-between">
        <div class="flex items-baseline gap-2">
          <span
            class="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            Mingguan
          </span>
          <span
            class="font-heading text-xl font-semibold tabular-nums tracking-tight text-foreground"
          >
            {weekly}
          </span>
        </div>
        <span class="font-mono text-[11px] tabular-nums text-muted-foreground">
          {weeklyPct}%
        </span>
      </div>
      <Progress
        value={weeklyPct}
        max={100}
        class="h-1.5 bg-foreground/[0.06]"
      />
      <p class="text-[11px] text-muted-foreground">
        Aturan {weeklyRule} generate per minggu
      </p>
    </div>
  </div>

  <Separator class="my-6" />

  <ul class="flex flex-col gap-2.5">
    {#each meta.benefits as benefit (benefit)}
      <li class="flex items-start gap-2.5 text-sm text-foreground/80">
        <span
          class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground/70"
        >
          <HugeiconsIcon icon={Tick02Icon} class="size-3" strokeWidth={2.5} />
        </span>
        <span class="leading-relaxed">{benefit}</span>
      </li>
    {/each}
  </ul>
</article>
