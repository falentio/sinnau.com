<script lang="ts">
  import { cn } from "$lib/utils.js";
  import type { WithElementRef } from "$lib/utils.js";
  import { untrack } from "svelte";

  import { setEmblaContext } from "./context.js";
  import type { CarouselAPI, CarouselProps, EmblaContext } from "./context.js";

  let {
    ref = $bindable(null),
    opts = {},
    plugins = [],
    setApi,
    orientation = "horizontal",
    class: className,
    children,
    ...restProps
  }: WithElementRef<CarouselProps> = $props();

  const carouselState = $state<EmblaContext>(
    untrack(() => ({
      api: undefined,
      canScrollNext: false,
      canScrollPrev: false,
      handleKeyDown: (_e: KeyboardEvent) => {
        // placeholder, replaced below
      },
      onInit: (_event: CustomEvent<CarouselAPI>) => {
        // placeholder, replaced below
      },
      options: opts,
      orientation,
      plugins,
      scrollNext: () => {
        // placeholder, replaced below
      },
      scrollPrev: () => {
        // placeholder, replaced below
      },
      scrollSnaps: [],
      scrollTo: (_index: number, _jump?: boolean) => {
        // placeholder, replaced below
      },
      selectedIndex: 0,
    }))
  );

  const onSelect = () => {
    if (!carouselState.api) {
      return;
    }
    carouselState.selectedIndex = carouselState.api.selectedScrollSnap();
    carouselState.canScrollNext = carouselState.api.canScrollNext();
    carouselState.canScrollPrev = carouselState.api.canScrollPrev();
  };

  carouselState.scrollPrev = () => {
    carouselState.api?.scrollPrev();
  };

  carouselState.scrollNext = () => {
    carouselState.api?.scrollNext();
  };

  carouselState.scrollTo = (index: number, jump?: boolean) => {
    carouselState.api?.scrollTo(index, jump);
  };

  carouselState.handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      carouselState.scrollPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      carouselState.scrollNext();
    }
  };

  carouselState.onInit = (event: CustomEvent<CarouselAPI>) => {
    carouselState.api = event.detail;
    setApi?.(carouselState.api);

    carouselState.scrollSnaps = carouselState.api.scrollSnapList();
    carouselState.api.on("select", onSelect);
    onSelect();
  };

  setEmblaContext(carouselState);

  $effect(() => () => {
    carouselState.api?.off("select", onSelect);
  });
</script>

<div
  bind:this={ref}
  data-slot="carousel"
  class={cn("relative", className)}
  role="region"
  aria-roledescription="carousel"
  {...restProps}
>
  {@render children?.()}
</div>
