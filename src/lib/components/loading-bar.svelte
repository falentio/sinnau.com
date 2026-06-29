<script lang="ts">
  import { browser } from "$app/env";
  import { navigating } from "$app/state";
  import { onMount, untrack } from "svelte";

  const isNavigating = $derived(navigating.to !== null);
  let progress = $state(0);

  $effect(() => {
    if (!isNavigating || !browser) {
      untrack(() => {
        progress = 0;
      });
      return;
    }
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const updateProgress = (initial: boolean) => {
      untrack(() => {
        if (!isNavigating || !browser) {
          progress = 100;
          return;
        }
        if (initial) {
          progress = 1;
        }
        if (progress >= 100) {
          progress = 1;
          return;
        }
        const SPEED = 0.03;
        progress = Math.max(1, progress);
        progress += SPEED * 15 + (75 - progress) * SPEED;
        timeout = setTimeout(updateProgress, 50, false);
      });
    };

    updateProgress(true);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  });
</script>

<div class="w-full h-0 relative">
  <div
    data-navigating={isNavigating ? "true" : "false"}
    class="absolute top-0 left-0 h-1 z-100 bg-primary data-[navigating='true']:opacity-100 opacity-0 transition-all duration-300 ease-in-out"
    style="width: {progress}%"
  ></div>
</div>
