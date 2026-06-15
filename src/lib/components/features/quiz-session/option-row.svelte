<script lang="ts">
  import { Tick02Icon } from "$lib/components/features/icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Option {
    id: string;
    optionText: string;
  }
  interface Props {
    index: number;
    multi: boolean;
    onToggle: (id: string) => void;
    option: Option;
    selected: boolean;
  }
  let { option, index, selected, multi, onToggle }: Props = $props();

  const letter = $derived(String.fromCodePoint(65 + index));
</script>

<button
  type="button"
  class="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors {selected
    ? 'border-primary bg-primary/5'
    : 'border-border bg-card hover:bg-muted/50'}"
  onclick={() => onToggle(option.id)}
>
  <span
    class="flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium {selected
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border bg-background'}"
  >
    {#if selected && !multi}
      <HugeiconsIcon icon={Tick02Icon} class="size-4" />
    {:else}
      {letter}
    {/if}
  </span>
  <span class="flex-1 text-sm">{option.optionText}</span>
  {#if multi}
    <span
      class="flex size-5 shrink-0 items-center justify-center rounded border {selected
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border'}"
    >
      {#if selected}
        <HugeiconsIcon icon={Tick02Icon} class="size-3" />
      {/if}
    </span>
  {/if}
</button>
