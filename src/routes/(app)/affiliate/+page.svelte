<script lang="ts">
  import AffiliateApplySection from "$lib/components/features/affiliate/affiliate-apply-section.svelte";
  import AffiliateEarningsStats from "$lib/components/features/affiliate/affiliate-earnings-stats.svelte";
  import AffiliateHowItWorks from "$lib/components/features/affiliate/affiliate-how-it-works.svelte";
  import AffiliatePayoutSection from "$lib/components/features/affiliate/affiliate-payout-section.svelte";
  import AffiliatePendingSummary from "$lib/components/features/affiliate/affiliate-pending-summary.svelte";
  import AffiliateReferralCard from "$lib/components/features/affiliate/affiliate-referral-card.svelte";
  import { createApplyForm } from "$lib/components/features/affiliate/create-apply-form.svelte";
  import { createPayoutForm } from "$lib/components/features/affiliate/create-payout-form.svelte";
  import { ArrowLeft01Icon } from "$lib/components/features/icons";
  import SeoHead from "$lib/components/seo-head.svelte";
  import {
    AFFILIATE_COMMISSION_RATE,
    AFFILIATE_MINIMUM_PAYOUT_AMOUNT,
  } from "$lib/schemas/affiliate.constant";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { untrack } from "svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const commissionLabel = `${Math.round(AFFILIATE_COMMISSION_RATE * 100)}%`;

  const minimumPayoutLabel = new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    minimumFractionDigits: 0,
    style: "currency",
  }).format(AFFILIATE_MINIMUM_PAYOUT_AMOUNT);

  const profile = $derived(data.summary.profile);

  const pendingApplication = $derived(
    profile || data.application?.status !== "PENDING" ? null : data.application
  );

  const rejectedApplication = $derived(
    profile || data.application?.status !== "REJECTED" ? null : data.application
  );

  const referralUrl = $derived(
    profile ? new URL(`/r/${profile.slug}`, data.origin).href : ""
  );

  const { form, formData, submitting, enhance } = createApplyForm(
    untrack(() =>
      data.application?.status === "REJECTED" ? data.application : null
    )
  );

  const advantageCount = $derived($formData.advantage.trim().length);

  const {
    enhance: payoutEnhance,
    errors: payoutErrors,
    form: payoutForm,
    formData: payoutFormData,
    submitting: payoutSubmitting,
  } = createPayoutForm(untrack(() => data.payoutAccount));
</script>

<SeoHead
  title="Afiliasi · sinnau"
  description="Program afiliasi Sinnau. Bagikan tautan referral-mu dan dapatkan komisi dari setiap langganan yang lewat."
  robots="noindex"
/>

<div class="mx-auto w-full max-w-3xl px-6 pt-10 pb-16 md:pt-14">
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

  {#if profile}
    <header class="flex flex-col gap-2 pb-8 md:pb-10">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      >
        Afiliasi
      </span>
      <h1
        class="font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl"
      >
        Sebarkan tautanmu, panen komisinya
      </h1>
      <p class="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Setiap kali temanmu berlangganan lewat tautan ini, kamu dapat
        {commissionLabel} dari nilai transaksinya. Tercatat otomatis, tanpa ribet.
      </p>
    </header>

    <AffiliateReferralCard {referralUrl} slug={profile.slug} />
    <AffiliateEarningsStats
      conversionCount={data.summary.conversionCount}
      {minimumPayoutLabel}
      pendingBalance={data.summary.pendingBalance}
      totalEarned={data.summary.totalEarned}
      totalPaid={data.summary.totalPaid}
    />

    <div class="mt-4">
      <AffiliatePayoutSection
        enhance={payoutEnhance}
        errors={payoutErrors}
        form={payoutForm}
        formData={payoutFormData}
        hasAccount={Boolean(data.payoutAccount)}
        {minimumPayoutLabel}
        submitting={$payoutSubmitting}
      />
    </div>

    <AffiliateHowItWorks {commissionLabel} {minimumPayoutLabel} />

    <footer
      class="mt-10 border-t border-border/60 pt-6 text-[13px] leading-relaxed text-muted-foreground"
    >
      Komisi dihitung dari nilai paket yang dibeli lewat tautanmu, dan tercatat
      otomatis begitu pembayaran berhasil.
    </footer>
  {:else if pendingApplication}
    <header class="flex flex-col gap-2 pb-8 md:pb-10">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      >
        Afiliasi
      </span>
      <h1
        class="font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl"
      >
        Aplikasimu sedang ditinjau
      </h1>
      <p class="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Santai dulu. Tim Sinnau sedang meninjau data yang kamu kirim. Begitu
        disetujui, tautan referral-mu langsung muncul di halaman ini.
      </p>
    </header>

    <AffiliatePendingSummary application={pendingApplication} />

    <p class="mt-6 text-[13px] leading-relaxed text-muted-foreground">
      Sambil menunggu, siapkan konten terbaikmu. Begitu disetujui, tautan
      referral-mu langsung aktif di halaman ini.
    </p>
  {:else}
    <header class="flex flex-col gap-2 pb-8 md:pb-10">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      >
        Afiliasi
      </span>
      <h1
        class="font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl"
      >
        Jadi afiliasi Sinnau
      </h1>
      <p class="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Cuma perlu satu tautan. Bagikan ke audiensmu, dapatkan
        {commissionLabel} dari tiap langganan yang lewat.
      </p>
    </header>

    <AffiliateApplySection
      {enhance}
      {form}
      {formData}
      submitting={$submitting}
      {commissionLabel}
      {advantageCount}
      rejected={Boolean(rejectedApplication)}
    />
  {/if}
</div>
