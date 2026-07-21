<script lang="ts">
  import StudySetActionBar from "$lib/components/features/study-set/study-set-action-bar.svelte";
  import StudySetHeader from "$lib/components/features/study-set/study-set-header.svelte";
  import SeoHead from "$lib/components/seo-head.svelte";
  import type { Snippet } from "svelte";

  import type { LayoutData } from "./$types";

  interface Props {
    children: Snippet;
    data: LayoutData;
  }

  const { children, data } = $props() as Props;
</script>

<SeoHead
  title="{data.studySet.title} · sinnau"
  description="Pelajari {data.studySet
    .title} dengan flashcard dan quiz interaktif. Gunakan AI spaced repetition (FSRS) untuk ingat lebih lama di sinnau."
/>

<StudySetHeader studySet={data.studySet} chapters={data.chapters} />

<div class="">
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
