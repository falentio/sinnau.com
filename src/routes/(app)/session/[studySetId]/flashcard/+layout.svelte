<script lang="ts">
  import FlashcardSessionHeader from "$lib/components/features/flashcard-session/flashcard-session-header.svelte";

  import type { LayoutData, LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();
</script>

<FlashcardSessionHeader title={data.studySet.title} />
<main class="mx-auto w-full max-w-2xl px-6 py-10">
  {@render children()}
</main>
