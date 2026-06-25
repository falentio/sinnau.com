<script lang="ts">
  import {
    Book03Icon,
    Cards01Icon,
    Quiz01Icon,
  } from "$lib/components/features/icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { GenerationItem } from "./waiting-room.types.ts";

  interface Props {
    item: GenerationItem;
  }

  const { item }: Props = $props();

  const config = $derived.by(() => {
    if (item.type === "chapter") {
      return {
        icon: Book03Icon,
        label: "Bab",
        subtitle: null,
        title: item.data.title,
      };
    }

    if (item.type === "flashcard") {
      return {
        icon: Cards01Icon,
        label: "Flashcard",
        subtitle: item.data.back,
        title: item.data.front,
      };
    }

    return {
      icon: Quiz01Icon,
      label: "Kuis",
      subtitle: `${item.data.options.length} opsi`,
      title: item.data.questionText,
    };
  });
</script>

<div class="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-xs">
  <div
    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
  >
    <HugeiconsIcon icon={config.icon} size={18} />
  </div>
  <div class="min-w-0 flex-1">
    <p
      class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
    >
      {config.label}
    </p>
    <p class="mt-0.5 text-sm font-medium leading-snug text-card-foreground">
      {config.title}
    </p>
    {#if config.subtitle}
      <p
        class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground"
      >
        {config.subtitle}
      </p>
    {/if}
  </div>
</div>
