<script lang="ts">
  import { page } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
  import EmptyContent from "$lib/components/ui/empty/empty-content.svelte";
  import EmptyDescription from "$lib/components/ui/empty/empty-description.svelte";
  import EmptyHeader from "$lib/components/ui/empty/empty-header.svelte";
  import EmptyMedia from "$lib/components/ui/empty/empty-media.svelte";
  import EmptyTitle from "$lib/components/ui/empty/empty-title.svelte";
  import Empty from "$lib/components/ui/empty/empty.svelte";
  import {
    Alert02Icon,
    ArrowLeft01Icon,
    Home01Icon,
  } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface ErrorInfo {
    title: string;
    message: string;
  }

  const errorMap: Record<number, ErrorInfo> = {
    500: {
      message: "Server mengalami masalah tak terduga. Coba beberapa saat lagi.",
      title: "Masalah internal server",
    },
  };

  // oxlint-disable-next-line typescript/no-non-null-assertion -- guaranteed to exist since we have a typescript
  const defaultError = errorMap["500"]!;
  const friendlyError = $derived(errorMap[page.status] ?? defaultError);
</script>

<div class="mx-auto flex h-full w-full max-w-2xl flex-col px-6">
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon" class="bg-destructive/10 text-destructive">
        <HugeiconsIcon icon={Alert02Icon} />
      </EmptyMedia>
      <EmptyTitle class="text-destructive">
        {friendlyError.title}
      </EmptyTitle>
      <EmptyDescription class="max-w-sm">
        {friendlyError.message}
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
