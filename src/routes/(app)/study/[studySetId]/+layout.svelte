<script lang="ts">
  import StudySetHeader from "$lib/components/features/study-set/study-set-header.svelte";
  import type { Snippet } from "svelte";

  import type { LayoutData } from "./$types";

  interface Props {
    children: Snippet;
    data: LayoutData;
  }

  const { children, data } = $props() as Props;
</script>

<StudySetHeader studySet={data.studySet} chapters={data.chapters} />

<div>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
