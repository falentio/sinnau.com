<script lang="ts">
  import { resolve } from "$app/paths";
  import StudySetIcon from "$lib/components/features/study-set/study-set-icon.svelte";

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
  class="flex w-full flex-col gap-2 border-b bg-card p-3 text-card-foreground last:border-b-0"
>
  <StudySetIcon studySetId={studySet.id} />
  <div class="flex flex-col gap-1">
    <h3 class="w-max max-w-full truncate">
      {studySet.title}
    </h3>
    <div class="max-w-full truncate text-xs text-muted-foreground">
      {studySet.description ?? ""}
    </div>
  </div>
</a>
