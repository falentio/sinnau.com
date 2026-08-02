<script lang="ts">
  import "$lib/features/landing-page/landing.css";
  import { page } from "$app/stores";
  import PlanCard from "$lib/components/features/plan/plan-card.svelte";
  import SeoHead from "$lib/components/seo-head.svelte";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import CtaBanner from "$lib/features/landing-page/cta-banner.svelte";
  import Faq from "$lib/features/landing-page/faq.svelte";
  import { reveal } from "$lib/features/landing-page/reveal";
  import SiteFooter from "$lib/features/landing-page/site-footer.svelte";
  import SiteNav from "$lib/features/landing-page/site-nav.svelte";

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
</script>

<SeoHead
  title="Paket & Harga · sinnau"
  description="Bandingkan paket Sinnau: LITE, PLUS, PREMIUM. Bayar sekali, akses sampai habis, tanpa tagihan berulang."
/>

<div class="landing-v3 relative min-h-[100dvh]">
  <div class="grain"></div>
  <SiteNav user={$page.data.user} />

  <main class="relative">
    <section
      class="mx-auto w-full max-w-[1240px] px-5 pt-20 sm:px-8 sm:pt-28 lg:pt-36"
    >
      <div class="mx-auto max-w-[42rem] text-center" use:reveal>
        <span class="font-eyebrow text-[var(--landing-muted)]">
          Berlangganan
        </span>
        <h1
          class="mt-3 font-display text-[36px] leading-[1.04] tracking-[-0.03em] sm:text-[46px] text-balance"
        >
          Cari paket yang pas<br />dengan ritme belajarmu
        </h1>
        <p
          class="mt-4 text-[15px] leading-relaxed text-[var(--landing-muted)] text-pretty sm:text-[16px]"
        >
          Bayar sekali, aktif sampai durasi habis. Kamu yang pegang kendali,
          nggak ada tagihan kejutan.
        </p>
      </div>

      <div
        class="mx-auto mt-12 flex max-w-[42rem] items-center justify-center"
        use:reveal={{ delay: 60 }}
      >
        <div class="flex flex-col items-center gap-3">
          <span class="font-eyebrow text-[var(--landing-muted)]">Durasi</span>
          <p class="text-[13px] text-[var(--landing-muted)]">
            Makin panjang durasi, makin besar penghematanmu.
          </p>
          <Tabs.Root bind:value={duration}>
            <Tabs.List>
              <Tabs.Trigger value="1">1 bulan</Tabs.Trigger>
              <Tabs.Trigger value="6">6 bulan</Tabs.Trigger>
              <Tabs.Trigger value="12">12 bulan</Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </div>
      </div>

      <div class="mx-auto mt-10 flex max-w-3xl flex-col gap-5 pb-8">
        {#each data.plans as plan, i (plan.key)}
          <div class="plan-card-landing" use:reveal={{ delay: 80 + i * 60 }}>
            <PlanCard
              {plan}
              {selectedDuration}
              variant={i === 1 ? "featured" : "default"}
              href={$page.data.user ? "/subs/plans/" : "/sign-up/"}
              ctaLabel={$page.data.user ? "Pilih paket" : "Daftar sekarang"}
            />
          </div>
        {/each}
      </div>
    </section>

    <Faq />

    <div class="pb-28 sm:pb-36">
      <CtaBanner />
    </div>
  </main>

  <SiteFooter />
</div>
