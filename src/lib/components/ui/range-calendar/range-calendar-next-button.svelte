<script lang="ts">
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import type { ButtonVariant } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import { ArrowRightIcon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { RangeCalendar as RangeCalendarPrimitive } from "bits-ui";

  let {
    ref = $bindable(null),
    class: className,
    children,
    variant = "ghost",
    ...restProps
  }: RangeCalendarPrimitive.NextButtonProps & {
    variant?: ButtonVariant;
  } = $props();
</script>

{#snippet Fallback()}
  <HugeiconsIcon
    icon={ArrowRightIcon}
    strokeWidth={2}
    class={cn("size-4", className)}
  />
{/snippet}

<RangeCalendarPrimitive.NextButton
  bind:ref
  class={cn(
    buttonVariants({ variant }),
    "size-(--cell-size) bg-transparent p-0 select-none disabled:opacity-50 rtl:rotate-180",
    className
  )}
  {...restProps}
>
  {#if children}
    {@render children?.()}
  {:else}
    {@render Fallback()}
  {/if}
</RangeCalendarPrimitive.NextButton>
