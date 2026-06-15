<script lang="ts">
  interface Props {
    chapters: Record<string, string>;
    scores: Record<string, { correct: number; total: number }>;
    studySetId: string;
  }
  let { chapters, scores, studySetId }: Props = $props();
</script>

<div class="flex flex-wrap gap-2">
  {#each Object.entries(chapters) as [id, title] (id)}
    {@const wrong = (scores[id]?.total ?? 0) - (scores[id]?.correct ?? 0)}
    <a
      href="/study/{studySetId}/?chapter={id}"
      class="rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted"
    >
      {title} · {wrong} salah
    </a>
  {/each}
</div>
