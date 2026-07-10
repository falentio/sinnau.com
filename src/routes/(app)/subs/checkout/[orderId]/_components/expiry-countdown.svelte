<script lang="ts">
  import { onMount } from "svelte";

  let { expiresAt }: { expiresAt: Date } = $props();

  let now = $state(new Date());
  let remainingMs = $derived(expiresAt.getTime() - now.getTime());
  let expired = $derived(remainingMs <= 0);

  const totalSeconds = $derived(Math.max(0, Math.floor(remainingMs / 1000)));
  const mm = $derived(String(Math.floor(totalSeconds / 60)).padStart(2, "0"));
  const ss = $derived(String(totalSeconds % 60).padStart(2, "0"));

  onMount(() => {
    const id = setInterval(() => {
      now = new Date();
    }, 1000);
    return () => clearInterval(id);
  });
</script>

<div
  class="inline-flex items-baseline gap-1 rounded-full border border-border/60 bg-background/60 px-3 py-1 font-mono"
>
  <span class="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
    Bayar sebelum
  </span>
  <span
    class="font-heading text-sm font-semibold tabular-nums tracking-tight"
    class:text-destructive={expired}
    class:text-foreground={!expired}
  >
    {mm}:{ss}
  </span>
</div>
