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
    quizId: string;
    questionText: string;
    studySetId: string;
  }

  let {
    open = $bindable(false),
    quizId,
    questionText,
    studySetId,
  }: Props = $props();

  let submitting = $state(false);

  const handleDelete = async () => {
    submitting = true;
    try {
      await client.quiz.delete({ ids: [quizId] });
      toast.success("Quiz berhasil dihapus.", {
        position: "top-right",
      });
      await invalidate(`quiz:list:${studySetId}`);
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
        toast.error("Quiz belum bisa dihapus. Coba lagi sebentar.", {
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
      <Dialog.Title>Hapus Quiz</Dialog.Title>
      <Dialog.Description>
        `"{questionText}"` akan dihapus. Quiz yang dihapus tidak bisa
        dikembalikan.
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
