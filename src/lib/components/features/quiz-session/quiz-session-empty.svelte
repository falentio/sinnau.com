<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import EmptyContent from "$lib/components/ui/empty/empty-content.svelte";
  import EmptyDescription from "$lib/components/ui/empty/empty-description.svelte";
  import EmptyHeader from "$lib/components/ui/empty/empty-header.svelte";
  import EmptyMedia from "$lib/components/ui/empty/empty-media.svelte";
  import EmptyTitle from "$lib/components/ui/empty/empty-title.svelte";
  import Empty from "$lib/components/ui/empty/empty.svelte";
  import { Add01Icon, Quiz01Icon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  let { onNewSession }: { onNewSession: () => void } = $props();
</script>

<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <HugeiconsIcon icon={Quiz01Icon} />
    </EmptyMedia>
    <EmptyTitle>Belum ada sesi belajar</EmptyTitle>
    <EmptyDescription>Mulai sesi pertama untuk berlatih quiz.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button size="sm" onclick={onNewSession}>
      <HugeiconsIcon icon={Add01Icon} />
      Mulai sesi
    </Button>
  </EmptyContent>
</Empty>
