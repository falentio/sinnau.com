<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Sheet from "$lib/components/ui/sheet/index.js";

  interface Props {
    onConfirm: () => void;
    open: boolean;
    unansweredCount: number;
  }
  let { open = $bindable(), unansweredCount, onConfirm }: Props = $props();
</script>

<Sheet.Root bind:open>
  <Sheet.Content side="bottom" class="rounded-t-2xl">
    <div class="flex flex-col gap-4 p-6">
      <Sheet.Header>
        <Sheet.Title>Selesaikan sesi?</Sheet.Title>
      </Sheet.Header>
      {#if unansweredCount > 0}
        <p class="text-sm text-muted-foreground">
          {unansweredCount} soal belum dijawab dan akan dihitung salah.
        </p>
      {/if}
      <div class="flex flex-col gap-2">
        <Button onclick={onConfirm}>Selesaikan</Button>
        <Button variant="ghost" onclick={() => (open = false)}>Kembali</Button>
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>
