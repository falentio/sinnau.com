<script lang="ts">
  import { page } from "$app/state";
  import {
    AiBeautifyIcon,
    Book03Icon,
    CrownIcon,
    Home01Icon,
    Search02Icon,
  } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";
</script>

<div
  class="sticky bottom-0 hidden group-has-data-[showbottombar=true]/app:flex"
>
  <div class="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-3">
    <div
      class="flex flex-row gap-3 rounded-full bg-popover p-1 text-popover-foreground shadow-xs inset-shadow-2xs inset-shadow-background/10"
    >
      <Button
        variant={page.route.id === "/(app)/home" ? "outline" : "ghost"}
        href="/home/"
        size="icon-lg"
      >
        <HugeiconsIcon icon={Home01Icon} />
      </Button>
      <Button variant="ghost" size="icon-lg">
        <HugeiconsIcon icon={Search02Icon} />
      </Button>
      <Button variant="default" size="icon-lg">
        <HugeiconsIcon icon={AiBeautifyIcon} />
      </Button>
      <Button variant="ghost" size="icon-lg">
        <HugeiconsIcon icon={Book03Icon} />
      </Button>
      <Button
        href="/subs/usage/"
        variant={page.route.id?.startsWith("/(app)/subs/")
          ? "outline"
          : "ghost"}
        size="icon-lg"
      >
        <HugeiconsIcon icon={CrownIcon} />
      </Button>
    </div>
  </div>
</div>
