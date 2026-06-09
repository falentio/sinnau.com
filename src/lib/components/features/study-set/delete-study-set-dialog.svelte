<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import { client } from "$lib/orpc";
  import { ORPCError } from "@orpc/client";
  import { toast } from "svelte-sonner";

  interface Props {
    open: boolean;
    studySetId: string;
    studySetTitle: string;
    onOpenChange: (open: boolean) => void;
  }

  const {
    open = $bindable(false),
    studySetId,
    studySetTitle,
    onOpenChange,
  }: Props = $props();

  let confirmationText = $state("");
  let submitting = $state(false);

  const canDelete = $derived(confirmationText.trim() === studySetTitle);

  const resetForm = () => {
    confirmationText = "";
    submitting = false;
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      resetForm();
    }
    onOpenChange(value);
  };

  const handleDelete = async () => {
    if (!canDelete || submitting) {
      return;
    }
    submitting = true;
    try {
      await client.studySet.delete({ id: studySetId });
      toast.success("Study set berhasil dihapus.", {
        position: "top-right",
      });
      handleOpenChange(false);
      await goto(resolve("/home/"));
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
        toast.error("Study set belum bisa dihapus. Coba lagi sebentar.", {
          position: "top-right",
        });
      }
    } finally {
      submitting = false;
    }
  };
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content showCloseButton={!submitting}>
    <Dialog.Header>
      <Dialog.Title>Hapus Study Set</Dialog.Title>
      <Dialog.Description>
        Study set yang dihapus masih bisa diakses oleh pengguna yang pernah
        membukanya. Kamu bisa mengembalikannya nanti.
      </Dialog.Description>
    </Dialog.Header>
    <div class="flex flex-col gap-3">
      <p class="text-sm text-muted-foreground">
        Ketik <span class="font-semibold text-foreground">{studySetTitle}</span> untuk
        mengonfirmasi:
      </p>
      <Input
        bind:value={confirmationText}
        placeholder={studySetTitle}
        disabled={submitting}
      />
    </div>
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
        disabled={!canDelete || submitting}
      >
        {submitting ? "Menghapus..." : "Hapus"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
