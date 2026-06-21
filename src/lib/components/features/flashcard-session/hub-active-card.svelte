<script lang="ts">
  import { ArrowRight01Icon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    pendingCount: number;
    sessionId: string;
    studySetId: string;
  }
  let { pendingCount, sessionId, studySetId }: Props = $props();

  const continueHref = $derived(
    `/session/${studySetId}/flashcard/${sessionId}/`
  );
</script>

<aside
  class="rounded-2xl border border-border bg-card p-1.5 text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
>
  <div
    class="rounded-[calc(0.75rem-0.375rem)] bg-background/60 px-5 py-5 sm:px-6 sm:py-6"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <span
          class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Sesi aktif
        </span>
        <p class="text-lg font-medium leading-tight text-foreground">
          {pendingCount} kartu menunggu
        </p>
        <p class="text-sm text-muted-foreground">
          Lanjutkan review dari tempat kamu berhenti.
        </p>
      </div>
      <Button href={continueHref} class="group w-fit" size="default">
        <span>Lanjutkan review</span>
        <span
          class="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} class="size-3.5" />
        </span>
      </Button>
    </div>
  </div>
</aside>
