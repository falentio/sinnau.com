<script lang="ts">
  import { flip } from "svelte/animate";
  import { fade, fly } from "svelte/transition";

  import GenerationItemCard from "./generation-item-card.svelte";
  import type { GenerationItem } from "./waiting-room.types.ts";

  interface Props {
    items: GenerationItem[];
  }

  const { items }: Props = $props();

  const keyFor = (item: GenerationItem, index: number): string => {
    const base = item.type;
    if (item.type === "chapter") {
      return `${base}:${item.data.slug}:${index}`;
    }
    if (item.type === "flashcard") {
      return `${base}:${item.data.front}:${index}`;
    }
    return `${base}:${item.data.questionText}:${index}`;
  };
</script>

<div class="flex flex-col gap-3">
  {#each items as item, index (keyFor(item, index))}
    <div
      in:fly={{ duration: 400, opacity: 0, y: 10 }}
      out:fade={{ duration: 250 }}
      animate:flip={{ duration: 300 }}
    >
      <GenerationItemCard {item} />
    </div>
  {/each}
</div>
