<script lang="ts">
  interface Props {
    /** A value between 0 and 1. */
    progress: number;
    size?: number;
    stroke?: number;
  }

  const { progress, size = 72, stroke = 5 }: Props = $props();

  const radius = $derived((size - stroke) / 2);
  const circumference = $derived(radius * 2 * Math.PI);
  const offset = $derived(
    circumference - Math.min(Math.max(progress, 0), 1) * circumference
  );
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 {size} {size}"
  class="-rotate-90 text-foreground"
>
  <circle
    cx={size / 2}
    cy={size / 2}
    r={radius}
    fill="none"
    stroke="currentColor"
    stroke-width={stroke}
    class="text-muted-foreground/20"
  />
  <circle
    cx={size / 2}
    cy={size / 2}
    r={radius}
    fill="none"
    stroke="currentColor"
    stroke-width={stroke}
    stroke-linecap="round"
    stroke-dasharray={circumference}
    stroke-dashoffset={offset}
    class="transition-all duration-700 ease-out"
  />
</svg>
