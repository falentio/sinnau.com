<script lang="ts">
  import { Book03Icon } from "$lib/components/features/icons";
  import type { Rng } from "$lib/utils/rng";
  import { createRng } from "$lib/utils/rng";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    studySetId: string;
    size?: "default" | "lg";
  }

  const { studySetId, size = "default" }: Props = $props();

  const rng = $derived(createRng(studySetId));

  const getColor = (random: Rng) => {
    const step = 30;
    const n = 360 / step;
    const hue = random.range(n) * step;
    return `oklch(63.7% 0.237 ${hue})`;
  };

  const color = $derived(getColor(rng));
</script>

<div style:--primary={color}>
  <div
    class="w-min rounded-lg bg-primary/10 text-primary {size === 'lg'
      ? 'p-3'
      : 'p-2'}"
  >
    <HugeiconsIcon class={size === "lg" ? "size-8" : ""} icon={Book03Icon} />
  </div>
</div>
