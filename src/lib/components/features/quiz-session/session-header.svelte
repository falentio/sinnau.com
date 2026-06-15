<script lang="ts">
  import { page } from "$app/state";
  import { ArrowLeft01Icon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    title: string;
  }
  let { title }: Props = $props();
</script>

<header
  class="sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-background/80 px-6 backdrop-blur"
>
  <Button
    variant="ghost"
    size="sm"
    href="/study/{page.params.studySetId}/quiz/"
  >
    <HugeiconsIcon icon={ArrowLeft01Icon} />
    <span>Kembali</span>
  </Button>
  <h1 class="truncate text-sm font-medium text-muted-foreground">
    {title}
  </h1>
</header>
