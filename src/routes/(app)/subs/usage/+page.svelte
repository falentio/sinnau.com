<script lang="ts">
  import StudySetPagination from "$lib/components/features/app/study-set-pagination.svelte";
  import { ArrowRight01Icon, CrownIcon } from "$lib/components/features/icons";
  import AiLimitCard from "$lib/components/features/subs/ai-limit-card.svelte";
  import OrderRow from "$lib/components/features/subs/order-row.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import {
    PLAN_MONTHLY_PRICE,
    PLAN_NAME,
    PLAN_NAME_FALLBACK,
  } from "$lib/schemas/plan.constant";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  type PlanKey = "LITE" | "PLUS" | "PREMIUM";
  const planName: Record<PlanKey, string> = PLAN_NAME;
  const planPrice: Record<PlanKey, number> = PLAN_MONTHLY_PRICE;

  let { data }: { data: PageData } = $props();

  const orders = $derived(
    data.orders.map((o) => ({
      ...o,
      planName: planName[o.planKey] ?? PLAN_NAME_FALLBACK,
    }))
  );

  const orderCountLabel = $derived.by(() => {
    const { total } = data.pagination;
    if (total === 0) {
      return null;
    }
    const visible = data.orders.length;
    if (visible < total) {
      return `Menampilkan ${visible} dari ${total} pesanan`;
    }
    return `${total} pesanan`;
  });
</script>

<svelte:head>
  <title>Paket aktif · Sinnau</title>
</svelte:head>

<div class="mx-auto w-full max-w-3xl px-6 pt-10 md:pt-14">
  <header class="flex flex-col gap-2 pb-10 md:pb-12">
    <span
      class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
    >
      Paket aktif
    </span>
    <h1
      class="font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl"
    >
      {#if data.activePlan}
        {planName[data.activePlan.planKey]}
      {:else}
        Belum ada paket
      {/if}
    </h1>
    <p class="max-w-md text-[15px] leading-relaxed text-muted-foreground">
      {#if data.activePlan}
        Kuota generate kamu saat ini. Kuota di-reset tiap awal bulan, mengikuti
        tanggal aktivasi paket.
      {:else}
        Pilih paket untuk mulai generate soal dan flashcard tanpa batas.
      {/if}
    </p>
  </header>

  {#if data.activePlan}
    <section class="flex flex-col gap-4 pb-12">
      <div
        class="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/50 px-4 py-3"
      >
        <div
          class="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
        >
          <HugeiconsIcon icon={CrownIcon} class="size-4" strokeWidth={1.75} />
        </div>
        <div class="flex flex-1 flex-col">
          <span class="text-sm font-medium text-foreground">
            {planName[data.activePlan.planKey]}
          </span>
          <span class="text-xs text-muted-foreground">
            Diperpanjang dari aktivasi sebelumnya
          </span>
        </div>
        <Button href="/subs/plans" variant="default" size="sm">
          Perpanjang
        </Button>
      </div>

      <AiLimitCard
        plan={data.activePlan.planKey}
        daily={data.activePlan.daily}
        weekly={data.activePlan.weekly}
        monthlyPrice={planPrice[data.activePlan.planKey]}
      />
    </section>
  {:else}
    <section class="pb-12">
      <a
        href="/subs/plans"
        class="group/cta flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-card to-card px-4 py-4 ring-1 ring-amber-500/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-amber-500/40 active:scale-[0.99] md:py-5"
      >
        <div
          class="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
        >
          <HugeiconsIcon icon={CrownIcon} class="size-4" strokeWidth={1.75} />
        </div>
        <div class="flex flex-1 flex-col">
          <span class="text-sm font-medium text-foreground">
            Pilih paket belajar
          </span>
          <span class="text-xs text-muted-foreground">
            Bayar sekali, aktif sampai durasi habis.
          </span>
        </div>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          class="size-4 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:translate-x-0.5"
        />
      </a>
    </section>
  {/if}

  <section class="flex flex-col gap-4 border-t border-border/60 pt-10 pb-16">
    <header class="flex flex-col gap-1">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      >
        Riwayat
      </span>
      <h2
        class="font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl"
      >
        Pesanan
      </h2>
      <p class="text-sm text-muted-foreground">
        Pesanan yang sudah selesai — aktif, kedaluwarsa, atau dibatalkan.
      </p>
      {#if orderCountLabel}
        <p
          class="text-xs font-medium tracking-tight text-muted-foreground/80 tabular-nums"
        >
          {orderCountLabel}
        </p>
      {/if}
    </header>

    {#if data.pagination.total === 0}
      <div
        class="rounded-2xl border border-dashed border-border/60 bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground"
      >
        Belum ada pesanan.
      </div>
    {:else}
      <div
        class="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ring-1 ring-foreground/[0.04]"
      >
        {#each orders as order (order.id)}
          <OrderRow {order} />
        {/each}
      </div>
      {#if data.pagination.totalPages > 1}
        <div class="mt-2">
          <StudySetPagination pagination={data.pagination} />
        </div>
      {/if}
    {/if}
  </section>
</div>
