<script lang="ts">
  import { page } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
  import {
    ArrowLeft01Icon,
    Dollar01Icon,
    PieChartIcon,
  } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import type { Snippet } from "svelte";

  const p = $props() as {
    children: Snippet;
  };
</script>

<div class="mx-auto w-full max-w-2xl px-3">
  <Button variant="ghost" href="/home">
    <HugeiconsIcon icon={ArrowLeft01Icon} />
    Kembali
  </Button>
</div>

<div class="mx-auto mt-4 w-full max-w-2xl px-3">
  <div class=" rounded-4xl bg-card p-6 shadow-sm">
    <h1 class="text-2xl font-semibold">Subskripsi Saya</h1>
    <p class="mt-2 text-sm text-muted-foreground">
      Lihat dan kelola subskripsi Anda di sini.
    </p>

    <div class="mt-2 flex w-min gap-1">
      <Button
        href="/subs/usage"
        variant={page.route.id === "/(app)/subs/usage" ? "outline" : "ghost"}
      >
        <HugeiconsIcon icon={PieChartIcon} />
        Penggunaan
      </Button>
      <Button
        href="/subs/pricing"
        variant={page.route.id === "/(app)/subs/pricing" ? "outline" : "ghost"}
      >
        <HugeiconsIcon icon={Dollar01Icon} />
        Harga
      </Button>
    </div>
  </div>
</div>

<div class="mx-auto mt-3 w-full max-w-2xl px-3">
  {@render p.children()}
</div>
