<script lang="ts">
  import { ArrowRight01Icon, CrownIcon } from "$lib/components/features/icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import AiLimitCard from "./_components/ai-limit-card.svelte";

  type PlanKey = "LITE" | "PLUS" | "PREMIUM";
  const planName: Record<PlanKey, string> = {
    LITE: "Lite",
    PLUS: "Plus",
    PREMIUM: "Premium",
  };
  const planPrice: Record<PlanKey, number> = {
    LITE: 30_000,
    PLUS: 50_000,
    PREMIUM: 100_000,
  };
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
      {planName.PLUS}
    </h1>
    <p class="max-w-md text-[15px] leading-relaxed text-muted-foreground">
      Kuota generate kamu saat ini. Kuota di-reset tiap awal bulan, mengikuti
      tanggal aktivasi paket.
    </p>
  </header>

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
          {planName.PLUS} · 6 bulan
        </span>
        <span class="text-xs text-muted-foreground">
          Diperpanjang dari aktivasi sebelumnya
        </span>
      </div>
      <a
        href="/subs/plans"
        class="group/btn inline-flex h-8 items-center gap-1 rounded-full bg-foreground px-3.5 text-[13px] font-medium text-background transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-foreground/85 active:scale-[0.98]"
      >
        Perpanjang
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          class="size-3 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-0.5"
        />
      </a>
    </div>

    <AiLimitCard
      plan="PLUS"
      daily={12}
      weekly={30}
      monthlyPrice={planPrice.PLUS}
    />
  </section>

  <section
    class="flex flex-col gap-3 border-t border-border/60 py-10 md:flex-row md:items-center md:justify-between"
  >
    <div class="flex flex-col gap-1">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
      >
        Riwayat
      </span>
      <p class="text-sm text-muted-foreground">
        Lihat pesanan dan status pembayarannya.
      </p>
    </div>
    <a
      href="/subs/history"
      class="group/link inline-flex h-9 items-center gap-1.5 self-start rounded-full border border-border/60 bg-background/60 px-4 text-sm font-medium text-foreground/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-foreground/30 hover:bg-background hover:text-foreground active:scale-[0.98] md:self-auto"
    >
      Riwayat pesanan
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        class="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-0.5"
      />
    </a>
  </section>
</div>
