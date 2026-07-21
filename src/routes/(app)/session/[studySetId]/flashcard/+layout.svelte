<script lang="ts">
  import FlashcardSessionHeader from "$lib/components/features/flashcard-session/flashcard-session-header.svelte";
  import SeoHead from "$lib/components/seo-head.svelte";

  import type { LayoutData, LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();
</script>

<SeoHead
  title="Review - {data.studySet.title} · sinnau"
  description="Review {data.studySet
    .title} dengan flashcard — jawab kartu ulang pakai sistem spaced repetition (FSRS) dan lihat hasil belajarmu di sinnau."
  robots="noindex"
/>

<FlashcardSessionHeader title={data.studySet.title} />
<main class="mx-auto w-full max-w-2xl px-6 py-10">
  {@render children()}
</main>
