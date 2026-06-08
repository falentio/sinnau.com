<script lang="ts">
  import {
    Alert02Icon,
    ArrowLeft01Icon,
    Home01Icon,
  } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import EmptyContent from "$lib/components/ui/empty/empty-content.svelte";
  import EmptyDescription from "$lib/components/ui/empty/empty-description.svelte";
  import EmptyHeader from "$lib/components/ui/empty/empty-header.svelte";
  import EmptyMedia from "$lib/components/ui/empty/empty-media.svelte";
  import EmptyTitle from "$lib/components/ui/empty/empty-title.svelte";
  import Empty from "$lib/components/ui/empty/empty.svelte";
  import type { IconSvgElement } from "@hugeicons/svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    customIcon?: IconSvgElement;
    error: {
      message: string;
      title: string;
    };
    status?: number;
  }

  const { customIcon, error, status }: Props = $props();
  const isDestructive = $derived(status === 500);
</script>

<div class="mx-auto flex h-full w-full max-w-2xl flex-col px-6">
  <Empty>
    <EmptyHeader>
      <EmptyMedia
        variant="icon"
        class={isDestructive
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary"}
      >
        <HugeiconsIcon
          icon={customIcon ?? Alert02Icon}
          class={isDestructive ? "text-destructive" : "text-primary"}
        />
      </EmptyMedia>
      <EmptyTitle class={isDestructive ? "text-destructive" : "text-primary"}>
        {error.title}
      </EmptyTitle>
      <EmptyDescription class="max-w-sm">
        {error.message}
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <div class="flex gap-2">
        <Button variant="outline" href="/home" size="sm">
          <HugeiconsIcon icon={Home01Icon} />
          Beranda
        </Button>
        <Button onclick={() => history.back()} size="sm">
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          Kembali
        </Button>
      </div>
    </EmptyContent>
  </Empty>
</div>
