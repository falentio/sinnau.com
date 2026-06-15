<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";

  interface Props {
    onConfirm: () => void;
    open: boolean;
    unansweredCount: number;
  }
  let { open = $bindable(), unansweredCount, onConfirm }: Props = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Content showCloseButton={true}>
    <Dialog.Header>
      <Dialog.Title>Selesaikan sesi?</Dialog.Title>
      {#if unansweredCount > 0}
        <Dialog.Description>
          {unansweredCount} soal belum dijawab dan akan dihitung salah.
        </Dialog.Description>
      {/if}
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="ghost" onclick={() => (open = false)}>Kembali</Button>
      <Button onclick={onConfirm}>Selesaikan</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
