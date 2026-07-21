<script lang="ts">
  import "$lib/features/landing-page/landing.css";
  import { page } from "$app/stores";
  import SeoHead from "$lib/components/seo-head.svelte";
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

<SeoHead
  title="sinnau · Belajar yang melekat"
  description="Ubah PDF jadi modul belajar dengan flashcard dan kuis AI. FSRS menjadwalkan ulangan di momen yang tepat. Ingat lebih lama, belajar lebih sedikit."
  og={{ description: "Belajar yang melekat." }}
/>

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
