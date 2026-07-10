<script lang="ts">
  import * as Tabs from "$lib/components/ui/tabs/index.js";

  import ActivePlanBanner from "./_components/active-plan-banner.svelte";
  import PlanCard from "./_components/plan-card.svelte";

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

  const plans: Plan[] = [
    {
      benefits: [
        "Unlimited quiz attempts",
        "FSRS flashcard session",
        "Weak chapter spot analysis",
      ],
      durations: [
        {
          grossAmount: 30_000,
          label: "Bayar 1 bulan",
          months: 1,
          savingsLabel: "harga penuh",
        },
        {
          grossAmount: 150_000,
          label: "Bayar 5 bulan",
          months: 6,
          savingsLabel: "hemat 1 bulan",
        },
        {
          grossAmount: 270_000,
          label: "Bayar 9 bulan",
          months: 12,
          savingsLabel: "hemat 3 bulan",
        },
      ],
      key: "LITE",
      monthlyPrice: 30_000,
      name: "Lite",
    },
    {
      benefits: [
        "Semua benefit Lite",
        "2× batas generate",
        "Riwayat belajar panjang",
      ],
      durations: [
        {
          grossAmount: 50_000,
          label: "Bayar 1 bulan",
          months: 1,
          savingsLabel: "harga penuh",
        },
        {
          grossAmount: 250_000,
          label: "Bayar 5 bulan",
          months: 6,
          savingsLabel: "hemat 1 bulan",
        },
        {
          grossAmount: 450_000,
          label: "Bayar 9 bulan",
          months: 12,
          savingsLabel: "hemat 3 bulan",
        },
      ],
      key: "PLUS",
      monthlyPrice: 50_000,
      name: "Plus",
    },
    {
      benefits: [
        "Semua benefit Lite",
        "6× batas generate",
        "Priority saat jam sibuk",
        "Akses fitur beta lebih dulu",
      ],
      durations: [
        {
          grossAmount: 100_000,
          label: "Bayar 1 bulan",
          months: 1,
          savingsLabel: "harga penuh",
        },
        {
          grossAmount: 500_000,
          label: "Bayar 5 bulan",
          months: 6,
          savingsLabel: "hemat 1 bulan",
        },
        {
          grossAmount: 900_000,
          label: "Bayar 9 bulan",
          months: 12,
          savingsLabel: "hemat 3 bulan",
        },
      ],
      key: "PREMIUM",
      monthlyPrice: 100_000,
      name: "Premium",
    },
  ];

  const activePlan: {
    plan: "LITE" | "PLUS" | "PREMIUM";
    daily: number;
    weekly: number;
  } | null = { daily: 12, plan: "PLUS", weekly: 30 };

  const tierRank: Record<Plan["key"], number> = {
    LITE: 1,
    PLUS: 2,
    PREMIUM: 3,
  };

  let duration = $state("12");
  const selectedDuration = $derived(Number(duration) as 1 | 6 | 12);
</script>

<svelte:head>
  <title>Paket · Sinnau</title>
</svelte:head>

<div class="mx-auto w-full max-w-6xl px-6 pt-10 md:pt-14">
  <header class="flex flex-col gap-2 pb-8 md:pb-10">
    <span
      class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
    >
      Berlangganan
    </span>
    <h1
      class="font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl"
    >
      Paket belajar
    </h1>
    <p class="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
      Pilih paket yang sesuai ritme belajarmu. Bayar sekali, aktif sampai durasi
      habis — tidak ada perpanjangan otomatis.
    </p>
  </header>

  {#if activePlan}
    <div class="pb-8 md:pb-10">
      <ActivePlanBanner
        plan={activePlan.plan}
        daily={activePlan.daily}
        weekly={activePlan.weekly}
      />
    </div>
  {/if}

  <div
    class="flex flex-col gap-3 border-y border-border/60 py-4 md:flex-row md:items-center md:justify-between"
  >
    <div class="flex flex-col gap-0.5">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
      >
        Durasi
      </span>
      <p class="text-sm text-muted-foreground">
        Ganti durasi untuk melihat harga dan penghematan.
      </p>
    </div>

    <Tabs.Root bind:value={duration}>
      <Tabs.List>
        <Tabs.Trigger value="1">1 bulan</Tabs.Trigger>
        <Tabs.Trigger value="6">6 bulan</Tabs.Trigger>
        <Tabs.Trigger value="12">12 bulan</Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  </div>

  <section
    class="grid grid-cols-1 gap-4 pt-8 md:grid-cols-12 md:gap-5 md:pt-10 pb-16"
  >
    <div class="md:col-span-5">
      <PlanCard
        plan={plans[0]}
        {selectedDuration}
        disabled={activePlan
          ? tierRank[plans[0].key] < tierRank[activePlan.plan]
          : false}
      />
    </div>

    <div class="md:col-span-7">
      <PlanCard plan={plans[1]} {selectedDuration} variant="featured" />
    </div>

    <div class="md:col-span-12">
      <PlanCard plan={plans[2]} {selectedDuration} variant="wide" />
    </div>
  </section>

  <footer
    class="flex flex-col gap-3 border-t border-border/60 py-10 text-[13px] text-muted-foreground md:flex-row md:items-center md:justify-between"
  >
    <p>
      Pembayaran diproses lewat QRIS. Pesanan kedaluwarsa otomatis setelah 15
      menit jika belum dibayar.
    </p>
    <a
      href="/subs/history"
      class="font-medium text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      Lihat pesanan sebelumnya
    </a>
  </footer>
</div>
