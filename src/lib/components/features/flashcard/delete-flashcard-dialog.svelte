<script lang="ts">
  import { goto, invalidate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { client } from "$lib/orpc";
  import { ORPCError } from "@orpc/client";
  import { toast } from "svelte-sonner";

  interface Props {
    open: boolean;
    flashcardFront: string;
    flashcardId: string;
    studySetId: string;
  }

  let {
    open = $bindable(false),
    flashcardFront,
    flashcardId,
    studySetId,
  }: Props = $props();

  let submitting = $state(false);

  const handleDelete = async () => {
    submitting = true;
    try {
      await client.flashcard.delete({ ids: [flashcardId] });
      toast.success("Flashcard berhasil dihapus.", {
        position: "top-right",
      });
      await invalidate(`flashcard:${flashcardId}`);
      await invalidate(`flashcard:list:${studySetId}`);
      open = false;
    } catch (error) {
      if (error instanceof ORPCError) {
        if (error.code === "UNAUTHORIZED") {
          await goto(resolve("/(auth)/login"));
          return;
        }
        toast.error(error.message, { position: "top-right" });
      } else if (error instanceof Error) {
        toast.error(error.message, { position: "top-right" });
      } else {
        toast.error("Flashcard belum bisa dihapus. Coba lagi sebentar.", {
          position: "top-right",
        });
      }
    } finally {
      submitting = false;
    }
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content showCloseButton={!submitting}>
    <Dialog.Header>
      <Dialog.Title>Hapus Flashcard</Dialog.Title>
      <Dialog.Description>
        {`"${flashcardFront}"`} akan dihapus. Flashcard yang dihapus tidak bisa dikembalikan.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props: closeProps })}
          <Button {...closeProps} variant="outline" disabled={submitting}>
            Batal
          </Button>
        {/snippet}
      </Dialog.Close>
      <Button
        variant="destructive"
        onclick={handleDelete}
        disabled={submitting}
      >
        {submitting ? "Menghapus..." : "Hapus"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
