<script lang="ts">
  import { Tick02Icon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    studySetId: string;
  }
  let { studySetId }: Props = $props();

  const hubHref = $derived(`/session/${studySetId}/flashcard/`);
</script>

<section
  class="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
>
  <span
    class="inline-flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
  >
    <HugeiconsIcon icon={Tick02Icon} class="size-6" />
  </span>
  <div class="flex flex-col gap-1">
    <p class="text-lg font-medium text-foreground">Semua selesai</p>
    <p class="max-w-sm text-sm text-muted-foreground">
      Tidak ada kartu yang perlu di-review sekarang. Kembali lagi nanti atau
      tambah flashcard baru.
    </p>
  </div>
  <Button variant="outline" href={hubHref}>Kembali ke hub</Button>
</section>
