<script lang="ts">
  import { ArrowRight01Icon } from "$lib/components/features/icons";
  import Progress from "$lib/components/ui/progress/progress.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    chapters: Record<string, string>;
    scores: Record<string, { correct: number; total: number }>;
    studySetId: string;
  }
  let { chapters, scores, studySetId }: Props = $props();

  const chapterEntries = $derived(Object.entries(chapters));
</script>

<div class="grid gap-3">
  {#each chapterEntries as [id, title] (id)}
    {@const wrong = (scores[id]?.total ?? 0) - (scores[id]?.correct ?? 0)}
    {@const total = scores[id]?.total ?? 0}
    {@const wrongPercent = total > 0 ? (wrong / total) * 100 : 0}

    <a
      href="/study/{studySetId}/?chapter={id}"
      class="group flex flex-col gap-3 rounded-4xl border bg-card p-1.5 shadow-xs transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px hover:shadow-sm"
    >
      <div
        class="flex flex-col gap-3 rounded-[calc(2rem-0.375rem)] bg-background/50 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-colors duration-300 group-hover:bg-destructive/15"
            >
              <span class="text-xs font-semibold tabular-nums">{wrong}</span>
            </span>
            <div class="flex flex-col">
              <span class="text-sm font-medium">{title}</span>
              <span class="text-xs text-muted-foreground">
                {wrong} dari {total} salah
              </span>
            </div>
          </div>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            class="size-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </div>
        <Progress
          value={100 - wrongPercent}
          class="h-1.5 [&_[data-slot=progress-indicator]]:bg-destructive/60"
        />
      </div>
    </a>
  {/each}
</div>
