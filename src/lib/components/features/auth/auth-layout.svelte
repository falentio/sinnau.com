<script lang="ts">
  import { resolve } from "$app/paths";
  import { AiBeautifyIcon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
    description: string;
    gradient: "top-left" | "bottom-right";
    heading: string;
  }

  const { children, description, gradient, heading }: Props = $props();

  const gradientStyle = $derived(
    gradient === "top-left"
      ? "bg-[radial-gradient(circle_at_top_left,var(--primary),transparent_28rem),linear-gradient(135deg,var(--muted),var(--background))]"
      : "bg-[radial-gradient(circle_at_bottom_right,var(--primary),transparent_28rem),linear-gradient(135deg,var(--background),var(--muted))]"
  );
</script>

<div class="grid min-h-svh bg-background lg:grid-cols-2">
  <div class="flex flex-col gap-4 p-6 md:p-10">
    <div class="flex justify-center gap-2 md:justify-start">
      <a href={resolve("/")} class="flex items-center gap-2 font-medium">
        <div
          class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
        >
          <HugeiconsIcon icon={AiBeautifyIcon} class="size-4" />
        </div>
        Sinnau
      </a>
    </div>

    <div class="flex flex-1 items-center justify-center">
      <div class="w-full max-w-xs">
        {@render children()}
      </div>
    </div>
  </div>

  <div class="relative hidden overflow-hidden bg-muted lg:block">
    <div class="absolute inset-0 {gradientStyle} opacity-70"></div>
    <div class="absolute inset-0 flex items-center justify-center p-12">
      <div class="max-w-md space-y-4 text-center">
        <div
          class="mx-auto flex size-16 items-center justify-center rounded-4xl bg-primary text-primary-foreground shadow-lg"
        >
          <HugeiconsIcon icon={AiBeautifyIcon} class="size-8" />
        </div>
        <h2 class="text-3xl font-semibold tracking-tight">{heading}</h2>
        <p class="text-muted-foreground">{description}</p>
      </div>
    </div>
  </div>
</div>
