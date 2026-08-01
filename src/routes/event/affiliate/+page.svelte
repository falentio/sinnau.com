<script lang="ts">
  import "$lib/features/landing-page/landing.css";
  import { page } from "$app/stores";
  import AffiliateHowItWorks from "$lib/components/features/affiliate/affiliate-how-it-works.svelte";
  import { ArrowRight01Icon } from "$lib/components/features/icons";
  import SeoHead from "$lib/components/seo-head.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { reveal } from "$lib/features/landing-page/reveal";
  import SiteFooter from "$lib/features/landing-page/site-footer.svelte";
  import SiteNav from "$lib/features/landing-page/site-nav.svelte";
  import {
    AFFILIATE_COMMISSION_RATE,
    AFFILIATE_MINIMUM_PAYOUT_AMOUNT,
  } from "$lib/schemas/affiliate.constant";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const commissionLabel = `${Math.round(AFFILIATE_COMMISSION_RATE * 100)}%`;

  const minimumPayoutLabel = new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    minimumFractionDigits: 0,
    style: "currency",
  }).format(AFFILIATE_MINIMUM_PAYOUT_AMOUNT);

  const applyHref = $derived($page.data.user ? "/affiliate/" : "/sign-up/");

  const stats = [
    {
      label: "Komisi per transaksi",
      note: "dari nilai paket yang dibeli lewat tautanmu",
      value: commissionLabel,
    },
    {
      label: "Klik tercatat",
      note: "mereka tak harus langsung membayar",
      value: "30 hari",
    },
    {
      label: "Minimal pencairan",
      note: "saldo dicairkan begitu mencapai nominal ini",
      value: minimumPayoutLabel,
    },
    {
      label: "Jadwal pencairan",
      note: "otomatis ke rekening yang kamu daftarkan",
      value: "Setiap Jumat",
    },
  ];
</script>

<SeoHead
  title="Program Afiliasi · sinnau"
  description="Dapatkan 25% komisi dari setiap langganan yang datang lewat tautan referral-mu. Daftar gratis, pencairan setiap Jumat."
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
          Program Afiliasi
        </span>
        <h1
          class="mt-3 font-display text-[36px] leading-[1.04] tracking-[-0.03em] text-balance sm:text-[46px]"
        >
          Dapatkan 25% komisi<br />dari tiap langganan
        </h1>
        <p
          class="mt-4 text-[15px] leading-relaxed text-[var(--landing-muted)] text-pretty sm:text-[16px]"
        >
          Setiap langganan yang datang dari tautanmu tercatat otomatis jadi
          komisi. Tanpa laporan manual.
        </p>

        <div
          class="mt-8 flex flex-wrap items-center justify-center gap-3"
          use:reveal={{ delay: 80 }}
        >
          <Button
            href={applyHref}
            size="lg"
            class="px-5 bg-[var(--landing-fg)] text-[var(--landing-bg)] hover:bg-[color-mix(in_oklch,var(--landing-fg)_85%,transparent)]"
          >
            Daftar jadi afiliasi
            <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
          </Button>
          <Button href="#cara-kerja" size="lg" variant="ghost">
            Cara kerjanya
          </Button>
        </div>
      </div>
    </section>

    <section
      class="mx-auto mt-16 w-full max-w-[1240px] px-5 sm:px-8 md:mt-20"
      use:reveal
    >
      <div
        class="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border bg-[var(--landing-border)] md:grid-cols-4"
      >
        {#each stats as stat (stat.label)}
          <div class="bg-[var(--landing-bg)] px-6 py-8 md:py-10">
            <span class="font-eyebrow text-[var(--landing-muted)]">
              {stat.label}
            </span>
            <p
              class="mt-3 font-display text-[28px] tracking-[-0.03em] sm:text-[34px]"
            >
              {stat.value}
            </p>
            <p
              class="mt-2 text-[13px] leading-relaxed text-[var(--landing-muted)]"
            >
              {stat.note}
            </p>
          </div>
        {/each}
      </div>
    </section>

    <section
      id="cara-kerja"
      class="mx-auto w-full max-w-[1240px] scroll-mt-24 px-5 py-24 sm:px-8 sm:py-28"
    >
      <div class="affiliate-how-landing mx-auto max-w-[42rem]" use:reveal>
        <AffiliateHowItWorks {commissionLabel} {minimumPayoutLabel} />
      </div>
    </section>

    <section
      class="relative mx-auto w-full max-w-[1240px] px-5 pb-28 sm:px-8 sm:pb-36"
      use:reveal
    >
      <div
        class="overflow-hidden rounded-[20px] border bg-[var(--landing-fg)] px-8 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20"
      >
        <div class="mx-auto max-w-[36rem] text-center">
          <h2
            class="font-display text-[28px] leading-[1.06] tracking-[-0.03em] text-[var(--landing-bg)] text-balance sm:text-[38px]"
          >
            Siap jadi afiliasi Sinnau?
          </h2>

          <p
            class="mt-5 text-[14px] leading-relaxed text-[color-mix(in_oklch,var(--landing-bg)_60%,transparent)] text-pretty sm:text-[15px]"
          >
            Daftar gratis dan isi satu formulir. Tim kami meninjau, lalu tautan
            referral-mu aktif.
          </p>

          <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              href={applyHref}
              size="lg"
              class="px-5 bg-[var(--landing-bg)] text-[var(--landing-fg)] hover:bg-[color-mix(in_oklch,var(--landing-bg)_90%,transparent)]"
            >
              Daftar jadi afiliasi
              <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  </main>

  <SiteFooter />
</div>

<style>
  :global(.affiliate-how-landing) {
    --border: var(--landing-border);
    --muted-foreground: var(--landing-muted);
  }
</style>
