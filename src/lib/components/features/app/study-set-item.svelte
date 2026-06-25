<script lang="ts">
  import { resolve } from "$app/paths";
  import { ArrowRight01Icon } from "$lib/components/features/icons";
  import StudySetIcon from "$lib/components/features/study-set/study-set-icon.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface StudySet {
    id: string;
    title: string;
    description: string | null;
  }

  let { studySet }: { studySet: StudySet } = $props();
</script>

<a
  href={resolve("/(app)/study/[studySetId]/flashcard", {
    studySetId: studySet.id,
  })}
  class="group flex items-center gap-4 border-b bg-card p-4 text-card-foreground transition-colors duration-200 last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset active:bg-muted/60"
>
  <div class="shrink-0 transition-transform duration-200 group-hover:scale-105">
    <StudySetIcon studySetId={studySet.id} />
  </div>

  <div class="flex min-w-0 flex-1 flex-col gap-0.5">
    <h3 class="truncate text-sm font-medium leading-5">
      {studySet.title}
    </h3>
    <p class="line-clamp-1 text-xs text-muted-foreground">
      {studySet.description ?? ""}
    </p>
  </div>

  <div
    class="shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
  >
    <HugeiconsIcon icon={ArrowRight01Icon} class="size-4" />
  </div>
</a>
