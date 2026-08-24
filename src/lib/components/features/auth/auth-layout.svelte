<script lang="ts">
  import { resolve } from "$app/paths";
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
        <img
          src="/favicon.jpg"
          alt=""
          aria-hidden="true"
          width="24"
          height="24"
          class="size-6 rounded-md"
        />
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
        <img
          src="/favicon.jpg"
          alt=""
          aria-hidden="true"
          width="64"
          height="64"
          class="mx-auto size-16 rounded-4xl shadow-lg"
        />
        <h2 class="text-3xl font-semibold tracking-tight">{heading}</h2>
        <p class="text-muted-foreground">{description}</p>
      </div>
    </div>
  </div>
</div>
