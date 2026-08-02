<script lang="ts">
  import { cn } from "$lib/utils.js";
  import type { SVGAttributes } from "svelte/elements";

  let { class: className, ...restProps }: SVGAttributes<SVGSVGElement> =
    $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 512 512"
  class={cn("size-4 shrink-0 rounded-full", className)}
  {...restProps}
>
  <path fill="#eee" d="m0 256l249.6-41.3L512 256v256H0z" />
  <path fill="#a2001d" d="M0 0h512v256H0z" />
</svg>
