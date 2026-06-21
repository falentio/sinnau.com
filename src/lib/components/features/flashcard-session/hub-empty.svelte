<script lang="ts">
  import { Cards01Icon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import EmptyContent from "$lib/components/ui/empty/empty-content.svelte";
  import EmptyDescription from "$lib/components/ui/empty/empty-description.svelte";
  import EmptyHeader from "$lib/components/ui/empty/empty-header.svelte";
  import EmptyMedia from "$lib/components/ui/empty/empty-media.svelte";
  import EmptyTitle from "$lib/components/ui/empty/empty-title.svelte";
  import Empty from "$lib/components/ui/empty/empty.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    studySetId: string;
  }
  let { studySetId }: Props = $props();

  const createHref = $derived(`/study/${studySetId}/flashcard/create/`);
</script>

<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <HugeiconsIcon icon={Cards01Icon} />
    </EmptyMedia>
    <EmptyTitle>Belum ada flashcard</EmptyTitle>
    <EmptyDescription>
      Study set ini belum memiliki flashcard. Buat satu untuk mulai menghafal
      dengan jadwal berulang.
    </EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button size="sm" href={createHref}>Buat flashcard</Button>
  </EmptyContent>
</Empty>
