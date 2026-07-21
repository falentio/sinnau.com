<script lang="ts">
  import { browser } from "$app/env";
  import { onNavigate } from "$app/navigation";
  import { navigating } from "$app/state";
  import { onDestroy, untrack } from "svelte";
  import { SvelteMap } from "svelte/reactivity";

  const progressIds = $state([] as string[]);
  const progresses = new Map<
    string,
    ReturnType<typeof createIncrementedNumber>
  >();
  const intervals = [] as ReturnType<typeof setInterval>[];
  const createIncrementedNumber = () => {
    let n = $state(0);
    let done = $state(false);
    let visible = $state(true);
    const p = $derived(n / (n + 50));
    const interval = setInterval(() => {
      untrack(() => {
        if (p > 90) {
          n += 0.001;
          return;
        }
        if (p > 80) {
          n += 0.01;
          return;
        }
        if (p > 70) {
          n += 0.1;
          return;
        }
        n += 0.9;
      });
    }, 15);
    intervals.push(interval);

    return {
      done: () => {
        done = true;
        setTimeout(() => {
          visible = false;
        }, 300);
        clearInterval(interval);
      },
      getValue: () => {
        if (done) {
          return 100;
        }
        return p;
      },
      getVisible: () => visible,
    };
  };

  onDestroy(() => {
    for (const interval of intervals) {
      clearInterval(interval);
    }
  });

  onNavigate((nav) => {
    if (!browser) {
      return;
    }
    if (nav.to === null) {
      return;
    }
    const id = Math.random().toString(36);
    progresses.set(id, createIncrementedNumber());
    progressIds.push(id);
    console.log("start progress", id, $state.snapshot(progressIds));
    return () => {
      progresses.get(id)?.done();
    };
  });
</script>

<div class="w-full h-0 relative">
  {#each progressIds as id (id)}
    {@const progress = progresses.get(id)}
    {#if progress?.getVisible()}
      <div
        class="absolute top-0 left-0 h-0.5 z-100 bg-primary transition-all duration-300 ease-in-out"
        style="width: {progress?.getValue()}%"
      ></div>
    {/if}
  {/each}
</div>
