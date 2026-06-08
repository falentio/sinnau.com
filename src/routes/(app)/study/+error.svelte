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
    LockIcon,
    Search01Icon,
  } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import type { IconSvgElement } from "@hugeicons/svelte";

  interface ErrorInfo {
    title: string;
    message: string;
    icon: IconSvgElement;
  }

  const errorMap: Record<number, ErrorInfo> = {
    403: {
      icon: LockIcon,
      message: "Anda tidak memiliki izin untuk mengakses sumber belajar ini.",
      title: "Akses ditolak",
    },
    404: {
      icon: Search01Icon,
      message: "Modul belajar yang Anda cari tidak ada atau telah dihapus.",
      title: "Modul belajar tidak ditemukan",
    },
    500: {
      icon: Alert02Icon,
      message: "Server mengalami masalah tak terduga. Coba beberapa saat lagi.",
      title: "Masalah internal server",
    },
  };

  // oxlint-disable-next-line typescript/no-non-null-assertion -- guaranteed to exist since we have a typescript
  const defaultError = errorMap["500"]!;
  const friendlyError = $derived(errorMap[page.status] ?? defaultError);
</script>

<div class="mx-auto flex-2 h-full flex w-full max-w-2xl flex-col px-6">
  <Empty>
    <EmptyHeader>
      <EmptyMedia
        variant="icon"
        class={page.status === 500
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary"}
      >
        <HugeiconsIcon icon={friendlyError.icon} />
      </EmptyMedia>
      <EmptyTitle
        class={page.status === 500 ? "text-destructive" : "text-primary"}
      >
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
