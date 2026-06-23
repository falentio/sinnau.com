<script lang="ts">
  import "$lib/features/landing-page/landing.css";
  import { page } from "$app/stores";
  import CtaBanner from "$lib/features/landing-page/cta-banner.svelte";
  import Faq from "$lib/features/landing-page/faq.svelte";
  import FeatureBento from "$lib/features/landing-page/feature-bento.svelte";
  import Hero from "$lib/features/landing-page/hero.svelte";
  import HowItWorks from "$lib/features/landing-page/how-it-works.svelte";
  import RetentionMetrics from "$lib/features/landing-page/retention-metrics.svelte";
  import SiteFooter from "$lib/features/landing-page/site-footer.svelte";
  import SiteNav from "$lib/features/landing-page/site-nav.svelte";
  import Testimonials from "$lib/features/landing-page/testimonials.svelte";
</script>

<svelte:head>
  <title>sinnau &middot; Belajar yang melekat</title>
  <meta
    name="description"
    content="Ubah PDF jadi modul belajar dengan flashcard dan kuis AI. FSRS menjadwalkan ulangan di momen yang tepat. Ingat lebih lama, belajar lebih sedikit."
  />
  <meta property="og:title" content="sinnau" />
  <meta property="og:description" content="Belajar yang melekat." />
  <meta name="theme-color" content="#FBFBFA" />
</svelte:head>

<div class="landing-v3 relative min-h-[100dvh]">
  <div class="grain"></div>
  <SiteNav user={$page.data.user} />
  <main class="relative">
    <Hero />
    <FeatureBento />
    <HowItWorks />
    <RetentionMetrics />
    <Testimonials />
    <Faq />
    <div class="pb-28 sm:pb-36">
      <CtaBanner />
    </div>
  </main>
  <SiteFooter />
</div>
