<script lang="ts">
  import { goto } from "$app/navigation";
  import { AnalyticsEvent, track } from "$lib/analytics/events";
  import { ArrowLeft01Icon } from "$lib/components/features/icons";
  import PlanCard from "$lib/components/features/plan/plan-card.svelte";
  import ActivePlanBanner from "$lib/components/features/subs/active-plan-banner.svelte";
  import SeoHead from "$lib/components/seo-head.svelte";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import Faq from "$lib/features/landing-page/faq.svelte";
  import { client } from "$lib/orpc";
  import { PLAN_TIER_RANK as tierRank } from "$lib/schemas/plan.constant";
  import { getErrorMessage } from "$lib/utils/error-messages";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let duration = $state("12");
  let selectedDuration: 1 | 6 | 12 = $derived.by(() => {
    const n = Number(duration);
    if (n === 1 || n === 6 || n === 12) {
      return n;
    }
    return 1;
  });

  let checkoutError = $state<string | null>(null);

  const activePlanKey = $derived(data.activePlan?.planKey ?? null);
  const isDowngrade = (planKey: "LITE" | "PLUS" | "PREMIUM") => {
    if (!activePlanKey) {
      return false;
    }
    return tierRank[planKey] < tierRank[activePlanKey];
  };

  const handleCheckout = async (
    planKey: "LITE" | "PLUS" | "PREMIUM",
    durationMonths: 1 | 6 | 12
  ) => {
    checkoutError = null;
    try {
      const result = await client.plan.checkout({ durationMonths, planKey });
      track(AnalyticsEvent.PLAN_CHECKOUT_STARTED, {
        duration_months: durationMonths,
        order_id: result.orderId,
        plan_key: planKey,
      });

      await goto(`/subs/checkout/${result.orderId}`);
    } catch (error) {
      if (error instanceof Error) {
        checkoutError = getErrorMessage(error);
        return;
      }
      checkoutError = "Gagal memproses pesanan. Coba lagi.";
    }
  };
</script>

<SeoHead
  title="Paket · sinnau"
  description="Bandingkan paket Sinnau: LITE, PLUS, PREMIUM. Pilih durasi 1, 6, atau 12 bulan. Bayar sekali, akses sampai habis, tanpa tagihan berulang."
  robots="noindex"
/>

<div class="mx-auto w-full max-w-4xl px-6 pt-10 md:pt-14">
  <div class="mb-6 md:mb-8">
    <a
      href="/home"
      class="group inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-sm text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-foreground"
    >
      <HugeiconsIcon
        icon={ArrowLeft01Icon}
        class="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-0.5"
      />
      Kembali
    </a>
  </div>

  <header class="flex flex-col gap-2 pb-8 md:pb-10">
    <span
      class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
    >
      Berlangganan
    </span>
    <h1
      class="font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl"
    >
      Cari paket yang pas dengan ritme belajarmu
    </h1>
    <p class="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
      Bayar sekali, aktif sampai durasi habis. Kamu yang pegang kendali, nggak
      ada tagihan kejutan.
    </p>
  </header>

  {#if checkoutError}
    <div
      class="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400"
    >
      {checkoutError}
    </div>
  {/if}

  {#if data.activePlan}
    <div class="pb-8 md:pb-10">
      <ActivePlanBanner
        plan={data.activePlan.planKey}
        daily={data.activePlan.daily}
        weekly={data.activePlan.weekly}
      />
    </div>
  {/if}

  <div
    class="flex flex-col gap-3 border-y border-border/60 py-4 md:flex-row md:items-center md:justify-between"
  >
    <div class="flex flex-col gap-0.5 sticky top-0">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
      >
        Durasi
      </span>
      <p class="text-sm text-muted-foreground">
        Makin panjang durasi, makin besar penghematanmu.
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

  <section class="flex flex-col gap-4 pt-8 md:gap-5 md:pt-10 pb-8">
    {#each data.plans as plan, i (plan.key)}
      <PlanCard
        {plan}
        {selectedDuration}
        variant={i === 1 ? "featured" : "default"}
        disabled={isDowngrade(plan.key)}
        onselect={handleCheckout}
      />
    {/each}
  </section>

  <Faq />

  <footer
    class="flex flex-col gap-3 border-t border-border/60 mt-32 py-10 text-[13px] text-muted-foreground"
  >
    <p>
      Pembayaran melalui QRIS. Tidak jadi bayar? Pesanan kedaluwarsa otomatis,
      tidak ada yang terpotong.
    </p>
  </footer>
</div>
