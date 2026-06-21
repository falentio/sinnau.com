<script lang="ts">
  import { page } from "$app/state";
  import { ArrowLeft01Icon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    title: string;
  }
  let { title }: Props = $props();

  const backHref = $derived(
    `/study/${page.params.studySetId ?? ""}/flashcard/`
  );
</script>

<header
  class="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-6 backdrop-blur-md"
>
  <Button variant="ghost" size="sm" href={backHref}>
    <HugeiconsIcon icon={ArrowLeft01Icon} class="size-4" />
    <span class="text-sm">Kembali</span>
  </Button>
  <span class="h-4 w-px bg-border"></span>
  <h1 class="truncate text-sm font-medium text-muted-foreground">{title}</h1>
</header>
