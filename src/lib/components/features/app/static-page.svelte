<script lang="ts">
  import { ArrowLeft01Icon } from "$lib/components/features/icons";
  import SeoHead from "$lib/components/seo-head.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    description: string;
    heading: string;
    children: Snippet;
  }

  let { title, description, heading, children }: Props = $props();
</script>

<SeoHead {title} {description} />

<div class="mx-auto w-full max-w-2xl px-6 py-4">
  <Button variant="ghost" size="icon" href="/home/" aria-label="Kembali">
    <HugeiconsIcon icon={ArrowLeft01Icon} />
  </Button>
  <h1 class="mt-2 text-2xl font-semibold">{heading}</h1>
  <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
    {@render children()}
  </div>
</div>
