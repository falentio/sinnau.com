<script lang="ts">
  import { goto, invalidate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Form from "$lib/components/ui/form/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { client } from "$lib/orpc";
  import {
    FLASHCARD_HINT_MAX_LENGTH,
    FLASHCARD_TEXT_MAX_LENGTH,
    updateFlashcardInputSchema,
  } from "$lib/schemas/flashcard";
  import { ORPCError } from "@orpc/client";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { defaults, superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";
  import * as v from "valibot";

  interface Props {
    open: boolean;
    studySetId: string;
    flashcard: {
      back: string;
      front: string;
      hint: string | null;
      id: string;
      importance: number;
    };
  }

  let { open = $bindable(false), studySetId, flashcard }: Props = $props();

  const formSchema = v.omit(updateFlashcardInputSchema, ["id", "importance"]);

  const init = untrack(() => ({
    back: flashcard.back,
    front: flashcard.front,
    hint: flashcard.hint ?? "",
  }));

  const form = superForm(
    defaults<v.InferInput<typeof formSchema>>(init, valibotClient(formSchema)),
    {
      SPA: true,
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        try {
          await client.flashcard.update({
            ...submittedForm.data,
            id: flashcard.id,
            importance: flashcard.importance,
          });
          toast.success("Flashcard berhasil diperbarui.", {
            position: "top-right",
          });
          await invalidate(`flashcard:${flashcard.id}`);
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
            toast.error(
              "Flashcard belum bisa diperbarui. Coba lagi sebentar.",
              { position: "top-right" }
            );
          }
        }
      },
      resetForm: true,
      validators: valibotClient(formSchema),
    }
  );

  const { form: formData, enhance, submitting, reset } = form;

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      reset();
    }
  };

  $effect(() => {
    if (open) {
      reset();
    }
  });

  const frontCount = $derived(($formData.front ?? "").length);
  const backCount = $derived(($formData.back ?? "").length);
  const hintCount = $derived(($formData.hint ?? "").length);
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content showCloseButton={!$submitting}>
    <Dialog.Header>
      <Dialog.Title>Edit Flashcard</Dialog.Title>
      <Dialog.Description>Perbarui isi flashcard.</Dialog.Description>
    </Dialog.Header>
    <form method="POST" class="flex flex-col gap-5" novalidate use:enhance>
      <Form.Field {form} name="front">
        <Form.Control>
          {#snippet children({ props })}
            <div class="flex items-center justify-between gap-3">
              <Form.Label>Depan</Form.Label>
              <span class="text-xs text-muted-foreground"
                >{frontCount}/{FLASHCARD_TEXT_MAX_LENGTH}</span
              >
            </div>
            <Input
              {...props}
              bind:value={$formData.front}
              placeholder="Teks sisi depan"
              disabled={$submitting}
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field {form} name="back">
        <Form.Control>
          {#snippet children({ props })}
            <div class="flex items-center justify-between gap-3">
              <Form.Label>Belakang</Form.Label>
              <span class="text-xs text-muted-foreground"
                >{backCount}/{FLASHCARD_TEXT_MAX_LENGTH}</span
              >
            </div>
            <Textarea
              {...props}
              bind:value={$formData.back}
              placeholder="Teks sisi belakang"
              rows={5}
              class="min-h-[10ch]"
              disabled={$submitting}
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field {form} name="hint">
        <Form.Control>
          {#snippet children({ props })}
            <div class="flex items-center justify-between gap-3">
              <Form.Label>Petunjuk</Form.Label>
              <span class="text-xs text-muted-foreground"
                >{hintCount}/{FLASHCARD_HINT_MAX_LENGTH}</span
              >
            </div>
            <Input
              {...props}
              bind:value={$formData.hint}
              placeholder="Petunjuk opsional"
              disabled={$submitting}
            />
          {/snippet}
        </Form.Control>
        <Form.Description>Opsional, bisa dikosongkan.</Form.Description>
        <Form.FieldErrors />
      </Form.Field>
    </form>
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props: closeProps })}
          <Button {...closeProps} variant="outline" disabled={$submitting}>
            Batal
          </Button>
        {/snippet}
      </Dialog.Close>
      <Button onclick={() => form.submit()} disabled={$submitting}>
        {$submitting ? "Menyimpan..." : "Simpan"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
